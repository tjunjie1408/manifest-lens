<script lang="ts">
	import { resolve } from '$app/paths';
	import type { ReviewDetail } from '$lib/shipping/types';
	import { reviewReasonGuidance } from '$lib/shipping/presentation';

	let { data }: { data: Pick<ReviewDetail, 'audit' | 'result'> } = $props();
	const guidance = $derived(
		reviewReasonGuidance(
			data.result?.review_reason ?? data.audit.review_reason,
			data.audit.documents.length,
			data.audit.errors.length
		)
	);
</script>

{#if guidance}
	<section class="review-guidance" aria-labelledby="case-guidance-title">
		<div>
			<p class="review-eyebrow mb-1">Why this case needs review</p>
			<h2 id="case-guidance-title" class="text-sm font-semibold">{guidance.title}</h2>
		</div>
		<p class="text-sm leading-relaxed text-ink-muted">{guidance.explanation}</p>
		<p class="text-sm font-medium">Next step: {guidance.action}</p>
	</section>
{/if}

<details class="review-panel review-disclosure px-5 py-4">
	<summary>How to complete this review</summary>
	<div class="review-guide-grid mt-4 text-sm leading-relaxed">
		<p>
			<strong>1. Inspect evidence.</strong> Open the email, SI and draft BL in Source documents.
		</p>
		<p>
			<strong>2. Resolve exceptions.</strong> Check every Difference and Unknown field before deciding.
		</p>
		<p>
			<strong>3. Record the outcome.</strong> Recheck corrections, confirm the saved result, or request
			information.
		</p>
	</div>
	<a class="mt-4 inline-block text-sm text-primary underline" href={resolve('/shipping/guide')}
		>Open the full review guide</a
	>
</details>
