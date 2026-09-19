import { z } from 'zod';
export const fields = [
	'shipper',
	'consignee',
	'notify_party',
	'port_of_loading',
	'port_of_discharge',
	'container_count',
	'gross_weight_kg'
] as const;
export const categories = [
	'BL_COMPARISON',
	'SI_REQUEST',
	'INVOICE_QUERY',
	'GENERAL',
	'SPAM'
] as const;
export const labels: Record<(typeof fields)[number], string> = {
	shipper: 'Shipper',
	consignee: 'Consignee',
	notify_party: 'Notify party',
	port_of_loading: 'Port of loading',
	port_of_discharge: 'Port of discharge',
	container_count: 'Container count',
	gross_weight_kg: 'Gross weight (kg)'
};
export const rowSchema = z.object({
	text: z.string(),
	location: z.string(),
	file: z.string().optional()
});
export const fieldSchema = z.object({
	raw: z.array(z.string()),
	canonical: z.string().nullable(),
	issue: z.string().nullable(),
	evidence: z.array(rowSchema)
});
export const resultSchema = z.object({
	status: z.enum(['OK', 'MISMATCH', 'NEEDS_REVIEW', 'NOT_APPLICABLE']),
	review_reason: z.string().nullable(),
	defect_fields: z.array(z.string()),
	has_defect: z.boolean(),
	fields: z
		.record(
			z.string(),
			z.object({
				si: fieldSchema,
				bl: fieldSchema,
				outcome: z.enum(['match', 'mismatch', 'unknown'])
			})
		)
		.optional(),
	known_mismatches: z.array(z.string()).optional()
});
export const auditSchema = z
	.object({
		subject: z.string(),
		category: z.enum(categories),
		status: z.string(),
		review_reason: z.string().nullable(),
		classification: z.object({ method: z.string() }).passthrough(),
		documents: z.array(
			z.object({ path: z.string(), sha256: z.string(), type: z.string(), rows: z.array(rowSchema) })
		),
		errors: z.array(z.unknown())
	})
	.passthrough();
export type Audit = z.infer<typeof auditSchema>;
const correctionSchema = z.object({
	value: z.string().max(4000),
	source: z.string().min(1).max(1000)
});
export const editsSchema = z.record(z.string(), correctionSchema).superRefine((value, ctx) => {
	for (const key of Object.keys(value))
		if (!fields.some((f) => key === `si.${f}` || key === `bl.${f}`))
			ctx.addIssue({ code: 'custom', message: 'Unknown field', path: [key] });
});
export const inputSchema = z.object({
	category: z.enum(categories),
	siPath: z.string().max(500),
	blPath: z.string().max(500),
	edits: editsSchema
});
export type ReviewInput = z.infer<typeof inputSchema>;
export type Comparison = z.infer<typeof resultSchema>;
export type Decision =
	| 'PENDING'
	| 'CONFIRMED_MATCH'
	| 'CONFIRMED_MISMATCH'
	| 'REQUESTED_INFO'
	| 'CONFIRMED_NOT_APPLICABLE';
export type Event = {
	version: number;
	at: string;
	actor: string;
	engineHash: string | null;
	reason: string;
	decision: Decision;
	input: ReviewInput;
	result: Comparison | null;
};
export const commandSchema = z.object({
	version: z.coerce.number().int().min(0),
	runHash: z.string().regex(/^[a-f0-9]{64}$/),
	action: z.enum(['recompute', 'confirm', 'request_info']),
	reason: z.string().trim().min(3).max(2000),
	input: inputSchema.optional()
});

export const emailSchema = z.object({
	email_id: z.string(),
	from: z.string(),
	subject: z.string(),
	body: z.string(),
	attachments: z.array(z.string())
});
