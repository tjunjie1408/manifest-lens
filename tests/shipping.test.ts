import { describe, it, expect } from 'vitest';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { applyReview, getReview } from '$lib/server/services/shipping';

async function setup() {
	await db.insert(user).values([
		{ id: 'reviewer-a', name: 'A', email: 'a@review.test' },
		{ id: 'reviewer-b', name: 'B', email: 'b@review.test' }
	]);
	const current = await getReview('reviewer-a', 'email_001');
	return {
		current,
		command: {
			runHash: current.runHash,
			version: 0,
			action: 'recompute',
			reason: 'Check original documents and classification',
			input: current.input
		}
	};
}
describe('human shipping review', () => {
	it('persists corrected evidence; confirm is tied to version and new edits invalidate it', async () => {
		const { current, command } = await setup();
		await applyReview('reviewer-a', 'email_001', command);
		const recalculated = await getReview('reviewer-a', 'email_001');
		expect(recalculated.result?.status).not.toBe('NEEDS_REVIEW');
		await applyReview('reviewer-a', 'email_001', { ...command, version: 1, action: 'confirm' });
		const confirmed = await getReview('reviewer-a', 'email_001');
		expect(confirmed.decision).toMatch(/^CONFIRMED_/);
		await applyReview('reviewer-a', 'email_001', {
			...command,
			version: 2,
			input: {
				...current.input,
				edits: { 'bl.gross_weight_kg': { value: 'TBA', source: 'page 1 field unreadable' } }
			}
		});
		const edited = await getReview('reviewer-a', 'email_001');
		expect(edited.decision).toBe('PENDING');
		expect(edited.result?.status).toBe('NEEDS_REVIEW');
		expect(edited.history).toHaveLength(3);
		expect(edited.history[1].decision).toMatch(/^CONFIRMED_/);
		await expect(
			applyReview('reviewer-a', 'email_001', { ...command, version: 3, action: 'confirm' })
		).rejects.toMatchObject({ status: 400 });
		expect((await getReview('reviewer-b', 'email_001')).history).toEqual([]);
	});
	it('rejects stale/concurrent actions without losing history', async () => {
		const { command } = await setup();
		const outcomes = await Promise.allSettled([
			applyReview('reviewer-a', 'email_001', { ...command, action: 'request_info' }),
			applyReview('reviewer-a', 'email_001', { ...command, action: 'request_info' })
		]);
		expect(outcomes.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
		expect((await getReview('reviewer-a', 'email_001')).history).toHaveLength(1);
		await expect(applyReview('reviewer-a', 'email_001', command)).rejects.toMatchObject({
			status: 409
		});
	});
	it('does not approve an untouched machine prediction or an unrelated source revision', async () => {
		const { command } = await setup();
		await expect(
			applyReview('reviewer-a', 'email_001', { ...command, action: 'confirm' })
		).rejects.toMatchObject({ status: 400 });
		await expect(
			applyReview('reviewer-a', 'email_001', { ...command, runHash: '0'.repeat(64) })
		).rejects.toMatchObject({ status: 409 });
	});
});

it('requires recomputation before signing a requested-info record; explicit noncomparison has its own decision', async () => {
	await db.insert(user).values({ id: 'reviewer-a', name: 'A', email: 'a@review.test' });
	const current = await getReview('reviewer-a', 'email_001');
	const command = {
		runHash: current.runHash,
		version: 0,
		action: 'request_info',
		reason: 'Await confirmation from original documents'
	};
	await applyReview('reviewer-a', 'email_001', command);
	await expect(
		applyReview('reviewer-a', 'email_001', { ...command, version: 1, action: 'confirm' })
	).rejects.toMatchObject({ status: 400 });
	await applyReview('reviewer-a', 'email_001', {
		...command,
		version: 1,
		action: 'recompute',
		input: { ...current.input, category: 'GENERAL' }
	});
	const checked = await getReview('reviewer-a', 'email_001');
	expect(checked.result?.status).toBe('NOT_APPLICABLE');
	expect(checked.history.at(-1)?.engineHash).toMatch(/^[a-f0-9]{64}$/);
	await applyReview('reviewer-a', 'email_001', { ...command, version: 2, action: 'confirm' });
	expect((await getReview('reviewer-a', 'email_001')).decision).toBe('CONFIRMED_NOT_APPLICABLE');
});

it('projects latest saved corrections for the owner without changing original evidence', async () => {
	const { current, command } = await setup();
	const { listReviews } = await import('$lib/server/services/shipping');
	const original = (await listReviews('reviewer-a')).find((row) => row.id === 'email_001')!;
	expect(original.fields.gross_weight_kg).toBe('match');
	await applyReview('reviewer-a', 'email_001', {
		...command,
		input: {
			...current.input,
			edits: {
				'bl.gross_weight_kg': { value: 'TBA', source: 'original weight awaiting clarification' }
			}
		}
	});
	const mine = (await listReviews('reviewer-a')).find((row) => row.id === 'email_001')!;
	const other = (await listReviews('reviewer-b')).find((row) => row.id === 'email_001')!;
	expect(mine.fields.gross_weight_kg).toBe('unknown');
	expect(mine.bucket).toBe('missing');
	expect(other.fields.gross_weight_kg).toBe('match');
	expect(other.bucket).toBe('ready');
	await applyReview('reviewer-a', 'email_001', { ...command, version: 1, action: 'request_info' });
	expect((await listReviews('reviewer-a')).find((row) => row.id === 'email_001')?.bucket).toBe(
		'requested'
	);
});
