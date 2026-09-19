<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import type { ReviewDetail } from '$lib/shipping/types';
	import EvidencePanel from './EvidencePanel.svelte';
	import DocumentPairing from './DocumentPairing.svelte';
	import FieldComparison from './FieldComparison.svelte';
	import ReviewDecision from './ReviewDecision.svelte';
	import ReviewHistory from './ReviewHistory.svelte';

	import StatusBadge from '$lib/components/shipping/StatusBadge.svelte';
	let { data, form }: { data: ReviewDetail; form?: { message: string } | null } = $props();
	let draftChanged = $state(false);
	$effect(() => {
		if (data.version >= 0) draftChanged = false;
	});
	const canConfirm = $derived(
		Boolean(data.history.at(-1)?.result && data.history.at(-1)?.result?.status !== 'NEEDS_REVIEW')
	);
</script>

<svelte:head><title>{data.emailId} · Manifest Lens</title></svelte:head>
<div class="space-y-6">
	<a class="text-xs text-ink-muted hover:text-primary" href={resolve('/shipping')}
		>← Back to review queue</a
	>
	<header class="space-y-3">
		<p class="review-eyebrow">{data.emailId} · Revision {data.version}</p>
		<h1 class="max-w-4xl text-xl leading-snug font-semibold tracking-tight md:text-2xl">
			{data.audit.subject}
		</h1>
		<div class="flex flex-wrap items-center gap-3">
			<span class="text-xs text-ink-muted">Comparison</span><StatusBadge
				value={data.result?.status ?? 'Not completed'}
			/><span class="ml-2 text-xs text-ink-muted">Decision</span><StatusBadge
				value={data.decision}
			/>
		</div>
	</header>
	{#if form?.message}<p role="status" class="review-panel px-5 py-3 text-sm">{form.message}</p>{/if}
	<div class="review-workspace">
		<EvidencePanel {data} />
		<div class="min-w-0 space-y-6">
			{#key data.version}<form
					method="POST"
					use:enhance
					class="space-y-6"
					oninput={(event) => {
						if ((event.target as HTMLInputElement).name !== 'reason') draftChanged = true;
					}}
				>
					<input type="hidden" name="version" value={data.version} /><input
						type="hidden"
						name="runHash"
						value={data.runHash}
					/>
					<DocumentPairing {data} />
					<FieldComparison {data} />
					<ReviewDecision {data} {canConfirm} {draftChanged} />
				</form>{/key}
			<ReviewHistory {data} />
		</div>
	</div>
</div>
