import { createHash } from 'node:crypto';

function sha256(bytes: Uint8Array | string): string {
	return createHash('sha256').update(bytes).digest('hex');
}

export function attachmentMatchesHash(bytes: Uint8Array, expected: string, name: string): boolean {
	if (sha256(bytes) === expected) return true;
	if (!name.toLowerCase().endsWith('.txt')) return false;

	// Git may materialize tracked text as CRLF on Windows even when the audit was
	// generated from LF bytes. Treat that checkout conversion as the same text.
	const normalized = Buffer.from(bytes).toString('utf8').replace(/\r\n/g, '\n');
	return sha256(normalized) === expected;
}
