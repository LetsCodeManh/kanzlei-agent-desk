<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { untrack, type Snippet } from 'svelte';
	import { longGerman } from '#lib/format.ts';
	import type { Briefing, DayRow } from '#lib/types.ts';

	let {
		briefing,
		kanzlei,
		ticked,
		selected
	}: { briefing: Briefing; kanzlei: string; ticked: string[]; selected?: string } = $props();

	const day = $derived(briefing.day);
	const openTasks = $derived(day.aufgaben.filter((row) => !ticked.includes(row.id)).length);
	const warnings = $derived(day.rest.filter((row) => row.warning).length);

	const headline = $derived.by(() => {
		const parts: string[] = [];
		const firstDay = day.termineSoon[0]?.days;
		const first = day.termineSoon.filter((row) => row.days === firstDay).length;
		if (first > 0) parts.push(`${firstDay === 0 ? 'Heute' : 'Morgen'} ${first === 1 ? 'ein Termin' : `${first} Termine`}`);
		if (day.aufgaben.length > 0) {
			parts.push(openTasks === 0 ? 'alle Aufgaben erledigt' : `${openTasks} ${openTasks === 1 ? 'Aufgabe' : 'Aufgaben'} heute`);
		}
		const past = day.bald.filter((row) => (row.days ?? 0) < 0).length;
		if (past > 0) parts.push(`${past} ${past === 1 ? 'Frist' : 'Fristen'} abgelaufen`);
		const next = day.bald.find((row) => (row.days ?? 0) >= 0) ?? day.spaeter[0];
		if (next) parts.push(`nächste Frist ${next.when}`);
		const text = parts.join(', ') || 'Heute liegt nichts an';
		return text[0].toUpperCase() + text.slice(1);
	});

	const subline = $derived(
		[
			day.termineSoon.length === 0 && 'Keine Termine heute oder morgen',
			day.pruefen.length > 0 && `${day.pruefen.length} ${day.pruefen.length === 1 ? 'Fristdatum' : 'Fristdaten'} prüfen`,
			day.termineNew.length > 0 && `${day.termineNew.length} ${day.termineNew.length === 1 ? 'Termin' : 'Termine'} vom Gericht`
		]
			.filter(Boolean)
			.join(' · ')
	);

	function isCurrent(row: DayRow): boolean {
		return selected !== undefined && row.emailIds.includes(selected);
	}

	// Open at the start when the URL holds a row in here, so a reload does not hide what the panel shows.
	// After that the lawyer opens and closes it, and a click elsewhere does not move the list.
	let restOpen = $state(untrack(() => day.rest.some(isCurrent)));
</script>

