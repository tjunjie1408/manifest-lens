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
