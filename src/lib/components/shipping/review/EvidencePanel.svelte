<script lang="ts">
	import type { ReviewDetail } from '$lib/shipping/types';
	import { resolve } from '$app/paths';
	import { categoryNames } from '$lib/shipping/presentation';
	let { data }: { data: Pick<ReviewDetail, 'audit' | 'email' | 'emailId'> } = $props();
</script>

<aside class="review-panel review-evidence" aria-label="Source evidence">
	<div class="review-panel-head">
		<div>
			<p class="review-eyebrow mb-1">01 / Evidence</p>
			<h2>Source documents</h2>
		</div>
		<span class="review-badge">{data.audit.documents.length} files</span>
	</div>
	<div class="space-y-5 p-5">
		<details class="review-disclosure">
			<summary>View email body</summary>
			<p class="mb-3 text-xs break-all text-ink-muted">{data.email.from}</p>
			<pre class="max-h-64 overflow-auto text-xs leading-relaxed whitespace-pre-wrap">{data.email
					.body}</pre>
		</details>
		{#each data.audit.documents as document (document.path)}
			<details class="review-disclosure border-t border-divider pt-4">
				<summary
					><span class="mr-2 text-primary">{document.type}</span>{document.path
						.split('/')
						.at(-1)}</summary
				>
				<a
					class="mb-3 inline-block text-xs text-primary underline"
					href={resolve(
						`/shipping/${data.emailId}/attachment?path=${encodeURIComponent(document.path)}`
					)}>Download original</a
				>
				<div class="max-h-80 space-y-3 overflow-auto">
					{#each document.rows as row, index (index)}<p class="text-xs leading-relaxed break-words">
							<span class="block font-mono text-ink-muted">{row.location}</span>{row.text}
						</p>{/each}
				</div>
			</details>
		{/each}
		{#if !data.audit.documents.length}<p class="text-sm text-warning">
				No readable documents.
			</p>{/if}
		{#if data.audit.errors.length}<p class="rounded-lg bg-surface-2 p-3 text-xs text-error">
				{data.audit.errors.length} unreadable attachments. More evidence is needed.
			</p>{/if}
		<p class="text-xs leading-relaxed text-ink-muted">
			Extracted text preview. Check the original file for layout.
		</p>
		<details class="review-disclosure border-t border-divider pt-4">
			<summary>Classification details</summary>
			<dl class="space-y-2 text-xs">
				<dt class="text-ink-muted">Method</dt>
				<dd class="break-all">{data.audit.classification.method}</dd>
				<dt class="text-ink-muted">Original category</dt>
				<dd>{categoryNames[data.audit.category]}</dd>
			</dl>
		</details>
	</div>
</aside>
