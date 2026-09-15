import { z } from 'zod';

/**
 * Shared validation schema — the single source of truth for a Task's shape.
 * Imported by BOTH server (API routes, services) and client (forms), so the
 * frontend and backend can never drift apart. Copy this file per resource.
 */

export const createTaskInput = z.object({
	title: z.string().trim().min(1, 'Title is required').max(200),
	priority: z.number().int().min(1).max(5).default(1)
});
export type CreateTaskInput = z.infer<typeof createTaskInput>;

export const taskDto = z.object({
	id: z.string(),
	title: z.string(),
	priority: z.number().int()
});
export type TaskDto = z.infer<typeof taskDto>;
