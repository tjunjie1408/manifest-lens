import {
	fields,
	resultSchema,
	type Audit,
	type Comparison,
	type Event
} from '$lib/schemas/shipping';
import type { EvidenceCase, FieldName, FieldState, WorkBucket } from './types';

type FieldComparison = NonNullable<Comparison['fields']>[string];

/** A comparison is only supported when both source documents provide evidence. */
export function evidenceFieldState(
	comparison: FieldComparison | undefined,
	category: Audit['category']
): FieldState {
	if (category !== 'BL_COMPARISON') return 'not_applicable';
	if (!comparison?.si.evidence.length || !comparison.bl.evidence.length) return 'unknown';
	return comparison.outcome;
}

/** A case has exactly one work bucket; cell outcomes remain independent of sign-off. */
function workBucket(row: Omit<EvidenceCase, 'bucket'>): WorkBucket {
	if (row.decision.startsWith('CONFIRMED')) return 'confirmed';
	if (row.decision === 'REQUESTED_INFO') return 'requested';
	if (row.uncertain) return 'missing';
	if (row.category !== 'BL_COMPARISON') return 'other';
	if (
		row.unreadable ||
		row.status === 'NEEDS_REVIEW' ||
		Object.values(row.fields).includes('unknown')
	)
		return 'missing';
	if (Object.values(row.fields).includes('mismatch')) return 'differences';
	return 'ready';
}

/** Project only summary evidence. Raw documents and reviewer notes stay in the case view. */
export function projectEvidenceCase(id: string, audit: Audit, latest?: Event): EvidenceCase {
	const parsed = resultSchema.safeParse(audit);
	const result = latest?.result ?? (parsed.success ? parsed.data : null);
	const category = latest?.input.category ?? audit.category;
	const fieldStates = {} as Record<FieldName, FieldState>;
	for (const field of fields) {
		fieldStates[field] = evidenceFieldState(result?.fields?.[field], category);
	}
	const originalUncertain = Boolean(audit.classification.review_recommended);
	const row: Omit<EvidenceCase, 'bucket'> = {
		id,
		subject: audit.subject,
		category,
		status: result?.status ?? audit.status,
		decision: latest?.decision ?? 'PENDING',
		reason: result ? result.review_reason : audit.review_reason,
		uncertain: originalUncertain && !latest?.result,
		originalUncertain,
		fields: fieldStates,
		unreadable: audit.errors.length
	};
	return { ...row, bucket: workBucket(row) };
}

export interface EvidenceFilters {
	query: string;
	category: string;
	bucket: WorkBucket | 'all';
}
export function filterCases(rows: EvidenceCase[], filters: EvidenceFilters): EvidenceCase[] {
	const query = filters.query.trim().toLowerCase();
	return rows.filter(
		(row) =>
			(filters.category === 'all' || row.category === filters.category) &&
			(filters.bucket === 'all' || row.bucket === filters.bucket) &&
			`${row.id} ${row.subject}`.toLowerCase().includes(query)
	);
}
export function summarizeCases(rows: EvidenceCase[]): Record<WorkBucket, number> {
	const counts: Record<WorkBucket, number> = {
		missing: 0,
		differences: 0,
		ready: 0,
		requested: 0,
		confirmed: 0,
		other: 0
	};
	for (const row of rows) counts[row.bucket]++;
	return counts;
}
