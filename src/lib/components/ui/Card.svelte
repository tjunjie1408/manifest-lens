<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title?: string;
		actions?: Snippet;
		class?: string;
		children: Snippet;
	}

	let { title, actions, class: klass = '', children }: Props = $props();
</script>

<section class="rounded-card border border-divider bg-surface p-4 {klass}">
	{#if title || actions}
		<header class="mb-3 flex items-center justify-between gap-3">
			{#if title}
				<h2 class="text-[14px] font-semibold text-ink">{title}</h2>
			{/if}
			{#if actions}
				<div class="font-mono text-[12px] text-ink-muted">{@render actions()}</div>
			{/if}
		</header>
	{/if}
	{@render children()}
</section>
