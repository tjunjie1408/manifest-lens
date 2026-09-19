<script lang="ts">
	import type { ReviewDetail } from '$lib/shipping/types';
	import { categories } from '$lib/schemas/shipping';
	import { categoryNames } from '$lib/shipping/presentation';
	let { data }: { data: Pick<ReviewDetail, 'audit' | 'input'> } = $props();
</script>

<section class="review-panel" aria-label="Document pairing">
	<details class="review-disclosure p-5">
		<summary>Document pairing · {categoryNames[data.input.category]}</summary>
		<div class="grid gap-4 sm:grid-cols-2">
			<label class="space-y-2 text-xs sm:col-span-2"
				>Email category<select class="review-input mt-2" name="category" value={data.input.category}
					>{#each categories as category (category)}<option value={category}
							>{categoryNames[category]}</option
						>{/each}</select
				></label
			>
			{#each ['si', 'bl'] as side (side)}<label class="space-y-2 text-xs"
					>{side === 'si' ? 'SI reference document' : 'BL document to verify'}<select
						class="review-input mt-2"
						name={`${side}Path`}
						value={side === 'si' ? data.input.siPath : data.input.blPath}
						><option value="">Select a document</option
						>{#each data.audit.documents as document (document.path)}<option value={document.path}
								>{document.path.split('/').at(-1)}</option
							>{/each}</select
					></label
				>{/each}
		</div>
		<p class="mt-3 text-xs text-ink-muted">
			Clear field corrections before switching documents, then recheck.
		</p>
	</details>
</section>
