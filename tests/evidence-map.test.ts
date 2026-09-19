import { describe, expect, it } from 'vitest';
import { fields, type Audit, type Event } from '$lib/schemas/shipping';
import {
	evidenceFieldState,
	projectEvidenceCase,
	summarizeCases,
	filterCases
} from '$lib/shipping/evidence-map';
import { reviewReasonGuidance } from '$lib/shipping/presentation';
const audit: Audit = {
	subject: 'Example',
	category: 'BL_COMPARISON',
	status: 'NEEDS_REVIEW',
	review_reason: 'missing',
	classification: { method: 'rules', review_recommended: true },
	documents: [],
	errors: []
};
describe('evidence map projection', () => {
	it('requires source evidence on both sides before reporting a comparison outcome', () => {
		const evidence = {
			raw: ['Example'],
			canonical: 'example',
			issue: null,
			evidence: [{ text: 'Example', location: 'line 1' }]
		};
		expect(
			evidenceFieldState({ si: evidence, bl: evidence, outcome: 'match' }, 'BL_COMPARISON')
		).toBe('match');
		expect(
			evidenceFieldState(
				{ si: { ...evidence, evidence: [] }, bl: evidence, outcome: 'match' },
				'BL_COMPARISON'
			)
		).toBe('unknown');
	});

	it('never turns unavailable comparison data into matching or not-applicable fields', () => {
		const row = projectEvidenceCase('email_1', audit);
		expect(Object.values(row.fields)).toEqual(fields.map(() => 'unknown'));
		expect(row.bucket).toBe('missing');
	});
	it('uses the latest human classification and keeps original uncertainty separate', () => {
		const last: Event = {
			version: 1,
			at: '2026-09-19T00:00:00Z',
			actor: 'reviewer',
			engineHash: null,
			reason: 'not relevant',
			decision: 'PENDING',
			input: { category: 'GENERAL', siPath: '', blPath: '', edits: {} },
			result: {
				status: 'NOT_APPLICABLE',
				review_reason: null,
				defect_fields: [],
				has_defect: false
			}
		};
		const row = projectEvidenceCase('email_1', audit, last);
		expect(row.category).toBe('GENERAL');
		expect(Object.values(row.fields)).toEqual(fields.map(() => 'not_applicable'));
		expect(row.uncertain).toBe(false);
		expect(row.originalUncertain).toBe(true);
		expect(row.reason).toBeNull();
	});
	it('assigns one bucket per email, and filters reconcile with summary counts', () => {
		const rows = [
			projectEvidenceCase('email_1', audit),
			projectEvidenceCase('email_2', { ...audit, category: 'GENERAL' })
		];
		const summary = summarizeCases(rows);
		expect(Object.values(summary).reduce((a, b) => a + b, 0)).toBe(2);
		expect(filterCases(rows, { query: 'email_1', category: 'all', bucket: 'all' })).toHaveLength(1);
		expect(filterCases(rows, { query: '', category: 'all', bucket: 'missing' })).toHaveLength(
			summary.missing
		);
	});
});

describe('review reason guidance', () => {
	it('explains why a missing document pair produces all unknown fields', () => {
		const guidance = reviewReasonGuidance('missing_attachment', 1, 0);
		expect(guidance?.title).toContain('valid SI and BL pair');
		expect(guidance?.explanation).toContain('1 readable source document');
		expect(guidance?.action).toContain('request more information');
	});

	it('distinguishes unreadable inputs from missing values', () => {
		expect(reviewReasonGuidance('unreadable', 1, 2)?.title).toContain('could not be read');
		expect(reviewReasonGuidance('missing_value', 2, 0)?.explanation).toContain('TBA');
	});
});

it('keeps supported conflicts visible alongside missing evidence and never fabricates coverage', () => {
	const evidence = {
		raw: ['10'],
		canonical: '10',
		issue: null,
		evidence: [{ text: '10', location: 'line 1' }]
	};
	const fieldsWithConflict = {
		gross_weight_kg: {
			si: evidence,
			bl: { ...evidence, raw: ['20'], canonical: '20' },
			outcome: 'mismatch'
		}
	};
	const row = projectEvidenceCase('email_1', {
		...audit,
		status: 'MISMATCH',
		fields: fieldsWithConflict,
		defect_fields: ['gross_weight_kg'],
		has_defect: true
	});
	expect(row.fields.gross_weight_kg).toBe('mismatch');
	expect(row.fields.shipper).toBe('unknown');
	expect(row.bucket).toBe('missing');
	const withoutLocations = projectEvidenceCase('email_2', {
		...audit,
		status: 'OK',
		fields: { shipper: { si: { ...evidence, evidence: [] }, bl: evidence, outcome: 'match' } },
		defect_fields: [],
		has_defect: false
	});
	expect(withoutLocations.fields.shipper).toBe('unknown');
});
