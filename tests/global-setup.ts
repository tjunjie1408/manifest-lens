import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Client, Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

/**
 * globalSetup runs in Vitest's MAIN process, where `test.env` (from
 * vitest.config.ts) has not been applied — so we load `.env.test` here too,
 * letting any value already in the environment (e.g. CI) win.
 */
function resolveDatabaseUrl(): string | undefined {
	if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
	try {
		const raw = readFileSync(new URL('../.env.test', import.meta.url), 'utf8');
		for (const line of raw.split('\n')) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith('#')) continue;
			const eq = trimmed.indexOf('=');
			if (eq === -1) continue;
			if (trimmed.slice(0, eq).trim() === 'DATABASE_URL') return trimmed.slice(eq + 1).trim();
		}
	} catch {
		// no .env.test
	}
	return undefined;
}

/**
 * Runs ONCE before the whole suite: ensures an isolated `*_test` database exists
 * and brings it to the committed migration head using the repo's own migration
 * files (no hand-written SQL — PG-M04 / PG-C06). Refuses any database whose name
 * does not end in `_test`, so the dev database can never be wiped.
 */
export default async function setup() {
	const url = resolveDatabaseUrl();
	if (!url) throw new Error('DATABASE_URL is not set for integration tests');

	const parsed = new URL(url);
	const dbName = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
	if (!dbName.endsWith('_test')) {
		throw new Error(
			`Refusing to run integration tests against "${dbName}": the test database name must end in "_test".`
		);
	}

	// Create the test database if missing (connect to the maintenance db).
	const adminUrl = new URL(url);
	adminUrl.pathname = '/postgres';
	const admin = new Client({ connectionString: adminUrl.toString() });
	await admin.connect();
	try {
		const { rowCount } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [
			dbName
		]);
		if (rowCount === 0) {
			// dbName is validated (*_test) and quoted; identifiers can't be parameterised.
			await admin.query(`CREATE DATABASE "${dbName.replace(/"/g, '""')}"`);
		}
	} finally {
		await admin.end();
	}

	// Bring the test database to migration head.
	const pool = new Pool({ connectionString: url });
	const db = drizzle(pool);
	await migrate(db, {
		migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url))
	});
	await pool.end();
}
