import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '$lib/server/db';

/**
 * Better Auth instance for tests. Identical to `src/lib/server/auth.ts` except
 * it omits the `sveltekitCookies` plugin, which requires an active SvelteKit
 * request context. The database seam under test — the Drizzle adapter on the
 * PostgreSQL `pg` provider — is exactly the same, so this exercises the real
 * auth schema and constraints against real PostgreSQL.
 */
export const testAuth = betterAuth({
	baseURL: process.env.ORIGIN ?? 'http://localhost:3000',
	secret: process.env.BETTER_AUTH_SECRET ?? 'test-only-secret-at-least-32-characters-long',
	database: drizzleAdapter(db, { provider: 'pg' }),
	emailAndPassword: { enabled: true }
});
