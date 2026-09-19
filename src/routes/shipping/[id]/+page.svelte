<script lang="ts">
	import ReviewWorkspace from '$lib/components/shipping/review/ReviewWorkspace.svelte';
	let { data, form } = $props();
</script>

<ReviewWorkspace {data} {form} />
