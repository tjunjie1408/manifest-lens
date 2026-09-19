import { describe, expect, it } from 'vitest';
import { Pool } from 'pg';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { account, session, user } from '$lib/server/db/schema';
import { testAuth } from './helpers/auth';

/**
 * Better Auth against real PostgreSQL via the Drizzle `pg` adapter
 * (PG-A01..PG-A06). Exercises registration, login, session persistence,
 * uniqueness, and cascade deletes — the schema paths the SQLite→PostgreSQL
 * migration had to preserve.
 */
describe('better-auth on postgres (PG-A01..PG-A06)', () => {
	it('PG-A01: signs up a user; password is hashed, not stored in plaintext', async () => {
		await testAuth.api.signUpEmail({
			body: { email: 'a01@example.com', password: 'correct horse battery', name: 'A01' }
		});

		const [u] = await db.select().from(user).where(eq(user.email, 'a01@example.com'));
		expect(u).toBeTruthy();

		const accounts = await db.select().from(account).where(eq(account.userId, u.id));
		expect(accounts.length).toBe(1);
		expect(accounts[0].password).toBeTruthy();
		expect(accounts[0].password).not.toBe('correct horse battery');
	});

	it('PG-A02: signs in with correct credentials and creates a session for that user', async () => {
		await testAuth.api.signUpEmail({
			body: { email: 'a02@example.com', password: 'correct horse battery', name: 'A02' }
		});

		const res = await testAuth.api.signInEmail({
			body: { email: 'a02@example.com', password: 'correct horse battery' }
		});
		expect(res.token).toBeTruthy();

		const [u] = await db.select().from(user).where(eq(user.email, 'a02@example.com'));
		const sessions = await db.select().from(session).where(eq(session.userId, u.id));
		expect(sessions.length).toBeGreaterThanOrEqual(1);
	});

	it('PG-A03: rejects a wrong password and creates no new session', async () => {
		await testAuth.api.signUpEmail({
			body: { email: 'a03@example.com', password: 'correct horse battery', name: 'A03' }
		});
		const [u] = await db.select().from(user).where(eq(user.email, 'a03@example.com'));
		// signUpEmail auto-signs-in, so a session may already exist. The failed
		// login must not add another one.
		const before = (await db.select().from(session).where(eq(session.userId, u.id))).length;

		await expect(
			testAuth.api.signInEmail({ body: { email: 'a03@example.com', password: 'wrong password' } })
		).rejects.toMatchObject({ status: expect.anything() });

		const after = (await db.select().from(session).where(eq(session.userId, u.id))).length;
		expect(after).toBe(before);
	});

	it('PG-A04: rejects duplicate email; only one user row remains', async () => {
		await testAuth.api.signUpEmail({
			body: { email: 'a04@example.com', password: 'correct horse battery', name: 'A04' }
		});
		await expect(
			testAuth.api.signUpEmail({
				body: { email: 'a04@example.com', password: 'another password', name: 'A04 again' }
			})
		).rejects.toBeTruthy();

		const rows = await db.select().from(user).where(eq(user.email, 'a04@example.com'));
		expect(rows.length).toBe(1);
	});

	it('PG-A05: deleting a user cascades to sessions and accounts (no orphans)', async () => {
		await testAuth.api.signUpEmail({
			body: { email: 'a05@example.com', password: 'correct horse battery', name: 'A05' }
		});
		await testAuth.api.signInEmail({
			body: { email: 'a05@example.com', password: 'correct horse battery' }
		});

		const [u] = await db.select().from(user).where(eq(user.email, 'a05@example.com'));
		expect(
			(await db.select().from(session).where(eq(session.userId, u.id))).length
		).toBeGreaterThan(0);

		await db.delete(user).where(eq(user.id, u.id));

		expect((await db.select().from(session).where(eq(session.userId, u.id))).length).toBe(0);
		expect((await db.select().from(account).where(eq(account.userId, u.id))).length).toBe(0);
	});

	it('PG-A06: an existing session persists in PostgreSQL and is readable over a fresh connection (app restart analogue)', async () => {
		await testAuth.api.signUpEmail({
			body: { email: 'a06@example.com', password: 'correct horse battery', name: 'A06' }
		});
		const res = await testAuth.api.signInEmail({
			body: { email: 'a06@example.com', password: 'correct horse battery' }
		});
		expect(res.token).toBeTruthy();

		const [u] = await db.select().from(user).where(eq(user.email, 'a06@example.com'));

		// Simulate an app restart: read the session back through a brand-new pool
		// (no shared app-memory state). Sessions live in PostgreSQL, so they
		// survive the application container being rebuilt or restarted.
		const fresh = new Pool({ connectionString: process.env.DATABASE_URL });
		try {
			const { rows } = await fresh.query<{ user_id: string; expires_at: Date }>(
				'SELECT user_id, expires_at FROM "session" WHERE token = $1',
				[res.token]
			);
			expect(rows.length).toBe(1);
			expect(rows[0].user_id).toBe(u.id);
			expect(new Date(rows[0].expires_at).getTime()).toBeGreaterThan(Date.now());
		} finally {
			await fresh.end();
		}
	});
});
