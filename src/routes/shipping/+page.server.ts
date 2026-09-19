import { redirect } from '@sveltejs/kit';
import { listReviews } from '$lib/server/services/shipping';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = async ({ locals, setHeaders }) => {
	if (!locals.user) redirect(303, '/demo/better-auth/login');
	setHeaders({ 'cache-control': 'private, no-store' });
	return { cases: await listReviews(locals.user.id) };
};
