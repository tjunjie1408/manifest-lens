<script lang="ts">
	import type { Snippet } from 'svelte';

	type Variant = 'primary' | 'secondary' | 'ghost';

	interface Props {
		variant?: Variant;
		href?: string;
		type?: 'button' | 'submit' | 'reset';
		disabled?: boolean;
		class?: string;
		onclick?: (e: MouseEvent) => void;
		children: Snippet;
	}

	let {
		variant = 'primary',
		href,
		type = 'button',
		disabled = false,
		class: klass = '',
		onclick,
		children
	}: Props = $props();

	const base =
		'inline-flex items-center justify-center gap-2 rounded-control px-3.5 py-2 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50';

	const variants: Record<Variant, string> = {
		primary: 'bg-primary text-white hover:bg-primary-hover active:bg-primary-active',
		secondary: 'border border-divider bg-surface text-ink hover:bg-surface-2',
		ghost: 'bg-transparent text-ink-muted hover:bg-surface-2 hover:text-ink'
	};
</script>

{#if href}
	<a {href} class="{base} {variants[variant]} {klass}" {onclick}>{@render children()}</a>
{:else}
	<button {type} {disabled} class="{base} {variants[variant]} {klass}" {onclick}>
		{@render children()}
	</button>
{/if}
