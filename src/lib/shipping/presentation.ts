import { fields, type Audit } from '$lib/schemas/shipping';
import type { WorkBucket } from './types';
export const categoryNames: Record<Audit['category'], string> = {
	BL_COMPARISON: 'Document comparison',
	SI_REQUEST: 'SI request',
	INVOICE_QUERY: 'Invoice query',
	GENERAL: 'General',
	SPAM: 'Spam'
};
export const fieldGroups = [
	{ name: 'Parties', fields: fields.slice(0, 3) },
	{ name: 'Route', fields: fields.slice(3, 5) },
	{ name: 'Cargo', fields: fields.slice(5) }
];
export const bucketNames: Record<WorkBucket, string> = {
	missing: 'Missing evidence',
	differences: 'Unresolved differences',
	ready: 'Awaiting confirmation',
	requested: 'Information requested',
	confirmed: 'Confirmed',
	other: 'Other emails'
};
export const fieldStateNames = {
	match: 'Match',
	mismatch: 'Difference',
	unknown: 'Unknown',
	not_applicable: 'Not applicable'
};

export function reviewReasonGuidance(
	reason: string | null | undefined,
	documentCount: number,
	unreadableCount: number
): { title: string; explanation: string; action: string } | null {
	if (reason === 'missing_attachment') {
		return {
			title: 'A valid SI and BL pair is not available',
			explanation: `${documentCount} readable source document${documentCount === 1 ? '' : 's'} found. All fields remain Unknown because the comparison cannot start without both documents.`,
			action:
				'Choose the correct documents if they are available; otherwise request more information.'
		};
	}
	if (reason === 'wrong_doc_type') {
		return {
			title: 'The supplied documents are not a valid SI and draft BL pair',
			explanation:
				'All fields remain Unknown because comparing the wrong document types could create false differences.',
			action: 'Check Document pairing, select the correct SI and BL, then recheck.'
		};
	}
	if (reason === 'unreadable') {
		return {
			title: 'One or more attachments could not be read',
			explanation: `${unreadableCount} attachment${unreadableCount === 1 ? '' : 's'} could not provide reliable text. Unknown protects the review from an unsupported guess.`,
			action:
				'Open the original files and request a readable copy or enter a correction with a source reference.'
		};
	}
	if (reason === 'missing_value') {
		return {
			title: 'Some required fields do not have usable evidence',
			explanation:
				'A field is Unknown when either side is blank, uses a placeholder such as TBA or N/A, or was not recognized in the extracted text.',
			action:
				'Inspect the source rows. Correct values supported by the document, or request more information.'
		};
	}
	return null;
}
