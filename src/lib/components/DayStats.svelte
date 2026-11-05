<!--
	Four figures on top of "Heute". Two have a target, so a ring: the day's tasks and the emails read.
	Two say what comes next, so no ring. Overdue Fristen sort first, so "Nächste Frist" cannot hide one behind a later one.
-->
<script lang="ts">
	import Stat from '#components/stat/Stat.svelte';
	import type { CalendarRow } from '#lib/calendar.ts';
	import type { Coverage, MailRow } from '#lib/types.ts';

	let {
		rows,
		undated,
		openTasks,
		tasks,
		coverage,
		mails
	}: { rows: CalendarRow[]; undated: number; openTasks: number; tasks: number; coverage: Coverage; mails: MailRow[] } = $props();

	const termin = $derived(rows.find((row) => row.kind === 'termin' && (row.days ?? -1) >= 0));
	const frist = $derived(rows.find((row) => row.kind === 'frist'));
	const emails = $derived(coverage.read + coverage.notRead);
	const landed = $derived(mails.filter((mail) => mail.labels.length > 0).length);

	const percent = (part: number, whole: number) => (whole === 0 ? 0 : Math.round((part / whole) * 100));
	const near = (row: CalendarRow) => row.days !== null && row.days <= 1;
</script>

<div class="stat-row tiles" data-even>
	<Stat
		label="Aufgaben heute"
		status={tasks === 0 ? 'empty' : openTasks === 0 ? 'done' : 'on-track'}
		fig={String(openTasks)}
		denom="offen"
		meta={tasks === 0 ? 'Nichts zu tun' : `${tasks - openTasks} von ${tasks} erledigt`}
		value={percent(tasks - openTasks, tasks)}
	/>

	{#if termin}
		<Stat
			label="Nächster Termin"
			status="on-track"
			fig={termin.time ?? termin.date ?? ''}
			denom={termin.time && !near(termin) ? (termin.date ?? '') : termin.when}
			meta={termin.title}
			title={termin.title}
		/>
	{:else}
		<Stat label="Nächster Termin" status="empty" fig="–" meta="Keine Termine" />
	{/if}

	{#if frist}
		<Stat
			label="Nächste Frist"
			status={near(frist) ? 'over' : 'on-track'}
			sub={undated > 0 ? `${undated} ohne Datum` : undefined}
			fig={frist.date ?? ''}
			denom={frist.when}
			meta={frist.title}
			title={frist.title}
		/>
	{:else}
		<Stat label="Nächste Frist" status="empty" sub={undated > 0 ? `${undated} ohne Datum` : undefined} fig="–" meta="Keine Fristen" />
	{/if}

	<Stat
		label="E-Mails gelesen"
		status={emails === 0 ? 'empty' : coverage.notRead > 0 ? 'over' : 'done'}
		fig={String(coverage.read)}
		denom="/ {emails}"
		meta={coverage.notRead > 0 ? `${coverage.notRead} nicht gelesen` : `${landed} davon auf Heute`}
		value={percent(coverage.read, emails)}
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
