<script lang="ts">
	import type { Snippet } from 'svelte';

	type Tone = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'run-a' | 'run-b';

	interface Props {
		tone?: Tone;
		children: Snippet;
	}

	let { tone = 'default', children }: Props = $props();

	const tones: Record<Tone, string> = {
		default: 'border-divider bg-surface text-ink-muted',
		primary: 'border-primary bg-primary-wash text-primary',
		success: 'border-success/40 bg-success/10 text-success',
		warning: 'border-warning/40 bg-warning/10 text-warning',
		error: 'border-error/40 bg-error/10 text-error',
		'run-a': 'border-run-a bg-run-a/10 text-run-a',
		'run-b': 'border-run-b bg-run-b/10 text-run-b'
	};
</script>

<span
	class="inline-flex items-center gap-1.5 rounded-chip border px-2 py-0.5 font-mono text-[11px] font-medium {tones[
		tone
	]}"
>
	{@render children()}
</span>
