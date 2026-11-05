<script lang="ts">
	import EmailSource from '#lib/components/EmailSource.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<EmailSource item={data.item} emails={data.emails} />
