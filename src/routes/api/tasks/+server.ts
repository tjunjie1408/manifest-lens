import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createTaskInput } from '$lib/schemas/task';
import { createTask, listTasks } from '$lib/server/services/tasks';

/**
 * Example REST resource. The pattern to copy per resource:
 *   validate input with a shared zod schema -> call a service -> return json.
 * Auth is enforced with `locals.user`, populated in hooks.server.ts.
 */

export const GET: RequestHandler = async () => {
	return json(await listTasks());
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401, 'Sign in to create a task.');

	const body = await request.json().catch(() => null);
	const parsed = createTaskInput.safeParse(body);
	if (!parsed.success) {
		throw error(400, parsed.error.issues.map((i) => i.message).join(', '));
	}

	return json(await createTask(parsed.data), { status: 201 });
};
