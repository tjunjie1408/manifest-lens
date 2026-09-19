import { projectEvidenceCase } from '$lib/shipping/evidence-map';
import type { ReviewDetail } from '$lib/shipping/types';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, basename } from 'node:path';
import { spawn } from 'node:child_process';
import { and, eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { shippingReview } from '$lib/server/db/schema';
import { attachmentMatchesHash } from '$lib/server/attachment-integrity';
import {
	auditSchema,
	emailSchema,
	commandSchema,
	inputSchema,
	resultSchema,
	type Audit,
	type Event,
	type ReviewInput
} from '$lib/schemas/shipping';

export class ReviewError extends Error {
	constructor(
		public status: number,
		message: string
	) {
		super(message);
	}
}
const report = resolve('worker/reports/experiment-v2/audit.json');
async function readExperiment() {
	const bytes = await readFile(report);
	const fingerprint = createHash('sha256').update(bytes);
	const payload: Record<string, unknown> = JSON.parse(bytes.toString('utf8'));
	const cases: Record<string, Audit> = {};
	const emails: Record<string, ReturnType<typeof emailSchema.parse>> = {};
	for (const [id, value] of Object.entries(payload)) {
		if (!/^email_\d+$/.test(id)) throw new Error('Invalid experiment email identifier');
		cases[id] = auditSchema.parse(value);
		const original = await readFile(resolve('sdoc-hackathon-docker/data_v2/inbox', `${id}.json`));
		emails[id] = emailSchema.parse(JSON.parse(original.toString('utf8')));
		if (emails[id].email_id !== id || emails[id].subject !== cases[id].subject)
			throw new Error('Experiment email source mismatch');
		fingerprint.update(id).update(original);
	}
	return { runHash: fingerprint.digest('hex'), cases, emails };
}
let experiment: ReturnType<typeof readExperiment> | undefined;
export function loadExperiment() {
	// Pin this local experiment for the server lifetime. Restart to load changed sources.
	return (experiment ??= readExperiment().catch((error) => {
		experiment = undefined;
		throw error;
	}));
}
const where = (ownerId: string, runHash: string, emailId: string) =>
	and(
		eq(shippingReview.ownerId, ownerId),
		eq(shippingReview.runHash, runHash),
		eq(shippingReview.emailId, emailId)
	);
function initialInput(audit: Audit): ReviewInput {
	return {
		category: audit.category,
		siPath: audit.documents.find((d) => d.type === 'SI')?.path ?? '',
		blPath: audit.documents.find((d) => d.type === 'BL')?.path ?? '',
		edits: {}
	};
}
export async function listReviews(ownerId: string) {
	const { runHash, cases } = await loadExperiment();
	const saved = await db
		.select()
		.from(shippingReview)
		.where(and(eq(shippingReview.ownerId, ownerId), eq(shippingReview.runHash, runHash)));
	const map = new Map(saved.map((row) => [row.emailId, row.history.at(-1)]));
	return Object.entries(cases).map(([id, audit]) => projectEvidenceCase(id, audit, map.get(id)));
}
export async function getReview(ownerId: string, emailId: string): Promise<ReviewDetail> {
	const { runHash, cases, emails } = await loadExperiment();
	const audit = Object.hasOwn(cases, emailId) ? cases[emailId] : undefined;
	if (!audit) throw new ReviewError(404, 'Experiment email not found');
	const [saved] = await db
		.select()
		.from(shippingReview)
		.where(where(ownerId, runHash, emailId));
	const history = saved?.history ?? [];
	const last = history.at(-1);
	const initial = resultSchema.safeParse(audit);
	return {
		emailId,
		email: emails[emailId],
		runHash,
		audit,
		history,
		version: saved?.version ?? 0,
		input: last?.input ?? initialInput(audit),
		result: last?.result ?? (initial.success ? initial.data : null),
		decision: last?.decision ?? 'PENDING'
	};
}
export async function recompute(audit: Audit, input: ReviewInput) {
	input = inputSchema.parse(input);
	const executable =
		env.SHIPPING_PYTHON ||
		resolve('worker/.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
	const output = await new Promise<string>((ok, fail) => {
		const child = spawn(executable, ['-X', 'utf8', resolve('worker/manual_compare.py')], {
			stdio: ['pipe', 'pipe', 'pipe'],
			windowsHide: true
		});
		let stdout = '';
		let stderr = '';
		let settled = false;
		const finish = (error?: Error) => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			if (error) {
				child.kill();
				fail(error);
			} else ok(stdout);
		};
		const timer = setTimeout(
			() =>
				finish(
					new ReviewError(503, 'Verification timed out. Changes were not saved. Please try again.')
				),
			15000
		);
		child.on('error', () =>
			finish(
				new ReviewError(
					503,
					'The local verification service is unavailable. Changes were not saved.'
				)
			)
		);
		child.stdout.on('data', (chunk) => {
			stdout += chunk;
			if (stdout.length > 2_000_000)
				finish(new ReviewError(503, 'Verification output exceeded the size limit.'));
		});
		child.stderr.on('data', (chunk) => {
			stderr += chunk;
			if (stderr.length > 100_000)
				finish(new ReviewError(503, 'Verification failed. Changes were not saved.'));
		});
		child.stdin.on('error', () =>
			finish(new ReviewError(503, 'The verification process disconnected.'))
		);
		child.on('close', (code) =>
			finish(
				code === 0
					? undefined
					: new ReviewError(422, 'Unable to verify. Check the document pair and field evidence.')
			)
		);
		child.stdin.end(JSON.stringify({ audit, input }));
	});
	return resultSchema.parse(JSON.parse(output));
}
export async function applyReview(ownerId: string, emailId: string, raw: unknown) {
	const parsed = commandSchema.safeParse(raw);
	if (!parsed.success)
		throw new ReviewError(
			400,
			'Provide a valid revision, correction evidence, and a reason of at least three characters.'
		);
	const command = parsed.data;
	const current = await getReview(ownerId, emailId);
	if (current.runHash !== command.runHash || current.version !== command.version)
		throw new ReviewError(409, 'This record has changed. Refresh the page and review it again.');
	let input = current.input;
	let result = current.history.at(-1)?.result ?? null;
	let decision: Event['decision'] = 'PENDING';
	let engineHash = current.history.at(-1)?.engineHash ?? null;
	if (command.action === 'recompute') {
		if (!command.input) throw new ReviewError(400, 'Verification input is missing.');
		input = command.input;
		if (
			(input.siPath !== current.input.siPath || input.blPath !== current.input.blPath) &&
			Object.keys(input.edits).length
		)
			throw new ReviewError(
				400,
				'Clear corrections before changing document pairs. Save, then correct values using the new originals.'
			);
		const engine = createHash('sha256');
		for (const file of ['worker/shipping.py', 'worker/manual_compare.py'])
			engine.update(await readFile(resolve(file)));
		engineHash = engine.digest('hex');
		result = await recompute(current.audit, input);
	} else if (command.action === 'request_info') {
		decision = 'REQUESTED_INFO';
	} else {
		if (!result || result.status === 'NEEDS_REVIEW')
			throw new ReviewError(
				400,
				'Confirmation requires sufficient evidence and a saved verification result.'
			);
		decision =
			result.status === 'OK'
				? 'CONFIRMED_MATCH'
				: result.status === 'MISMATCH'
					? 'CONFIRMED_MISMATCH'
					: 'CONFIRMED_NOT_APPLICABLE';
	}
	const version = current.version + 1;
	const event: Event = {
		version,
		actor: ownerId,
		engineHash,
		at: new Date().toISOString(),
		reason: command.reason,
		decision,
		input,
		result
	};
	const history = [...current.history, event];
	const saved =
		current.version === 0
			? await db
					.insert(shippingReview)
					.values({ ownerId, runHash: current.runHash, emailId, version, history })
					.onConflictDoNothing()
					.returning({ version: shippingReview.version })
			: await db
					.update(shippingReview)
					.set({ version, history })
					.where(
						and(
							where(ownerId, current.runHash, emailId),
							eq(shippingReview.version, current.version)
						)
					)
					.returning({ version: shippingReview.version });
	if (saved.length !== 1)
		throw new ReviewError(
			409,
			'Another action updated this record. Your action was not saved. Please refresh.'
		);
	return event;
}
export async function originalAttachment(ownerId: string, emailId: string, path: string) {
	const { audit } = await getReview(ownerId, emailId);
	const document = audit.documents.find((d) => d.path === path);
	if (!document || !/^attachments\/[a-zA-Z0-9_.-]+$/.test(path))
		throw new ReviewError(404, 'Attachment not found.');
	const bytes = await readFile(resolve('sdoc-hackathon-docker/data_v2', path));
	if (!attachmentMatchesHash(bytes, document.sha256, path))
		throw new ReviewError(
			409,
			'The original file has changed and cannot be used to review this experiment.'
		);
	return { bytes, name: basename(path) };
}
