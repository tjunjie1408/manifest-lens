import { afterAll, describe, expect, it } from 'vitest';
import { Client, Pool } from 'pg';
import { pool } from '$lib/server/db';
import { assertSchemaReady, readinessPool, withTimeout } from '$lib/server/db/readiness';
import journal from '../drizzle/meta/_journal.json';

const headWhen = journal.entries[journal.entries.length - 1].when;

/** Create an empty scratch database, run `body` against a pool for it, then drop it. */
async function withScratchDb(name: string, body: (db: Pool) => Promise<void>): Promise<void> {
	const base = new URL(process.env.DATABASE_URL as string);
	const adminUrl = new URL(base);
	adminUrl.pathname = '/postgres';

	const admin = new Client({ connectionString: adminUrl.toString() });
	await admin.connect();
	await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
	await admin.query(`CREATE DATABASE "${name}"`);
	await admin.end();

	const url = new URL(base);
	url.pathname = `/${name}`;
	const db = new Pool({ connectionString: url.toString() });
	try {
		await body(db);
	} finally {
		await db.end();
		const admin2 = new Client({ connectionString: adminUrl.toString() });
		await admin2.connect();
		await admin2.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
		await admin2.end();
	}
}

/**
 * Readiness must reflect real dependency health: reachable AND at the expected
 * schema version. Covers the review findings — migration-head gating that is
 * newline/CRLF-independent, query cancellation on timeout, a bounded HTTP
 * deadline, and the pool error guard.
 */
describe('readiness', () => {
	afterAll(async () => {
		await readinessPool.end();
	});

	it('resolves against the migrated (head) database', async () => {
		await expect(assertSchemaReady()).resolves.toBeUndefined();
	});

	it('rejects a reachable but un-migrated database (no migrations table → 503)', async () => {
		const url = new URL(process.env.DATABASE_URL as string);
		url.pathname = '/postgres';
		const empty = new Pool({ connectionString: url.toString(), connectionTimeoutMillis: 5000 });
		try {
			await expect(assertSchemaReady(empty)).rejects.toThrow();
		} finally {
			await empty.end();
		}
	});

	it('rejects a database whose tables exist but head migration is not applied (503)', async () => {
		await withScratchDb('averis_behind_test', async (db) => {
			await db.query('CREATE SCHEMA drizzle');
			await db.query(
				'CREATE TABLE drizzle.__drizzle_migrations (id serial PRIMARY KEY, hash text NOT NULL, created_at bigint)'
			);
			for (const t of ['task', 'user', 'session', 'account', 'verification']) {
				await db.query(`CREATE TABLE "${t}" (id text PRIMARY KEY)`);
			}
			await expect(assertSchemaReady(db)).rejects.toThrow(/schema behind/);
		});
	});

	it('is ready by migration timestamp regardless of the stored hash bytes (CRLF/LF-independent)', async () => {
		await withScratchDb('averis_hashindep_test', async (db) => {
			await db.query('CREATE SCHEMA drizzle');
			await db.query(
				'CREATE TABLE drizzle.__drizzle_migrations (id serial PRIMARY KEY, hash text NOT NULL, created_at bigint)'
			);
			// A deliberately wrong hash — what a CRLF checkout would produce — but the
			// correct applied timestamp. Readiness must still report ready.
			await db.query(
				'INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)',
				['0000000000000000000000000000000000000000000000000000000000000000', headWhen]
			);
			await expect(assertSchemaReady(db)).resolves.toBeUndefined();
		});
	});

	it('cancels a query that exceeds statement_timeout and leaves the pool usable', async () => {
		// pg_sleep(20) far exceeds the readiness pool's 5s statement/query timeout.
		await expect(readinessPool.query('SELECT pg_sleep(20)')).rejects.toThrow();
		const r = await readinessPool.query<{ ok: number }>('SELECT 1 AS ok');
		expect(r.rows[0].ok).toBe(1);
	});

	it('withTimeout rejects a hanging check within the deadline', async () => {
		const never = new Promise<void>(() => {});
		const start = Date.now();
		await expect(withTimeout(never, 100)).rejects.toThrow(/timed out/);
		expect(Date.now() - start).toBeLessThan(2000);
	});

	it('both pools have an error listener so an idle client drop cannot crash the process', () => {
		expect(pool.listenerCount('error')).toBeGreaterThan(0);
		expect(readinessPool.listenerCount('error')).toBeGreaterThan(0);
	});
});
