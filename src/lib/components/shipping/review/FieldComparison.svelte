<script lang="ts">
	import { page } from '$app/state';
	import type { ReviewDetail } from '$lib/shipping/types';
	import { fields, labels } from '$lib/schemas/shipping';
	import { fieldGroups as groups } from '$lib/shipping/presentation';
	import StatusBadge from '../StatusBadge.svelte';
	let { data }: { data: Pick<ReviewDetail, 'input' | 'result'> } = $props();
	const counts = $derived({
		match: fields.filter((f) => data.result?.fields?.[f]?.outcome === 'match').length,
		mismatch: fields.filter((f) => data.result?.fields?.[f]?.outcome === 'mismatch').length,
		unknown: fields.filter(
			(f) => !data.result?.fields?.[f] || data.result.fields[f].outcome === 'unknown'
		).length
	});
</script>

<section class="review-panel" aria-label="Field comparison">
	<div class="review-panel-head">
		<div>
			<p class="review-eyebrow mb-1">02 / Verification</p>
			<h2>Field comparison</h2>
		</div>
		{#if data.input.category === 'BL_COMPARISON'}<p class="text-xs text-ink-muted">
				{counts.match} match · {counts.mismatch} differ · {counts.unknown} unknown
			</p>{/if}
	</div>
	{#if data.input.category !== 'BL_COMPARISON'}<p class="p-5 text-sm text-ink-muted">
			This category does not require a document comparison.
		</p>{/if}
	{#each groups as group (group.name)}<div class="review-group">
			<h3 class="bg-surface-2 px-5 py-2.5 text-xs font-semibold tracking-wide">
				{group.name}
			</h3>
			{#each group.fields as field (field)}<article
					id={`field-${field}`}
					tabindex="-1"
					class="scroll-mt-24 border-t border-divider"
					aria-label={labels[field]}
				>
					<div class="flex items-center justify-between gap-3 px-5 pt-4">
						<h4 class="text-sm font-semibold">{labels[field]}</h4>
						<StatusBadge value={data.result?.fields?.[field]?.outcome ?? 'unknown'} />
					</div>
					<div class="review-field-grid">
						{#each ['si', 'bl'] as side (side)}{@const key = `${side}.${field}`}{@const entry =
								side === 'si' ? data.result?.fields?.[field]?.si : data.result?.fields?.[field]?.bl}
							<div>
								<p class="review-eyebrow mb-2">
									{side === 'si' ? 'SI · Reference' : 'BL · To verify'}
								</p>
								<p class="review-value">{entry?.raw.join('\n') || 'Not extracted'}</p>
								<details class="review-disclosure mt-3" open={page.url.hash === `#field-${field}`}>
									<summary>Evidence & normalization</summary>
									<p class="text-xs break-words text-ink-muted">
										Normalized: {entry?.canonical ?? 'Unknown'}
									</p>
									{#each entry?.evidence ?? [] as evidence, index (index)}<p
											class="mt-1 text-xs text-ink-muted"
										>
											{evidence.location}
										</p>{/each}{#if entry?.issue}<p class="mt-2 text-xs text-warning">
											{entry.issue}
										</p>{/if}
								</details>
								<details class="review-disclosure mt-3" open={Boolean(data.input.edits[key])}>
									<summary>Edit {side.toUpperCase()} {labels[field]}</summary><label
										class="mb-3 flex items-center gap-2 text-xs"
										><input
											type="checkbox"
											name={`edit.${key}`}
											checked={Boolean(data.input.edits[key])}
										/>Apply correction</label
									><textarea
										class="review-input"
										aria-label={`${side.toUpperCase()} ${labels[field]} correction`}
										name={`value.${key}`}
										rows="2"
										value={data.input.edits[key]?.value ?? entry?.raw.join(' ') ?? ''}
									></textarea><input
										class="review-input mt-2"
										aria-label={`${side.toUpperCase()} ${labels[field]} source`}
										name={`source.${key}`}
										placeholder="Evidence: page, cell or line"
										value={data.input.edits[key]?.source ?? ''}
									/>
								</details>
							</div>{/each}
					</div>
				</article>{/each}
		</div>{/each}
</section>
