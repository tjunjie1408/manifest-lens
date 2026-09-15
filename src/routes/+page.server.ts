import { fail } from '@sveltejs/kit';
import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { createTaskInput } from '$lib/schemas/task';
import { listTasks, createTask, deleteTask } from '$lib/server/services/tasks';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {
		form: await superValidate(zod4(createTaskInput)),
		tasks: await listTasks()
	};
};

export const actions: Actions = {
	create: async ({ request }) => {
		const form = await superValidate(request, zod4(createTaskInput));
		if (!form.valid) return fail(400, { form });
		await createTask(form.data);
		return message(form, 'Task created.');
	},
	delete: async ({ request }) => {
		const data = await request.formData();
		const id = String(data.get('id') ?? '');
		if (id) await deleteTask(id);
		return { success: true };
	}
};