{#snippet opener(row: DayRow, inner: Snippet<[DayRow]>)}
	{#if row.emailIds.length > 0}
		<!-- No scroll: the list stays where it was, under the panel. -->
		<a
			class="opener"
			href={resolve('/[kanzlei]/[email]', { kanzlei, email: row.emailIds[0] })}
			aria-current={isCurrent(row) ? 'true' : undefined}
			data-sveltekit-reset="false"
		>
			{@render inner(row)}
		</a>
	{:else}
		<div class="opener">{@render inner(row)}</div>
	{/if}
{/snippet}

{#snippet texts(row: DayRow)}
	<span class="texts">
		<span class="title-line">
			<span class="title">{row.title}</span>
			{#if row.unsure}<span class="tag tag-danger">unsicher</span>{/if}
			{#if row.warning}<span class="tag tag-warn">Warnung</span>{/if}
		</span>
		<span class="sub one-line">{row.sub}</span>
		{#each row.notes as note (note)}
			<span class={['note', row.tone === 'warn' && 'note-warn']}>{note}</span>
		{/each}
	</span>
{/snippet}

{#snippet dated(row: DayRow)}
	<span class="date-row">
		<span class={['date', row.tone]}>{row.date ?? 'offen'}</span>
		{@render texts(row)}
		<span class={['when', row.tone]}>{row.when}</span>
	</span>
{/snippet}

{#snippet ledger(rows: DayRow[])}
	<ul class="ledger">
		{#each rows as row (row.id)}
			<li>{@render opener(row, dated)}</li>
		{/each}
	</ul>
{/snippet}

{#snippet fristGroup(label: string, rows: DayRow[])}
	{#if rows.length > 0}
		<div class="group">
			<h3>{label}</h3>
			{@render ledger(rows)}
		</div>
	{/if}
{/snippet}

<main>
	{#if briefing.notRead.length > 0}
		<ul class="not-read">
			{#each briefing.notRead as email (email.id)}
				<li>
					Nicht gelesen: {[email.sender || email.id, email.subject].filter(Boolean).join(', ')}. {email.reason}. Bitte im
					Postfach selbst prüfen.
				</li>
			{/each}
		</ul>
	{/if}

	<div class="hero">
		<p class="sub">{longGerman(briefing.today)}</p>
		<h1>{headline}</h1>
		{#if subline}<p class="hero-sub">{subline}</p>{/if}
	</div>

	{#if day.termineSoon.length > 0}
		<section>
			<div class="section-head"><h2>Termine</h2></div>
			{@render ledger(day.termineSoon)}
		</section>
	{/if}

	<section>
		<div class="section-head">
			<h2>Heute tun</h2>
			<span class="sub">{openTasks} offen</span>
		</div>
		{#if day.aufgaben.length === 0}
			<p class="sub">Nichts, das heute getan werden muss.</p>
		{:else}
			<ul class="tasks">
				{#each day.aufgaben as row (row.id)}
					{@const done = ticked.includes(row.id)}
					<li class={['task', done && 'task-done']}>
						<form
							method="POST"
							action="{resolve('/[kanzlei]', { kanzlei })}?/tick"
							use:enhance={() =>
								async ({ update }) => {
									await update({ reset: false, navigate: false });
								}}
						>
							<input type="hidden" name="id" value={row.id} />
							<label class="check">
								<input
									type="checkbox"
									name="done"
									value="true"
									aria-label="{row.title}: erledigt"
									checked={done}
									onchange={(event) => event.currentTarget.form?.requestSubmit()}
								/>
							</label>
						</form>
						{@render opener(row, texts)}
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	{#if day.pruefen.length + day.bald.length + day.spaeter.length > 0}
		<section>
			<div class="section-head">
				<h2>Fristen</h2>
				<span class="sub">Daten berechnet, bitte prüfen</span>
			</div>
			<div class="groups">
				{@render fristGroup('Datum prüfen', day.pruefen)}
				{@render fristGroup('Nächste 7 Tage', day.bald)}
				{@render fristGroup('Später', day.spaeter)}
			</div>
		</section>
	{/if}

	{#if day.termineNew.length > 0}
		<section>
			<div class="section-head"><h2>Neue Termine vom Gericht</h2></div>
			{@render ledger(day.termineNew)}
		</section>
	{/if}

	{#if day.rest.length > 0}
		<details class="section" bind:open={restOpen}>
			<summary>
				<h2>Weitere E-Mails</h2>
				<span class="sub">{day.rest.length}{warnings > 0 ? `, ${warnings} mit Warnung` : ''}</span>
			</summary>
			<ul class="rest">
				{#each day.rest as row (row.id)}
					<li>{@render opener(row, texts)}</li>
				{/each}
			</ul>
		</details>
	{/if}
</main>

<style>
	main {
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
		width: min(100%, 720px);
		margin-inline: auto;
		padding: var(--space-6) var(--space-5);
	}

	.not-read {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		color: var(--danger);
		font-weight: 600;
	}

	/* The day's answer */
	.hero {
		display: grid;
		gap: var(--space-1);
	}

	h1 {
		font-size: 24px;
		line-height: 32px;
		font-weight: 600;
		letter-spacing: -0.01em;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.hero-sub {
		color: var(--ink-2);
	}

	/* Sections */
	section {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.section-head {
		display: flex;
		align-items: baseline;
		gap: var(--space-3);
	}

	h2 {
		font-size: 15px;
		line-height: 20px;
		font-weight: 600;
	}

	h3 {
		color: var(--ink-2);
		font-size: 12px;
		line-height: 16px;
		font-weight: 600;
	}

	.groups {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	.group {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	summary {
		cursor: pointer;
	}

	summary h2,
	summary .sub {
		display: inline;
	}

	summary .sub {
		padding-left: var(--space-2);
	}

	/* A row */
	.opener {
		display: block;
		width: 100%;
		min-width: 0;
		padding: var(--space-2);
		border-radius: 6px;
	}

	a.opener:hover {
		background: var(--surface-hover);
	}

	a.opener[aria-current] {
		background: var(--surface-selected);
	}

	.texts {
		display: grid;
		gap: 2px;
		min-width: 0;
	}

	.title-line {
		display: flex;
		align-items: baseline;
		gap: var(--space-2);
		min-width: 0;
	}

	.title {
		display: block;
		min-width: 0;
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.one-line {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.note {
		display: block;
		color: var(--ink-2);
		font-size: 13px;
		line-height: 18px;
	}

	.note-warn {
		color: var(--warn-ink);
		font-weight: 500;
	}

	/* Heute tun: a tick on the left. It says what to do, so it has no date. */
	.tasks {
		display: flex;
		flex-direction: column;
	}

	.task {
		display: grid;
		grid-template-columns: 28px minmax(0, 1fr);
		align-items: start;
	}

	.check {
		display: grid;
		place-items: center;
		height: 36px; /* centred on the title's line, with the row's padding */
		cursor: pointer;
	}

	.check input {
		appearance: none;
		width: 18px;
		height: 18px;
		margin: 0;
		border: 1.5px solid var(--ink-2);
		border-radius: 50%;
		background: var(--surface) center / 12px no-repeat;
		cursor: pointer;
		transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1);
	}

	.check input:active {
		transform: scale(0.9);
	}

	.check input:checked {
		border-color: var(--accent);
		background-color: var(--accent);
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M2.5 6.5 5 9l4.5-5.5'/%3E%3C/svg%3E");
	}

	.task-done .title {
		color: var(--ink-2);
		font-weight: 400;
		text-decoration: line-through;
	}

	/* Fristen: a ledger. The date first, the distance last, a hairline between rows. No tick: a Frist is struck after its check. */
	.ledger {
		display: flex;
		flex-direction: column;
	}

	.ledger li + li {
		border-top: 1px solid var(--line);
	}

	.date-row {
		display: grid;
		grid-template-columns: 76px minmax(0, 1fr) 84px;
		column-gap: var(--space-3);
		align-items: baseline;
	}

	.date {
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.when {
		color: var(--ink-2);
		font-size: 13px;
		font-variant-numeric: tabular-nums;
		text-align: right;
		white-space: nowrap;
	}

	.danger {
		color: var(--danger);
		font-weight: 600;
	}

	.warn {
		color: var(--warn-ink);
	}

	.rest {
		display: flex;
		flex-direction: column;
		padding-top: var(--space-2);
	}
</style>
