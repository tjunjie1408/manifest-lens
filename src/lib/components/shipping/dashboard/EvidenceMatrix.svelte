<script lang="ts">
	import { resolve } from '$app/paths';
	import { fields, labels } from '$lib/schemas/shipping';
	import { fieldGroups, fieldStateNames } from '$lib/shipping/presentation';
	import type { EvidenceCase } from '$lib/shipping/types';
	import StatusBadge from '../StatusBadge.svelte';
	let { cases }: { cases: EvidenceCase[] } = $props();
</script>

{#snippet evidenceNotes(row: EvidenceCase)}
	{#if row.unreadable}<p class="mt-1 text-xs text-warning">
			{row.unreadable} unreadable attachments
		</p>{/if}
	{#if row.uncertain}<p class="mt-1 text-xs text-warning">Classification needs review</p>{/if}
{/snippet}

<div class="evidence-matrix overflow-x-auto">
	<table class="w-full text-left text-xs">
		<caption class="sr-only"
			>Email field evidence and separate human decisions. Select a field to inspect its sources.</caption
		>
		<thead
			><tr class="bg-surface-2"
				><th rowspan="2" scope="col" class="min-w-48 p-4">Email</th
				>{#each fieldGroups as group (group.name)}<th
						scope="colgroup"
						colspan={group.fields.length}
						class="border-l border-divider p-3 text-center">{group.name}</th
					>{/each}<th rowspan="2" scope="col" class="p-4">Human decision</th></tr
			>
			<tr class="bg-surface-2"
				>{#each fields as field (field)}<th
						scope="col"
						class="max-w-28 border-l border-divider p-3 font-medium">{labels[field]}</th
					>{/each}</tr
			>
		</thead>
		<tbody
			>{#each cases as row (row.id)}<tr class="border-t border-divider"
					><th scope="row" class="p-4 font-normal"
						><a
							href={resolve('/shipping/[id]', { id: row.id })}
							class="font-mono font-semibold text-primary">{row.id}</a
						>
						<p class="mt-1 max-w-56 truncate text-ink-muted" title={row.subject}>
							{row.subject}
						</p>
						{@render evidenceNotes(row)}</th
					>{#each fields as field (field)}<td class="border-l border-divider p-2"
							><a
								class="evidence-cell"
								data-state={row.fields[field]}
								aria-label={`${row.id}: ${labels[field]} — ${fieldStateNames[row.fields[field]]}`}
								href={resolve(`/shipping/${row.id}#field-${field}`)}
								>{fieldStateNames[row.fields[field]]}</a
							></td
						>{/each}<td class="p-3"><StatusBadge value={row.decision} /></td></tr
				>{/each}</tbody
		>
	</table>
</div>
<div class="evidence-mobile divide-y divide-divider">
	{#each cases as row (row.id)}<article class="space-y-3 p-4">
			<a
				class="font-mono text-sm font-semibold text-primary"
				href={resolve('/shipping/[id]', { id: row.id })}>{row.id}</a
			>
			<p class="text-sm leading-relaxed">{row.subject}</p>
			{@render evidenceNotes(row)}
			<StatusBadge value={row.decision} />
			<div class="grid grid-cols-2 gap-2">
				{#each fields as field (field)}<a
						class="evidence-cell flex-col items-start"
						data-state={row.fields[field]}
						href={resolve(`/shipping/${row.id}#field-${field}`)}
						><span class="text-[10px]">{labels[field]}</span>{fieldStateNames[row.fields[field]]}</a
					>{/each}
			</div>
		</article>{/each}
</div>
