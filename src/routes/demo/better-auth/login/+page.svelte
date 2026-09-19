<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	const input =
		'mt-1 rounded-control border border-divider bg-surface px-3 py-2 text-[13px] text-ink transition-colors focus:border-primary focus:outline-2 focus:outline-offset-0 focus:outline-primary-wash';
	const btn =
		'rounded-control bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary-hover';
</script>

<svelte:head><title>Sign in · Manifest Lens</title></svelte:head>
<h1 class="text-[20px] font-semibold">Sign in to Manifest Lens</h1>
<form method="post" action="?/signInEmail" use:enhance class="mt-4 flex max-w-sm flex-col gap-3">
	<label class="flex flex-col text-[12px] text-ink-muted">
		Email
		<input type="email" name="email" class={input} />
	</label>
	<label class="flex flex-col text-[12px] text-ink-muted">
		Password
		<input type="password" name="password" class={input} />
	</label>
	<label class="flex flex-col text-[12px] text-ink-muted">
		Name (for registration)
		<input name="name" class={input} />
	</label>
	<div class="flex gap-2">
		<button class={btn}>Sign in</button>
		<button formaction="?/signUpEmail" class={btn}>Register</button>
	</div>
</form>
<p class="mt-3 text-[13px] text-error">{form?.message ?? ''}</p>
