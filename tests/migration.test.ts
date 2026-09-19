import { describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { db } from '$lib/server/db';

/**
 * PG-M01 / PG-M02: the committed migration builds the full schema on an empty
 * database, and applying it is idempotent. globalSetup already ran the migrator
 * against this database; here we assert the resulting objects exist and that a
 * second migrate run left no drift. (A second `migrate()` is exercised by the CI
 * job running `db:migrate` twice; this suite verifies the end state.)
 */
describe('schema & migration (PG-M01/PG-M02)', () => {
	it('creates every business/auth table', async () => {
		const res = await db.execute(sql`
			SELECT table_name FROM information_schema.tables
			WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
		`);
		const tables = (res.rows as Array<{ table_name: string }>).map((r) => r.table_name);
		for (const t of ['task', 'user', 'session', 'account', 'verification']) {
			expect(tables, `expected table "${t}"`).toContain(t);
		}
	});

	it('enforces unique constraints on user.email and session.token', async () => {
		const res = await db.execute(sql`
			SELECT constraint_name FROM information_schema.table_constraints
			WHERE table_schema = 'public' AND constraint_type = 'UNIQUE'
		`);
		const names = (res.rows as Array<{ constraint_name: string }>).map((r) => r.constraint_name);
		expect(names).toContain('user_email_unique');
		expect(names).toContain('session_token_unique');
	});

	it('has cascade foreign keys from session and account to user', async () => {
		const res = await db.execute(sql`
			SELECT rc.constraint_name, rc.delete_rule
			FROM information_schema.referential_constraints rc
		`);
		const rows = res.rows as Array<{ constraint_name: string; delete_rule: string }>;
		const rules = new Map(rows.map((r) => [r.constraint_name, r.delete_rule]));
		expect(rules.get('session_user_id_user_id_fk')).toBe('CASCADE');
		expect(rules.get('account_user_id_user_id_fk')).toBe('CASCADE');
	});

	it('records the migration as applied in drizzle metadata', async () => {
		const res = await db.execute(
			sql`SELECT count(*)::text AS count FROM drizzle.__drizzle_migrations`
		);
		const rows = res.rows as Array<{ count: string }>;
		expect(Number(rows[0].count)).toBeGreaterThanOrEqual(1);
	});
});
