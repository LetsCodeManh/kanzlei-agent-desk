<script lang="ts">
	import MailReader from '#lib/components/MailReader.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<!-- The key: another email opens at its top, with no draft of the last one. -->
{#key data.emails[0].email.id}
	<MailReader item={data.item} emails={data.emails} mailbox={data.mailbox} draft={data.draft} />
{/key}
