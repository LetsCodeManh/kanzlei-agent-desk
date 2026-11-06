<!--
	The connectors of the Postfach, opened from its account tile. Simulated, as every action in the Postfach: "Verbinden" asks
	for no login and no mail comes from it, so an added one must not read like an empty inbox.
-->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import Button from '#components/button/Button.svelte';
	import ListSection from '#components/list/ListSection.svelte';
	import Modal from '#components/modal/Modal.svelte';
	import SettingRow from '#components/setting-row/SettingRow.svelte';
	import Tag from '#components/tag/Tag.svelte';
	import { ADDABLE } from '#lib/connectors.ts';
	import type { Kanzlei } from '#lib/types.ts';

	let {
		open = $bindable(false),
		kanzlei,
		info,
		added,
		outlook,
		bea
	}: { open?: boolean; kanzlei: string; info: Kanzlei; added: string[]; outlook: number; bea: number } = $props();

	const connected = $derived(ADDABLE.filter((connector) => added.includes(connector.id)));
	const free = $derived(ADDABLE.filter((connector) => !added.includes(connector.id)));
	let failed = $state(false);

	const emails = (count: number) => `${count} ${count === 1 ? 'E-Mail' : 'E-Mails'}`;
</script>

{#snippet toggle(id: string, action: 'connect' | 'disconnect', label: string, name: string)}
	<form
		method="POST"
		action="{resolve('/[kanzlei]/postfach', { kanzlei })}?/{action}"
		use:enhance={() =>
			async ({ result, update }) => {
				failed = result.type === 'failure' || result.type === 'error';
				await update({ reset: false, navigate: false });
			}}
	>
		<input type="hidden" name="id" value={id} />
		<Button type="submit" size="small" aria-label="{name}: {label}">{label}</Button>
	</form>
{/snippet}

<Modal bind:open title="Verbundene Konten" size="wide" closeLabel="Schließen">
	<ListSection title="Verbunden">
		<div class="setting-row-list">
			<SettingRow label="Microsoft 365 / Outlook" sub="{info.anwalt.address}. {emails(outlook)}.">
				<Tag>simuliert</Tag>
			</SettingRow>
			<SettingRow label="beA" sub="Echt nur über die Kanzleisoftware, mit eigener Karte. {emails(bea)}.">
				<Tag>simuliert</Tag>
			</SettingRow>
			<SettingRow label="Akten und Termine" sub="Echt aus der Kanzleisoftware, nur lesend. In dieser Demo eine Datei.">
				<Tag>simuliert</Tag>
			</SettingRow>
			{#each connected as connector (connector.id)}
				<SettingRow label={connector.name} sub="Verbunden (simuliert). Keine Demo-E-Mails dahinter.">
					{@render toggle(connector.id, 'disconnect', 'Trennen', connector.name)}
				</SettingRow>
			{/each}
		</div>
	</ListSection>

	{#if free.length > 0}
		<ListSection title="Hinzufügen">
			<div class="setting-row-list">
				{#each free as connector (connector.id)}
					<SettingRow label={connector.name} sub={connector.line}>
						{@render toggle(connector.id, 'connect', 'Verbinden', connector.name)}
					</SettingRow>
				{/each}
			</div>
		</ListSection>
	{/if}

	{#if failed}
		<p class="error" role="alert">Das hat nicht geklappt. Bitte noch einmal versuchen.</p>
	{/if}
	<p class="note">Es liest nur: Von selbst sendet, verschiebt und löscht es nichts.</p>
</Modal>

<style>
	.error {
		color: var(--red-900);
		font-weight: 600;
	}

	.note {
		color: var(--gray-900);
		font-size: 13px;
		line-height: 18px;
	}
</style>
