import type { z } from 'zod';
import type {
	Audit,
	Comparison,
	Decision,
	Event,
	ReviewInput,
	emailSchema,
	fields
} from '$lib/schemas/shipping';
export type FieldName = (typeof fields)[number];
export type FieldState = 'match' | 'mismatch' | 'unknown' | 'not_applicable';
export type WorkBucket = 'missing' | 'differences' | 'ready' | 'requested' | 'confirmed' | 'other';
export interface ReviewDetail {
	emailId: string;
	email: z.infer<typeof emailSchema>;
	runHash: string;
	audit: Audit;
	history: Event[];
	version: number;
	input: ReviewInput;
	result: Comparison | null;
	decision: Decision;
}
export interface EvidenceCase {
	id: string;
	subject: string;
	category: Audit['category'];
	status: string;
	decision: Decision;
	reason: string | null;
	uncertain: boolean;
	originalUncertain: boolean;
	fields: Record<FieldName, FieldState>;
	unreadable: number;
	bucket: WorkBucket;
}
