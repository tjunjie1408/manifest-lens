<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageServerData } from './$types';

	let { data }: { data: PageServerData } = $props();
</script>

<svelte:head><title>Account · Shipping Review</title></svelte:head>
<h1 class="text-2xl font-semibold">Account</h1>
<p class="mt-3">{data.user.name}</p>
<p class="mb-4 text-sm text-ink-muted">{data.user.email}</p>
<form method="post" action="?/signOut" use:enhance>
	<button
		class="rounded-control bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
		>Sign out</button
	>
</form>
