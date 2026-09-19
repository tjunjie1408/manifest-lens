<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<svelte:head><title>Review guide · Manifest Lens</title></svelte:head>

<div class="mx-auto max-w-5xl space-y-8">
	<header class="space-y-3">
		<p class="review-eyebrow">Manifest Lens workflow</p>
		<h1 class="text-3xl font-semibold tracking-tight">Shipping document review guide</h1>
		<p class="max-w-3xl text-sm leading-relaxed text-ink-muted">
			Use this guide to inspect an SI against a draft Bill of Lading, resolve uncertain evidence and
			record a traceable human decision.
		</p>
	</header>

	<section class="review-guide-grid" aria-label="Review steps">
		{#each [['1', 'Inspect the sources', 'Open the email body and both source documents. Confirm that the selected files are the intended SI and draft BL.'], ['2', 'Review the fields', 'Check every Difference and Unknown. Expand Evidence & normalization to see the extracted rows and normalized value.'], ['3', 'Record a decision', 'Save supported corrections and recheck. Confirm only the saved result, or request more information when evidence is incomplete.']] as step (step[0])}
			<article class="review-panel p-5">
				<p class="review-eyebrow mb-2">Step {step[0]}</p>
				<h2 class="mb-2 text-base font-semibold">{step[1]}</h2>
				<p class="text-sm leading-relaxed text-ink-muted">{step[2]}</p>
			</article>
		{/each}
	</section>

	<section class="review-panel overflow-hidden">
		<div class="review-panel-head"><h2>What each field state means</h2></div>
		<div class="grid gap-px bg-divider md:grid-cols-3">
			<div class="bg-surface p-5">
				<p class="mb-2 font-semibold text-success">Match</p>
				<p class="text-sm leading-relaxed text-ink-muted">
					Both documents provide evidence and their normalized values are equal.
				</p>
			</div>
			<div class="bg-surface p-5">
				<p class="mb-2 font-semibold text-error">Difference</p>
				<p class="text-sm leading-relaxed text-ink-muted">
					Both sides provide evidence, but the normalized values differ. Confirming means the draft
					BL needs amendment.
				</p>
			</div>
			<div class="bg-surface p-5">
				<p class="mb-2 font-semibold text-warning">Unknown</p>
				<p class="text-sm leading-relaxed text-ink-muted">
					At least one side lacks usable evidence. Unknown is never treated as a match or a
					confirmed difference.
				</p>
			</div>
		</div>
	</section>

	<section class="review-panel p-6">
		<h2 class="mb-4 text-lg font-semibold">Why can every field be Unknown?</h2>
		<p class="mb-5 text-sm leading-relaxed text-ink-muted">
			The supplied synthetic dataset intentionally includes missing attachments, incomplete pairs,
			wrong document types and unreadable files. In those cases the comparison does not start, so
			all seven fields remain Unknown by design.
		</p>
		<div class="overflow-x-auto">
			<table class="w-full min-w-[680px] border-collapse text-left text-sm">
				<thead
					><tr class="border-b border-divider"
						><th class="p-3">What you see</th><th class="p-3">Likely meaning</th><th class="p-3"
							>What to do</th
						></tr
					></thead
				>
				<tbody class="text-ink-muted">
					<tr class="border-b border-divider"
						><td class="p-3">0 or 1 source document</td><td class="p-3"
							>The official sample does not contain a complete SI/BL pair.</td
						><td class="p-3">Request the missing document.</td></tr
					>
					<tr class="border-b border-divider"
						><td class="p-3">Two documents, wrong type warning</td><td class="p-3"
							>An invoice, packing list or other file replaced the expected SI or BL.</td
						><td class="p-3">Select the correct pair or request it.</td></tr
					>
					<tr class="border-b border-divider"
						><td class="p-3">Unreadable attachment warning</td><td class="p-3"
							>The file is empty, damaged, scanned without a text layer or otherwise unsupported.</td
						><td class="p-3">Inspect the original and request a readable copy.</td></tr
					>
					<tr
						><td class="p-3">Documents contain the value, but it says Not extracted</td><td
							class="p-3">The parser may not recognize that layout or label.</td
						><td class="p-3"
							>Enter a correction with its page, line or cell reference, then recheck.</td
						></tr
					>
				</tbody>
			</table>
		</div>
	</section>

	<section class="review-panel p-6">
		<h2 class="mb-4 text-lg font-semibold">Decision controls</h2>
		<ul class="space-y-3 text-sm leading-relaxed text-ink-muted">
			<li>
				<strong class="text-ink">Save corrections and recheck:</strong> recomputes the comparison from
				the selected documents and cited corrections.
			</li>
			<li>
				<strong class="text-ink">Confirm saved result:</strong> records human sign-off for the current
				saved revision. It stays disabled while evidence is unresolved or edits are unsaved.
			</li>
			<li>
				<strong class="text-ink">Request more information:</strong> records that the case cannot be completed.
				It does not send an email automatically.
			</li>
		</ul>
	</section>

	<a class="review-action inline-flex" href={resolve('/shipping')}>← Return to review queue</a>
</div>
