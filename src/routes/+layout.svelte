<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';
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
			<div class="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-5">
				<a
					href={resolve('/')}
					class="font-mono text-[13px] font-semibold tracking-tight text-primary"
				>
					◆ starter
				</a>

				<nav class="flex items-center gap-1 font-mono text-[12px]">
					<a
						href={resolve('/')}
						class={navLink}
						class:text-ink={page.url.pathname === '/'}
						class:text-ink-muted={page.url.pathname !== '/'}
					>
						Home
					</a>
					<a
						href={resolve('/components')}
						class="{navLink} text-ink-muted"
						class:text-ink={page.url.pathname === '/components'}
					>
						Components
					</a>
					<a href={resolve('/demo/better-auth')} class="{navLink} text-ink-muted">Auth demo</a>
				</nav>

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
						<span class="text-ink-muted">{data.user.email}</span>
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

		<main class="mx-auto max-w-6xl px-5 py-8">
			{@render children()}
		</main>
	</div>
</Tooltip.Provider>
