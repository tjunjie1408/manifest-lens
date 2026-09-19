<script lang="ts">
	import type { ReviewDetail } from '$lib/shipping/types';
	import StatusBadge from '../StatusBadge.svelte';
	let { data }: { data: Pick<ReviewDetail, 'history'> } = $props();
</script>

<section class="review-panel" aria-label="Review history">
	<div class="review-panel-head">
		<h2>Revision and confirmation history</h2>
		<span class="text-xs text-ink-muted">{data.history.length} events</span>
	</div>
	<div class="p-5">
		{#if !data.history.length}<p class="text-sm text-ink-muted">No human decisions yet.</p>{/if}
		{#each [...data.history].reverse() as event (event.version)}<details
				class="review-disclosure border-l-2 border-divider pb-5 pl-4"
			>
				<summary
					><span class="mr-2 font-mono">V{event.version}</span><StatusBadge
						value={event.decision}
					/><span class="ml-2 text-xs">{new Date(event.at).toLocaleString('en-GB')}</span></summary
				>
				<p class="my-3 text-sm">{event.reason}</p>
				<p class="text-xs break-all text-ink-muted">Reviewer: {event.actor}</p>
				<details class="review-disclosure mt-3">
					<summary>Technical record</summary>
					<p class="text-xs break-all">Engine: {event.engineHash ?? 'Not run'}</p>
					<pre class="mt-2 max-h-64 overflow-auto rounded bg-surface-2 p-3 text-xs">{JSON.stringify(
							{ input: event.input, result: event.result },
							null,
							2
						)}</pre>
				</details>
			</details>{/each}
	</div>
</section>
