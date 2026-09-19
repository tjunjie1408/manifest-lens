import { redirect } from '@sveltejs/kit';
import { listReviews } from '$lib/server/services/shipping';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(303, '/demo/better-auth/login');
	return { cases: await listReviews(locals.user.id) };
};
