<script lang="ts">
	import type { ReviewDetail } from '$lib/shipping/types';
	import StatusBadge from '../StatusBadge.svelte';
	let {
		data,
		canConfirm,
		draftChanged
	}: { data: Pick<ReviewDetail, 'decision'>; canConfirm: boolean; draftChanged: boolean } =
		$props();
</script>

<section class="review-panel border-t-4 border-t-primary" aria-label="Human decision">
	<div class="review-panel-head">
		<div>
			<p class="review-eyebrow mb-1">03 / Decision</p>
			<h2>Complete this review</h2>
		</div>
		<StatusBadge value={data.decision} />
	</div>
	<div class="space-y-4 p-5">
		<label class="block text-xs font-medium"
			>Reason for this action<textarea
				class="review-input mt-2"
				name="reason"
				required
				minlength="3"
				maxlength="2000"
				rows="2"
				placeholder="What did you check or change?"></textarea></label
		>
		<div class="flex flex-wrap gap-2">
			<button class="review-action primary" name="operation" value="recompute"
				>Save corrections and recheck</button
			><button
				class="review-action"
				name="operation"
				value="confirm"
				disabled={!canConfirm || draftChanged}>Confirm saved result</button
			><button class="review-action" name="operation" value="request_info"
				>Request more information</button
			>
		</div>
		<p class="text-xs text-ink-muted">
			{draftChanged
				? 'Unsaved changes. Recheck before confirming.'
				: !canConfirm
					? 'Recheck with sufficient evidence to enable confirmation.'
					: 'Confirming applies to the saved revision only.'}
		</p>
		<details class="review-disclosure">
			<summary>What does confirmation mean?</summary>
			<p class="text-xs leading-relaxed text-ink-muted">
				A confirmed mismatch means an amendment is needed. A non-comparison email is confirmed as
				not applicable. Information requests are recorded here; no email is sent and no bill of
				lading is issued.
			</p>
		</details>
	</div>
</section>
