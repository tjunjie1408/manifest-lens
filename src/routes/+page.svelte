<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { enhance as formEnhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';

	let { data } = $props();

	const { form, errors, enhance, message, submitting } = superForm(data.form, {
		resetForm: true,
		onUpdated: ({ form }) => {
			if (form.valid && form.message) toast.success(String(form.message));
		}
	});

	type Tone = 'default' | 'run-a' | 'warning' | 'error';
	function tone(p: number): Tone {
		if (p >= 4) return 'error';
		if (p >= 3) return 'warning';
		if (p >= 2) return 'run-a';
		return 'default';
	}
</script>

<div class="flex flex-col gap-6">
	<div>
		<h1 class="text-[28px] font-semibold tracking-tight">Starter</h1>
		<p class="mt-1 text-[14px] text-ink-muted">
			SvelteKit full-stack template — app shell, UI primitives, and the Zod &rarr; service pattern
			wired end to end.
		</p>
	</div>

	<div class="grid gap-6 md:grid-cols-[340px_1fr]">
		<Card title="New task">
			<form method="post" action="?/create" use:enhance class="flex flex-col gap-3">
				<Input
					label="Title"
					name="title"
					bind:value={$form.title}
					placeholder="Ship the demo"
					error={$errors.title?.[0]}
				/>
				<Input
					label="Priority (1–5)"
					name="priority"
					type="number"
					min="1"
					max="5"
					bind:value={$form.priority}
					error={$errors.priority?.[0]}
				/>
				<div class="flex items-center gap-3">
					<Button type="submit" disabled={$submitting}>Add task</Button>
					{#if $message}
						<span class="font-mono text-[12px] text-success">{$message}</span>
					{/if}
				</div>
			</form>
		</Card>

		<Card title="Tasks">
			{#snippet actions()}
				{data.tasks.length} total
			{/snippet}

			{#if data.tasks.length === 0}
				<p class="py-8 text-center font-mono text-[12px] text-ink-muted">No tasks yet.</p>
			{:else}
				<table class="w-full border-collapse text-left">
					<thead>
						<tr
							class="border-b border-divider font-mono text-[11px] tracking-wider text-ink-muted uppercase"
						>
							<th class="py-2 pr-3 font-medium">Title</th>
							<th class="py-2 pr-3 font-medium">Priority</th>
							<th class="py-2"></th>
						</tr>
					</thead>
					<tbody>
						{#each data.tasks as task (task.id)}
							<tr class="border-b border-divider/60">
								<td class="py-2 pr-3 text-[14px] text-ink">{task.title}</td>
								<td class="py-2 pr-3"><Badge tone={tone(task.priority)}>P{task.priority}</Badge></td
								>
								<td class="py-2 text-right">
									<form
										id={`delete-${task.id}`}
										method="post"
										action="?/delete"
										use:formEnhance={() => {
											return async ({ update }) => {
												await update();
												toast.success('Task deleted.');
											};
										}}
									>
										<input type="hidden" name="id" value={task.id} />
									</form>
									<AlertDialog.Root>
										<AlertDialog.Trigger
											class="inline-flex items-center justify-center rounded-control px-3.5 py-2 text-[13px] font-medium text-error transition-colors hover:bg-error/10"
										>
											Delete
										</AlertDialog.Trigger>
										<AlertDialog.Content>
											<AlertDialog.Header>
												<AlertDialog.Title>Delete this task?</AlertDialog.Title>
												<AlertDialog.Description>
													“{task.title}” will be permanently removed. This can't be undone.
												</AlertDialog.Description>
											</AlertDialog.Header>
											<AlertDialog.Footer>
												<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
												<AlertDialog.Action
													type="submit"
													form={`delete-${task.id}`}
													variant="destructive"
												>
													Delete
												</AlertDialog.Action>
											</AlertDialog.Footer>
										</AlertDialog.Content>
									</AlertDialog.Root>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</Card>
	</div>
</div>
