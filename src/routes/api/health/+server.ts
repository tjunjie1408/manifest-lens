import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { assertSchemaReady, withTimeout } from '$lib/server/db/readiness';

/**
 * Readiness probe. Returns 200 only when the database is reachable AND at the
 * schema version this build expects, so orchestrators (Compose healthcheck,
 * managed platform, load balancer) can gate traffic on real dependency health.
 * Bounded by a deadline so an unreachable host returns 503 promptly instead of
 * hanging. Never leaks the connection string or error internals.
 */
const READINESS_TIMEOUT_MS = 5000;

export const GET: RequestHandler = async () => {
	try {
		await withTimeout(assertSchemaReady(), READINESS_TIMEOUT_MS);
		return json({ status: 'ready' });
	} catch {
		return json({ status: 'unavailable' }, { status: 503 });
	}
};
