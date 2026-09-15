<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	interface Props extends Omit<HTMLInputAttributes, 'class' | 'value'> {
		label?: string;
		error?: string;
		value?: string | number;
		class?: string;
	}

	let { label, error, value = $bindable(), class: klass = '', id, name, ...rest }: Props = $props();

	const fieldId = $derived(id ?? name);
</script>

<div class="flex flex-col gap-1.5">
	{#if label}
		<label
			for={fieldId}
			class="font-mono text-[11px] font-medium tracking-wider text-ink-muted uppercase"
		>
			{label}
		</label>
	{/if}
	<input
		id={fieldId}
		{name}
		bind:value
		aria-invalid={error ? 'true' : undefined}
		class="rounded-control border border-divider bg-surface px-3 py-2 font-mono text-[13px] text-ink transition-colors placeholder:text-ink-muted/60 focus:border-primary focus:outline-2 focus:outline-offset-0 focus:outline-primary-wash aria-[invalid]:border-error {klass}"
		{...rest}
	/>
	{#if error}
		<p class="font-mono text-[11px] text-error">{error}</p>
	{/if}
</div>
