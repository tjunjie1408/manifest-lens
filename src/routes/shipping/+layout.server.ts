import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, setHeaders }) => {
	if (!locals.user) redirect(303, '/demo/better-auth/login');
	setHeaders({ 'cache-control': 'private, no-store' });
};
