<!--
	Four figures on top of the Postfach: which account is connected, how many emails, how many the lawyer has not opened,
	how many reach "Heute". "Ungelesen" is the lawyer's own. What the briefing read is `coverage`, said in the page's head.
-->
<script lang="ts">
	import Stat from '#components/stat/Stat.svelte';
	import type { Kanzlei, MailLabel, MailRow } from '#lib/types.ts';

	let { info, mails, read, notRead }: { info: Kanzlei; mails: MailRow[]; read: string[]; notRead: number } = $props();

	const total = $derived(mails.length);
	const bea = $derived(mails.filter((mail) => mail.channel === 'bea').length);
	const opened = $derived(mails.filter((mail) => read.includes(mail.id)).length);
	const landed = $derived(mails.filter((mail) => mail.labels.length > 0).length);
	const unread = $derived(total - opened);

	function counted(label: MailLabel, plural: string): string {
		const count = mails.filter((mail) => mail.labels.includes(label)).length;
		return `${count} ${count === 1 ? label : plural}`;
	}
	const landedLine = $derived([counted('Aufgabe', 'Aufgaben'), counted('Frist', 'Fristen'), counted('Termin', 'Termine')].join(' · '));
</script>

<div class="stat-row tiles" data-even>
	<Stat
		label="Verbundenes Konto"
		status="on-track"
		sub="simuliert"
		fig="Outlook"
		denom="+ beA"
		meta={info.anwalt.address}
		title={info.anwalt.address}
	/>

	<Stat
		label="E-Mails"
		status={total === 0 ? 'empty' : notRead > 0 ? 'over' : 'on-track'}
		sub={notRead > 0 ? `${notRead} nicht lesbar` : undefined}
		fig={String(total)}
		meta="{total - bea} Outlook · {bea} beA"
	/>

	<Stat
		label="Ungelesen"
		status={total === 0 ? 'empty' : unread === 0 ? 'done' : 'on-track'}
		fig={String(unread)}
		denom="/ {total}"
		meta={unread === 0 ? 'Alle geöffnet' : `${opened} geöffnet`}
		value={total === 0 ? 0 : Math.round((opened / total) * 100)}
	/>

	<Stat
		label="Auf Heute"
		status={landed === 0 ? 'empty' : 'on-track'}
		fig={String(landed)}
		denom="/ {total}"
		meta={landedLine}
		title={landedLine}
	/>
</div>

<style>
	/* A title holds one line. stat.css lets a meta wrap, and its readout grow to the longest word. */
	.tiles :global(.stat-readout) {
		min-width: 0;
	}

	.tiles :global(.stat-meta) {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
