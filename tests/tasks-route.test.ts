import { describe, expect, it } from 'vitest';
import { GET } from '../src/routes/api/tasks/+server';

describe('task API authorization', () => {
	it('rejects unauthenticated task listing requests', async () => {
		await expect(GET({ locals: { user: null } } as never)).rejects.toMatchObject({ status: 401 });
	});
});
