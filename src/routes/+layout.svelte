<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { resolve } from '$app/paths';
	import { ModeWatcher, toggleMode } from 'mode-watcher';
	import { Toaster } from '$lib/components/ui/sonner';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import SunIcon from '@lucide/svelte/icons/sun';
	import MoonIcon from '@lucide/svelte/icons/moon';

	let { data, children } = $props();

	const navLink = 'rounded-control px-2.5 py-1.5 hover:bg-surface-2';
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<ModeWatcher />
<Toaster />

<Tooltip.Provider>
	<div class="min-h-screen">
		<header class="sticky top-0 z-10 border-b border-divider bg-surface/90 backdrop-blur">
			<div
				class="mx-auto flex min-h-14 w-full max-w-[1600px] flex-wrap items-center justify-between gap-4 px-5 lg:px-8"
			>
				<a
					href={resolve('/shipping/overview')}
					class="font-mono text-[13px] font-semibold tracking-tight text-primary"
				>
					Manifest Lens
				</a>

				{#if data.user}
					<nav aria-label="Main navigation" class="font-mono text-[12px]">
						<a href={resolve('/shipping/overview')} class={navLink}>Evidence map</a>
						<a href={resolve('/shipping')} class={navLink}>Review queue</a>
						<a href={resolve('/shipping/guide')} class={navLink}>Review guide</a>
					</nav>
				{/if}

				<div class="flex items-center gap-2 font-mono text-[12px]">
					<button
						onclick={toggleMode}
						aria-label="Toggle theme"
						class="rounded-control p-1.5 text-ink-muted hover:bg-surface-2"
					>
						<SunIcon class="size-4 dark:hidden" />
						<MoonIcon class="hidden size-4 dark:block" />
					</button>
					{#if data.user}
						<span class="hidden max-w-48 truncate text-ink-muted md:inline">{data.user.email}</span>
						<a href={resolve('/demo/better-auth')} class="{navLink} text-ink-muted">Account</a>
					{:else}
						<a
							href={resolve('/demo/better-auth/login')}
							class="rounded-control bg-primary px-3 py-1.5 text-primary-foreground hover:bg-primary-hover"
						>
							Sign in
						</a>
					{/if}
				</div>
			</div>
		</header>

		<main class="mx-auto w-full max-w-[1600px] px-5 py-8 lg:px-8">
			{@render children()}
		</main>
	</div>
</Tooltip.Provider>
