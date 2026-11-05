<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { tick, untrack } from 'svelte';
	import Card from '#components/card/Card.svelte';
	import '#components/checklist/checklist.css';
	import EmptyState from '#components/empty-state/EmptyState.svelte';
	import { calendarRows, overdueRows, startDay, undatedRows } from '#lib/calendar.ts';
	import DayRowLink from '#lib/components/DayRowLink.svelte';
	import DayStats from '#lib/components/DayStats.svelte';
	import DayTimeline from '#lib/components/DayTimeline.svelte';
	import MonthCalendar from '#lib/components/MonthCalendar.svelte';
	import RunProblems from '#lib/components/RunProblems.svelte';
	import { firstName, longGerman } from '#lib/format.ts';
	import type { Briefing, Day } from '#lib/types.ts';

	let {
		briefing,
		kanzlei,
		ticked,
		failed,
		selected
	}: { briefing: Briefing; kanzlei: string; ticked: string[]; failed: boolean; selected?: string } = $props();

	const day = $derived(briefing.day);
	const rows = $derived(calendarRows(day));
	const undated = $derived(undatedRows(day));
	const overdue = $derived(overdueRows(rows));
	const openTasks = $derived(day.aufgaben.filter((row) => !ticked.includes(row.id)).length);

	// After that the lawyer picks. A click on a row does not move the calendar under the sheet.
	let picked = $state(untrack(() => startDay(rows, briefing.today, selected)));
	let timeline: DayTimeline | undefined = $state();

	// A click on the day already picked still moves the timeline back to it. The tick: an empty day is on it only once picked.
	async function pick(day: Day) {
		picked = day;
		await tick();
		timeline?.show(day);
	}
</script>

<main class="grid-page grid-full grid-window page">
	<RunProblems {failed} notRead={briefing.notRead} />

	<div class="grid-head">
		<div class="head">
			<h1 class="text-heading-24">Guten Morgen, {firstName(briefing.info.anwalt.name)}</h1>
			<p class="text-copy-14">{longGerman(briefing.today)} · Daten berechnet, bitte prüfen</p>
		</div>
	</div>

	<DayStats {rows} undated={undated.length} {openTasks} tasks={day.aufgaben.length} coverage={briefing.coverage} mails={day.postfach} />

	<div class="grid-split split">
		<div class="grid-column">
			<Card class="grid-fit" level={2} title="Heute tun" count={openTasks} unit="offen" scroll>
				{#if day.aufgaben.length === 0}
					<EmptyState line="Nichts, das heute getan werden muss." />
				{:else}
					<ul class="tasks checklist">
						{#each day.aufgaben as row (row.id)}
							{@const done = ticked.includes(row.id)}
							<li class={['task', done && 'task-done']}>
								<form
									method="POST"
									action="{resolve('/[kanzlei]/(heute)', { kanzlei })}?/tick"
									use:enhance={() =>
										async ({ update }) => {
											await update({ reset: false, navigate: false });
										}}
								>
									<input type="hidden" name="id" value={row.id} />
									<input type="hidden" name="done" value={String(!done)} />
									<button class="checklist-check" type="submit" role="checkbox" aria-checked={done} aria-label="{row.title}: erledigt">
										<span class="checklist-mark" aria-hidden="true">
											<svg viewBox="0 0 16 16"><path class="checklist-tick" pathLength="1" d="M4.5 8.2 7 10.6l4.6-5.2" /></svg>
										</span>
									</button>
								</form>
								<DayRowLink {row} {kanzlei} {selected} />
							</li>
						{/each}
					</ul>
				{/if}
			</Card>

			{#if overdue.length > 0}
				<Card class="grid-fit" level={2} title="Abgelaufen" count={overdue.length} scroll>
					<ul class="rows">
						{#each overdue as row (row.id)}
							<li><DayRowLink {row} {kanzlei} {selected} showDate /></li>
						{/each}
					</ul>
				</Card>
			{/if}

			{#if undated.length > 0}
				<Card class="grid-fit" level={2} title="Datum prüfen" count={undated.length} scroll>
					<ul class="rows">
						{#each undated as row (row.id)}
							<li><DayRowLink {row} {kanzlei} {selected} /></li>
						{/each}
					</ul>
				</Card>
			{/if}

			<DayTimeline bind:this={timeline} {rows} {picked} today={briefing.today} {kanzlei} {selected} />
		</div>

		<div class="grid-column">
			<MonthCalendar {rows} today={briefing.today} {picked} onpick={pick} />
		</div>
	</div>
</main>

<style>
	.head {
		min-width: 0;
	}

	h1 {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* The page is the window on a desktop. The timeline keeps at least half of the column, less half the 16 between the cards,
	   so a long Heute tun meets it 1:1 and scrolls inside. A short Heute tun leaves the timeline the rest.
	   A short window: under each card's least the page scrolls, so a task is never hidden. */
	.split {
		--grid-split-main: 1fr;
		--grid-split-side: 1.5fr;
	}

	.split > :first-child > :global(.grid-fill) {
		min-height: max(200px, calc(50% - var(--space-2)));
	}

	/* the head's 48 and a row */
	.split :global(.grid-fit) {
		min-height: 96px;
	}

	/* A row's hover runs to the card's edges, with no gap under the head or over the foot: the row's padding, not the body's too. */
	.rows,
	.tasks {
		margin: calc(-1 * var(--space-1)) calc(-1 * var(--card-pad)) calc(-1 * var(--space-2));
	}

	.rows > li,
	.task {
		position: relative;
	}

	.rows > li + li {
		border-top: 1px solid var(--gray-alpha-200);
	}

	/* A tick on the left. It says what to do, so it has no date. */
	.task {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		align-items: start;
		padding-left: var(--card-pad);
	}

	/* Over the row's link, which covers the whole row. */
	.task form {
		position: relative;
		z-index: 1;
		display: flex;
		padding-top: var(--space-2);
	}

	.task :global(.row) {
		padding-left: var(--space-3);
	}

	.task-done :global(.title) {
		color: var(--gray-900);
		font-weight: 400;
		text-decoration: line-through;
	}

	/* A phone: the page scrolls, and the timeline keeps a scroller of its own. */
	@media (max-width: 900px) {
		.page {
			display: grid;
			height: auto;
		}

		.page :global(:is(.grid-fit, .grid-fill)) {
			flex: none;
		}

		.split > :first-child > :global(.grid-fill) {
			max-height: 60vh;
		}
	}
</style>
