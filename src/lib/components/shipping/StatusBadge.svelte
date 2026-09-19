<script lang="ts">
	let { value }: { value: string } = $props();
	const names: Record<string, string> = {
		OK: 'Fields match',
		MISMATCH: 'Differences found',
		NEEDS_REVIEW: 'Needs evidence',
		NOT_APPLICABLE: 'Not applicable',
		PENDING: 'Awaiting review',
		CONFIRMED_MATCH: 'Match confirmed',
		CONFIRMED_MISMATCH: 'Amendment needed',
		REQUESTED_INFO: 'Information requested',
		CONFIRMED_NOT_APPLICABLE: 'Not applicable · confirmed',
		match: 'Match',
		mismatch: 'Difference',
		unknown: 'Unknown'
	};
	const tone = $derived(
		['OK', 'match', 'CONFIRMED_MATCH'].includes(value)
			? 'match'
			: ['MISMATCH', 'mismatch', 'CONFIRMED_MISMATCH'].includes(value)
				? 'difference'
				: ['NEEDS_REVIEW', 'unknown', 'REQUESTED_INFO'].includes(value)
					? 'unknown'
					: 'neutral'
	);
</script>

<span class="review-badge" data-tone={tone}>{names[value] ?? value}</span>
