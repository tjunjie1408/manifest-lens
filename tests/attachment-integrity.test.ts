import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { attachmentMatchesHash } from '$lib/server/attachment-integrity';

const hash = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');

describe('attachment integrity', () => {
	it('accepts Git line-ending conversion for tracked text evidence', () => {
		const expected = hash('line one\nline two\n');
		expect(
			attachmentMatchesHash(Buffer.from('line one\r\nline two\r\n'), expected, 'evidence.txt')
		).toBe(true);
	});

	it('still rejects changed text and all changed binary evidence', () => {
		const expected = hash('original\n');
		expect(attachmentMatchesHash(Buffer.from('changed\r\n'), expected, 'evidence.txt')).toBe(false);
		expect(attachmentMatchesHash(Buffer.from('original\r\n'), expected, 'evidence.pdf')).toBe(
			false
		);
	});
});
