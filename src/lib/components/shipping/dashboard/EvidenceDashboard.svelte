<script lang="ts">
	import { categories } from '$lib/schemas/shipping';
	import { bucketNames, categoryNames } from '$lib/shipping/presentation';
	import { filterCases, summarizeCases } from '$lib/shipping/evidence-map';
	import type { EvidenceCase, WorkBucket } from '$lib/shipping/types';
	import EvidenceMatrix from './EvidenceMatrix.svelte';
	let { cases }: { cases: EvidenceCase[] } = $props();
	let query = $state('');
	let category = $state('all');
	let bucket = $state<WorkBucket | 'all'>('all');
	let page = $state(0);
	const pageSize = 25;
	const scope = $derived(filterCases(cases, { query, category, bucket: 'all' }));
	const counts = $derived(summarizeCases(scope));
	const visible = $derived(filterCases(scope, { query: '', category: 'all', bucket }));
	const pageCount = $derived(Math.max(1, Math.ceil(visible.length / pageSize)));
	const displayed = $derived(visible.slice(page * pageSize, (page + 1) * pageSize));
	$effect(() => {
		void query;
		void category;
		void bucket;
		page = 0;
	});
	const buckets = Object.keys(bucketNames) as WorkBucket[];
</script>

<svelte:head><title>Evidence Map · Manifest Lens</title></svelte:head>
<div class="space-y-6">
	<header>
		<p class="review-eyebrow">Workspace / Overview</p>
		<h1 class="mt-2 text-3xl font-semibold tracking-tight">Evidence Map</h1>
		<p class="mt-2 text-sm text-ink-muted">Find gaps. Inspect differences. Follow the evidence.</p>
	</header>
	<section class="review-panel" aria-label="Evidence filters">
		<div class="flex flex-wrap gap-3 p-5">
			<input
				class="review-input min-w-0 flex-1"
				aria-label="Search evidence"
				placeholder="Search subject or email ID"
				bind:value={query}
			/><select class="review-input sm:max-w-64" aria-label="Email category" bind:value={category}
				><option value="all">All categories</option>{#each categories as value (value)}<option
						{value}>{categoryNames[value]}</option
					>{/each}</select
			>
		</div>
		<div class="grid grid-cols-2 gap-2 px-5 pb-5 md:grid-cols-3">
			{#each buckets as value (value)}<button
					class="evidence-summary"
					aria-pressed={bucket === value}
					onclick={() => (bucket = bucket === value ? 'all' : value)}
					><span class="text-2xl font-semibold">{counts[value]}</span><span
						class="text-xs text-ink-muted">{bucketNames[value]}</span
					></button
				>{/each}
		</div>
		<p class="border-t border-divider px-5 py-3 text-xs text-ink-muted">
			{scope.length} emails in scope · Each email belongs to one group · Your records · Synthetic dataset
		</p>
	</section>
	<section class="review-panel" aria-label="Evidence map">
		<div class="review-panel-head">
			<div>
				<h2>{bucket === 'all' ? 'All evidence' : bucketNames[bucket]}</h2>
				<p class="mt-1 text-xs text-ink-muted">
					Field results are separate from human confirmation.
				</p>
			</div>
			{#if bucket !== 'all'}<button class="review-action" onclick={() => (bucket = 'all')}
					>Show all groups</button
				>{/if}
		</div>
		<div class="flex flex-wrap gap-4 border-b border-divider px-5 py-3 text-xs text-ink-muted">
			<span>Match: both values agree</span><span>Difference: values conflict</span><span
				>Unknown: insufficient evidence</span
			><span>Not applicable: other email category</span>
		</div>
		{#if visible.length}<EvidenceMatrix cases={displayed} />{:else}<p
				class="p-10 text-center text-sm text-ink-muted"
			>
				No evidence matches these filters.
			</p>{/if}
		<footer class="flex flex-wrap items-center justify-between gap-3 border-t border-divider p-4">
			<p role="status" class="text-xs text-ink-muted">
				{visible.length} results · Page {page + 1} of {pageCount}
			</p>
			<div class="flex gap-2">
				<button class="review-action" disabled={page === 0} onclick={() => page--}>Previous</button
				><button class="review-action" disabled={page + 1 >= pageCount} onclick={() => page++}
					>Next</button
				>
			</div>
		</footer>
	</section>
	<details class="review-panel review-disclosure p-5">
		<summary>How to read this map</summary>
		<p class="text-sm leading-relaxed text-ink-muted">
			Select any field to inspect its source and corrections. Missing evidence includes unreadable
			attachments, unresolved classification, and unknown field values. Information requests and
			confirmed decisions take priority in the summary groups. A match is a comparison result, not
			proof of correctness. No model-confidence or entropy score is inferred.
		</p>
	</details>
</div>
