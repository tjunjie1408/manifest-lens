import { afterAll, beforeEach } from 'vitest';
import { sql } from 'drizzle-orm';
import { db, pool } from '$lib/server/db';

// Clean slate before every test so cases never depend on a developer's existing
// data or on execution order. CASCADE handles the FK order for us.
beforeEach(async () => {
	await db.execute(
		sql`TRUNCATE TABLE "task", "session", "account", "verification", "user" RESTART IDENTITY CASCADE`
	);
});

afterAll(async () => {
	await pool.end();
});
