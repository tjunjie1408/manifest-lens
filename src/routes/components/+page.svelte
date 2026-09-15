<script lang="ts">
	import { toast } from 'svelte-sonner';
	import Card from '$lib/components/ui/Card.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Select from '$lib/components/ui/select';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import * as Sheet from '$lib/components/ui/sheet';
	import * as Command from '$lib/components/ui/command';

	const btn =
		'inline-flex items-center justify-center gap-2 rounded-control bg-primary px-3.5 py-2 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary-hover';
	const btnGhost =
		'inline-flex items-center justify-center gap-2 rounded-control border border-divider bg-surface px-3.5 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-surface-2';

	const frameworks = [
		{ value: 'sveltekit', label: 'SvelteKit' },
		{ value: 'next', label: 'Next.js' },
		{ value: 'astro', label: 'Astro' },
		{ value: 'remix', label: 'Remix' }
	];
	let framework = $state('');
	const frameworkLabel = $derived(
		frameworks.find((f) => f.value === framework)?.label ?? 'Select a framework'
	);
</script>

<div class="flex flex-col gap-6">
	<div>
		<h1 class="text-[28px] font-semibold tracking-tight">Components</h1>
		<p class="mt-1 text-[14px] text-ink-muted">
			shadcn-svelte components, re-themed to the DESIGN.md tokens. Toggle dark mode in the header —
			everything follows.
		</p>
	</div>

	<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
		<Card title="Dialog">
			<Dialog.Root>
				<Dialog.Trigger class={btn}>Open dialog</Dialog.Trigger>
				<Dialog.Content>
					<Dialog.Header>
						<Dialog.Title>Dialog title</Dialog.Title>
						<Dialog.Description>Modal with focus trap and Esc-to-close.</Dialog.Description>
					</Dialog.Header>
					<p class="text-[13px] text-ink-muted">Put any content here.</p>
					<Dialog.Footer>
						<Dialog.Close class={btnGhost}>Close</Dialog.Close>
					</Dialog.Footer>
				</Dialog.Content>
			</Dialog.Root>
		</Card>

		<Card title="Alert dialog">
			<AlertDialog.Root>
				<AlertDialog.Trigger class={btnGhost}>Delete something</AlertDialog.Trigger>
				<AlertDialog.Content>
					<AlertDialog.Header>
						<AlertDialog.Title>Are you sure?</AlertDialog.Title>
						<AlertDialog.Description>This action cannot be undone.</AlertDialog.Description>
					</AlertDialog.Header>
					<AlertDialog.Footer>
						<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
						<AlertDialog.Action onclick={() => toast.success('Confirmed')}
							>Delete</AlertDialog.Action
						>
					</AlertDialog.Footer>
				</AlertDialog.Content>
			</AlertDialog.Root>
		</Card>

		<Card title="Dropdown menu">
			<DropdownMenu.Root>
				<DropdownMenu.Trigger class={btnGhost}>Open menu</DropdownMenu.Trigger>
				<DropdownMenu.Content class="w-44">
					<DropdownMenu.Label>Actions</DropdownMenu.Label>
					<DropdownMenu.Separator />
					<DropdownMenu.Item onSelect={() => toast('Edit')}>Edit</DropdownMenu.Item>
					<DropdownMenu.Item onSelect={() => toast('Duplicate')}>Duplicate</DropdownMenu.Item>
					<DropdownMenu.Item onSelect={() => toast.error('Deleted')}>Delete</DropdownMenu.Item>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</Card>

		<Card title="Select">
			<Select.Root type="single" bind:value={framework}>
				<Select.Trigger class="w-full">{frameworkLabel}</Select.Trigger>
				<Select.Content>
					{#each frameworks as f (f.value)}
						<Select.Item value={f.value} label={f.label}>{f.label}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</Card>

		<Card title="Tabs">
			<Tabs.Root value="overview" class="w-full">
				<Tabs.List>
					<Tabs.Trigger value="overview">Overview</Tabs.Trigger>
					<Tabs.Trigger value="metrics">Metrics</Tabs.Trigger>
				</Tabs.List>
				<Tabs.Content value="overview" class="pt-3 text-[13px] text-ink-muted">
					High-level summary lives here.
				</Tabs.Content>
				<Tabs.Content value="metrics" class="pt-3 font-mono text-[13px] text-ink-muted">
					loss: 0.0421 · acc: 0.987
				</Tabs.Content>
			</Tabs.Root>
		</Card>

		<Card title="Tooltip">
			<Tooltip.Root>
				<Tooltip.Trigger class={btnGhost}>Hover me</Tooltip.Trigger>
				<Tooltip.Content>Positioned, accessible tooltip.</Tooltip.Content>
			</Tooltip.Root>
		</Card>

		<Card title="Sheet (drawer)">
			<Sheet.Root>
				<Sheet.Trigger class={btn}>Open inspector</Sheet.Trigger>
				<Sheet.Content side="right">
					<Sheet.Header>
						<Sheet.Title>Inspector</Sheet.Title>
						<Sheet.Description>A side drawer for detail / telemetry panes.</Sheet.Description>
					</Sheet.Header>
					<div class="px-4 text-[13px] text-ink-muted">Drawer body content.</div>
				</Sheet.Content>
			</Sheet.Root>
		</Card>

		<Card title="Toasts">
			<div class="flex gap-2">
				<button class={btn} onclick={() => toast.success('Saved')}>Success</button>
				<button class={btnGhost} onclick={() => toast.error('Failed')}>Error</button>
			</div>
		</Card>

		<Card title="Command (⌘K)" class="sm:col-span-2 lg:col-span-1">
			<Command.Root class="rounded-control border border-divider">
				<Command.Input placeholder="Type a command..." />
				<Command.List>
					<Command.Empty>No results found.</Command.Empty>
					<Command.Group heading="Suggestions">
						<Command.Item onSelect={() => toast('Calendar')}>Calendar</Command.Item>
						<Command.Item onSelect={() => toast('Search')}>Search</Command.Item>
						<Command.Item onSelect={() => toast('Settings')}>Settings</Command.Item>
					</Command.Group>
				</Command.List>
			</Command.Root>
		</Card>
	</div>
</div>
