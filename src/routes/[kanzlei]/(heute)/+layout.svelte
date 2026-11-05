<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Modal from '#components/modal/Modal.svelte';
	import DayPage from '#lib/components/DayPage.svelte';
	import EmailSource from '#lib/components/EmailSource.svelte';
	import { TIER_LABELS } from '#lib/format.ts';
	import type { LayoutProps } from './$types';
	import type { PageData } from './[email]/$types';

	let { data, children }: LayoutProps = $props();

	const open = $derived(page.params.email !== undefined);
	const dayHref = $derived(resolve('/[kanzlei]/(heute)', { kanzlei: data.kanzlei }));

	// Held after the URL has left the email, so the sheet does not empty as it slides out.
	let held: { id: string; item: PageData['item']; emails: PageData['emails'] } | undefined;
	const source = $derived.by(() => {
		const { item, emails } = page.data as Partial<PageData>;
		if (page.params.email && item && emails) held = { id: page.params.email, item, emails };
		return held;
	});

	function setOpen(value: boolean) {
		if (!value && open) goto(dayHref, { reset: false });
	}
</script>

{#if data.briefing}
	<DayPage briefing={data.briefing} kanzlei={data.kanzlei} ticked={data.ticked} failed={data.failed} selected={page.params.email} />
{/if}

<!-- The key: another email opens at its top. -->
{#if source}
	{#key source.id}
		<Modal place="side" title={TIER_LABELS[source.item.tier]} closeLabel="Schließen" bind:open={() => open, setOpen}>
			<EmailSource item={source.item} emails={source.emails} sheet />
		</Modal>
	{/key}
{/if}

{@render children()}
