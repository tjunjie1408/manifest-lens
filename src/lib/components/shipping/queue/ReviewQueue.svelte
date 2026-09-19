<script lang="ts">
	import { resolve } from '$app/paths';
	import StatusBadge from '$lib/components/shipping/StatusBadge.svelte';
	import type { EvidenceCase } from '$lib/shipping/types';
	import { categoryNames } from '$lib/shipping/presentation';
	let { data }: { data: { cases: EvidenceCase[] } } = $props();
	let query = $state('');
	let filter = $state('review');
	const visible = $derived(
		data.cases.filter(
			(c) =>
				(filter === 'all' ||
					(filter === 'confirmed' && c.decision.startsWith('CONFIRMED')) ||
					(filter === 'review' &&
						!c.decision.startsWith('CONFIRMED') &&
						(c.category === 'BL_COMPARISON' || c.uncertain))) &&
				`${c.id} ${c.subject}`.toLowerCase().includes(query.toLowerCase())
		)
	);
	const confirmed = $derived(data.cases.filter((c) => c.decision.startsWith('CONFIRMED')).length);
</script>

<svelte:head><title>Review queue · Manifest Lens</title></svelte:head>
<div class="space-y-7">
	<header class="flex flex-wrap items-end justify-between gap-5">
		<div>
			<p class="review-eyebrow">Workspace / Review queue</p>
			<h1 class="mt-2 text-3xl font-semibold tracking-tight">Manifest Lens</h1>
			<p class="mt-2 text-sm text-ink-muted">
				Verify evidence. Resolve differences. Record your decision.
			</p>
		</div>
		<div class="rounded-xl border border-divider bg-surface px-5 py-3">
			<span class="text-2xl font-semibold">{confirmed}</span><span
				class="ml-2 text-xs text-ink-muted">confirmed / {data.cases.length} emails</span
			>
		</div>
	</header>
	<section class="review-panel" aria-label="Email queue">
		<div class="review-panel-head">
			<div>
				<h2>Review queue</h2>
				<p class="mt-1 text-xs text-ink-muted">Your records · Synthetic dataset</p>
			</div>
			<span class="text-xs text-ink-muted"
				>{visible.length} {visible.length === 1 ? 'result' : 'results'}</span
			>
		</div>
		<div class="flex flex-wrap gap-3 p-5">
			<input
				aria-label="Search emails"
				placeholder="Search subject or email ID"
				bind:value={query}
				class="review-input min-w-0 flex-1"
			/><select aria-label="Review filter" bind:value={filter} class="review-input sm:max-w-48"
				><option value="review">Pending review</option><option value="confirmed">Confirmed</option
				><option value="all">All emails</option></select
			>
		</div>
		<div
			class="review-queue-row review-queue-head bg-surface-2 text-xs font-semibold text-ink-muted sm:grid"
		>
			<span>Email / Category</span><span>Comparison</span><span>Human decision</span>
		</div>
		{#each visible as item (item.id)}<article class="review-queue-row">
				<div class="min-w-0">
					<p class="mb-2 font-mono text-[11px] text-ink-muted">{item.id}</p>
					<a
						class="block text-sm leading-relaxed font-medium hover:text-primary hover:underline"
						href={resolve('/shipping/[id]', { id: item.id })}>{item.subject}</a
					>
					<p class="mt-2 text-xs text-ink-muted">
						{categoryNames[item.category]}{item.uncertain ? ' · Check classification' : ''}
					</p>
				</div>
				<div>
					<span class="mb-1 block text-[10px] text-ink-muted sm:hidden">Comparison</span
					><StatusBadge value={item.category === 'BL_COMPARISON' ? item.status : 'Not compared'} />
				</div>
				<div>
					<span class="mb-1 block text-[10px] text-ink-muted sm:hidden">Human decision</span
					><StatusBadge value={item.decision} />
				</div>
			</article>{/each}
		{#if !visible.length}<div class="border-t border-divider p-12 text-center">
				<h3 class="text-sm font-medium">No matching emails</h3>
				<p class="mt-2 text-xs text-ink-muted">Try another search or review filter.</p>
			</div>{/if}
	</section>
</div>
