import { error } from '@sveltejs/kit';
import { originalAttachment, ReviewError } from '$lib/server/services/shipping';
import type { RequestHandler } from './$types';
export const GET: RequestHandler = async ({ locals, params, url }) => {
	if (!locals.user) error(401, 'Please sign in first.');
	try {
		const { bytes, name } = await originalAttachment(
			locals.user.id,
			params.id,
			url.searchParams.get('path') ?? ''
		);
		return new Response(new Uint8Array(bytes), {
			headers: {
				'Content-Type': 'application/octet-stream',
				'Content-Disposition': `attachment; filename="${name}"`,
				'Cache-Control': 'private, no-store',
				'X-Content-Type-Options': 'nosniff'
			}
		});
	} catch (e) {
		if (e instanceof ReviewError) error(e.status, e.message);
		throw e;
	}
};
