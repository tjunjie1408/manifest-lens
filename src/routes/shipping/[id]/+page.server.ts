import { fail, redirect, error } from '@sveltejs/kit';
import { fields } from '$lib/schemas/shipping';
import { getReview, applyReview, ReviewError } from '$lib/server/services/shipping';
import type { Actions, PageServerLoad } from './$types';
export const load: PageServerLoad = async ({ locals, params, setHeaders }) => {
	if (!locals.user) redirect(303, '/demo/better-auth/login');
	setHeaders({ 'cache-control': 'private, no-store' });
	try {
		return await getReview(locals.user.id, params.id);
	} catch (e) {
		if (e instanceof ReviewError) error(e.status, e.message);
		throw e;
	}
};
export const actions: Actions = {
	default: async ({ locals, params, request }) => {
		if (!locals.user) error(401, 'Please sign in first.');
		const form = await request.formData();
		const action = String(form.get('operation') ?? '');
		const edits: Record<string, { value: string; source: string }> = {};
		for (const side of ['si', 'bl'])
			for (const field of fields) {
				const key = `${side}.${field}`;
				if (form.get(`edit.${key}`) === 'on')
					edits[key] = {
						value: String(form.get(`value.${key}`) ?? ''),
						source: String(form.get(`source.${key}`) ?? '')
					};
			}
		try {
			await applyReview(locals.user.id, params.id, {
				action,
				version: form.get('version'),
				runHash: form.get('runHash'),
				reason: form.get('reason'),
				...(action === 'recompute'
					? {
							input: {
								category: form.get('category'),
								siPath: form.get('siPath'),
								blPath: form.get('blPath'),
								edits
							}
						}
					: {})
			});
			return {
				message:
					action === 'recompute'
						? 'Saved and rechecked. Human confirmation is required.'
						: action === 'confirm'
							? 'The current revision has been confirmed.'
							: 'Information request recorded. No email was sent.'
			};
		} catch (e) {
			if (e instanceof ReviewError) return fail(e.status, { message: e.message });
			console.error('[shipping] review operation failed');
			return fail(503, {
				message: 'Could not confirm that this action was saved. Refresh and check before retrying.'
			});
		}
	}
};
