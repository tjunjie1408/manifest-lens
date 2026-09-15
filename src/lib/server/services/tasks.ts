import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { task } from '$lib/server/db/schema';
import type { CreateTaskInput, TaskDto } from '$lib/schemas/task';

/**
 * Service layer (the seam). Routes call these functions — never the db, an
 * external API, or an AI SDK directly. Keeping I/O behind this boundary is
 * what lets you swap the backing store (SQLite -> Postgres, or add an AI /
 * Python sidecar) without touching a single route or component.
 */

export async function listTasks(): Promise<TaskDto[]> {
	return db.select().from(task).orderBy(task.priority);
}

export async function createTask(input: CreateTaskInput): Promise<TaskDto> {
	const [row] = await db.insert(task).values(input).returning();
	return row;
}

export async function deleteTask(id: string): Promise<void> {
	await db.delete(task).where(eq(task.id, id));
}
