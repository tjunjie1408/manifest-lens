<script lang="ts">
	import EvidenceDashboard from '$lib/components/shipping/dashboard/EvidenceDashboard.svelte';
	let { data } = $props();
</script>

<EvidenceDashboard cases={data.cases} />
