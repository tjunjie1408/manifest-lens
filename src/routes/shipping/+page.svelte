<script lang="ts">
	import ReviewQueue from '$lib/components/shipping/queue/ReviewQueue.svelte';
	let { data } = $props();
</script>

<ReviewQueue {data} />
