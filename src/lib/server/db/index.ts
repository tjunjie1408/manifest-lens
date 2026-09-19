import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

// A long-lived connection pool suits a persistent Node container. For a
// serverless/HTTP-only platform, swap this for that platform's driver — the
// service layer and `db` API stay the same.
//
// `connectionTimeoutMillis` bounds how long acquiring a connection may take
// (pg's default is 0 = wait forever), so a black-holed host fails fast instead
// of hanging. Deliberately no global `statement_timeout` here: that would impose
// a hidden 5s SLA on every business/auth query. The readiness probe uses its own
// pool with tight timeouts (see readiness.ts).
export const pool = new Pool({
	connectionString: env.DATABASE_URL,
	connectionTimeoutMillis: 5000
});

// A pooled connection can drop between requests — PostgreSQL restart, a network
// blip, or a managed-DB failover. pg emits 'error' on the pool for that idle
// client; with no listener Node treats it as an unhandled 'error' and can
// terminate the whole process. Log it (message only, never the connection
// string) and let the pool discard the dead client and reconnect on next use.
pool.on('error', (err) => {
	console.error('[db] idle PostgreSQL client error:', err.message);
});

export const db = drizzle(pool, { schema });
