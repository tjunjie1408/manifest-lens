import { Pool } from 'pg';
import { env } from '$env/dynamic/private';
import journal from '../../../../drizzle/meta/_journal.json';

/**
 * Tables the application needs to serve any real traffic. Used only as a
 * fallback when the repo has no migrations yet.
 */
export const REQUIRED_TABLES = ['task', 'user', 'session', 'account', 'verification'] as const;

// Dedicated pool for readiness with tight timeouts, so the 5s bound applies ONLY
// to health probes and never becomes a global SLA on business/auth queries
// (which use the main pool in db/index.ts). `max` is small so repeated probes
// can never exhaust connections, and statement/query timeouts cancel a stuck
// check server- and client-side instead of leaking it.
export const readinessPool = new Pool({
	connectionString: env.DATABASE_URL,
	max: 2,
	connectionTimeoutMillis: 5000,
	statement_timeout: 5000,
	query_timeout: 5000
});
readinessPool.on('error', (err) => {
	console.error('[db] idle readiness client error:', err.message);
});

/**
 * Timestamp of the latest migration this build expects (journal `when`), or null
 * if there are no migrations. This comes from the bundled `_journal.json`, so it
 * needs no `drizzle/` folder at runtime and is byte-for-byte stable — unlike a
 * content hash, it does not change with LF/CRLF line endings.
 */
function expectedHeadWhen(): number | null {
	const entries = journal.entries ?? [];
	if (entries.length === 0) return null;
	return entries[entries.length - 1].when;
}

/**
 * Resolves only when the database is reachable AND at the schema version this
 * build expects. Drizzle records each applied migration's journal `when` as
 * `created_at` and treats a migration as applied when `created_at >= when`; this
 * mirrors that exactly. It fails a database that is empty OR behind on migrations
 * (an older schema missing newly added columns/constraints), and — because it
 * compares timestamps, not a SQL hash — never falsely reports a correctly
 * migrated database as behind due to line-ending differences across platforms.
 */
export async function assertSchemaReady(pool: Pool = readinessPool): Promise<void> {
	const headWhen = expectedHeadWhen();
	if (headWhen != null) {
		// Throws if the migrations table itself is absent (brand-new database) —
		// correctly treated as not ready by the caller.
		const res = await pool.query<{ applied: boolean }>(
			`SELECT EXISTS (
			   SELECT 1 FROM drizzle.__drizzle_migrations WHERE created_at >= $1
			 ) AS applied`,
			[headWhen]
		);
		if (!res.rows[0]?.applied) {
			throw new Error('schema behind: expected head migration is not applied');
		}
		return;
	}

	// Fallback: no migrations defined in the repo — at least require the app
	// tables to exist. `to_regclass` returns NULL for a missing table.
	const selects = REQUIRED_TABLES.map((t, i) => `to_regclass('public."${t}"') AS t${i}`).join(', ');
	const res = await pool.query<Record<string, string | null>>(`SELECT ${selects}`);
	const row = res.rows[0] ?? {};
	const missing = REQUIRED_TABLES.filter((_, i) => row[`t${i}`] == null);
	if (missing.length > 0) {
		throw new Error(`schema incomplete: missing table(s) ${missing.join(', ')}`);
	}
}

/**
 * Races a promise against a deadline so the readiness HTTP handler can never
 * hang. This is the HTTP-layer last resort only — query cancellation is handled
 * by the readiness pool's statement_timeout/query_timeout. The timer is always
 * cleared, so it never keeps the event loop alive.
 */
export async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
	let timer: ReturnType<typeof setTimeout>;
	const timeout = new Promise<never>((_, reject) => {
		timer = setTimeout(() => reject(new Error(`operation timed out after ${ms}ms`)), ms);
	});
	try {
		return await Promise.race([promise, timeout]);
	} finally {
		clearTimeout(timer!);
	}
}
