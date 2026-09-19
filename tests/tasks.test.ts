import { describe, expect, it } from 'vitest';
import { createTaskInput } from '$lib/schemas/task';
import { createTask, deleteTask, listTasks } from '$lib/server/services/tasks';

/**
 * Task service against real PostgreSQL (PG-D01..PG-D05). Validation cases go
 * through the shared Zod boundary the routes use, so the DB never sees rejected
 * input.
 */
describe('task service (PG-D01..PG-D05)', () => {
	it('PG-D01: inserts a valid task and returns a persisted id', async () => {
		const created = await createTask({ title: 'Write tests', priority: 2 });
		expect(created.id).toBeTruthy();
		expect(created.title).toBe('Write tests');
		expect(created.priority).toBe(2);

		const all = await listTasks();
		expect(all.map((t) => t.id)).toContain(created.id);
	});

	it('PG-D02: listTasks returns rows ordered by priority', async () => {
		await createTask({ title: 'low', priority: 5 });
		await createTask({ title: 'high', priority: 1 });
		await createTask({ title: 'mid', priority: 3 });

		const all = await listTasks();
		const priorities = all.map((t) => t.priority);
		expect(priorities).toEqual([...priorities].sort((a, b) => a - b));
		expect(all[0].title).toBe('high');
	});

	it('PG-D03: deletes an existing task', async () => {
		const created = await createTask({ title: 'delete me', priority: 1 });
		await deleteTask(created.id);
		const all = await listTasks();
		expect(all.map((t) => t.id)).not.toContain(created.id);
	});

	it('PG-D04: rejects invalid input at the Zod boundary (no DB write)', async () => {
		const before = (await listTasks()).length;

		expect(createTaskInput.safeParse({ title: '', priority: 1 }).success).toBe(false);
		expect(createTaskInput.safeParse({ title: 'x'.repeat(201), priority: 1 }).success).toBe(false);
		expect(createTaskInput.safeParse({ title: 'ok', priority: 0 }).success).toBe(false);
		expect(createTaskInput.safeParse({ title: 'ok', priority: 6 }).success).toBe(false);
		expect(createTaskInput.safeParse({ title: 'ok', priority: 2.5 }).success).toBe(false);

		expect((await listTasks()).length).toBe(before);
	});

	it('PG-D05: deleting a non-existent id is a no-op and keeps the connection healthy', async () => {
		await expect(deleteTask('00000000-0000-0000-0000-000000000000')).resolves.toBeUndefined();
		// connection/transaction still usable
		const created = await createTask({ title: 'still works', priority: 1 });
		expect(created.id).toBeTruthy();
	});
});
