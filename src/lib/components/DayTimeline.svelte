<!--
	Every day with something on it, in order, in one scroller. Each day runs top to bottom on one line: what has no time
	first, then by the clock. A list, not a scale of hours: a lawyer's day here has three things on it, and a scale would be
	mostly empty. There is no "now": the day is simulated. It opens at the day picked; the days before it are above.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import Card from '#components/card/Card.svelte';
	import EmptyState from '#components/empty-state/EmptyState.svelte';
	import ListGroup from '#components/list/ListGroup.svelte';
	import StatusDot from '#components/status-dot/StatusDot.svelte';
	import { addDays, timelineDays, timelineRows, type CalendarRow } from '#lib/calendar.ts';
	import DayRowLink from '#lib/components/DayRowLink.svelte';
	import { longGerman } from '#lib/format.ts';
	import type { Day } from '#lib/types.ts';

	let { rows, picked, today, kanzlei, selected }: { rows: CalendarRow[]; picked: Day; today: Day; kanzlei: string; selected?: string } = $props();

	let list: HTMLElement | undefined = $state();

	const days = $derived(timelineDays(rows, picked));

	/** Puts a day at the scroller's top, or as near as the rows below it allow. It moves this scroller alone, never the page. */
	export function show(day: Day, behavior: ScrollBehavior = 'smooth') {
		const section = list?.querySelector(`[data-day="${day}"]`);
		const scroller = section?.closest('.card-scroll');
		if (!section || !scroller) return;
		// The first day goes to 0, over the body's padding: scrolled at all, the card's head casts a shadow over nothing.
		const top = section === list?.firstElementChild ? 0 : scroller.scrollTop + section.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
		scroller.scrollTo({ top, behavior });
	}

	onMount(() => show(picked, 'instant'));

	function near(day: Day) {
		return day === today ? 'Heute' : day === addDays(today, 1) ? 'Morgen' : undefined;
	}

	function tone(row: CalendarRow) {
		return row.tone === 'danger' ? 'error' : row.tone === 'warn' ? 'warning' : 'neutral';
	}
</script>

<Card class="grid-fill" level={2} title="Zeitleiste" count={rows.length} scroll>
	<div class="days" bind:this={list}>
		{#each days as day (day)}
			{@const entries = timelineRows(rows, day)}
			<section class="day" data-day={day} data-picked={day === picked || undefined}>
				<ListGroup role="heading" aria-level={3} name={longGerman(day)} count={near(day)} />
				{#if entries.length === 0}
					<EmptyState line="Nichts an diesem Tag." />
				{:else}
					<ol class="timeline">
						{#each entries as row (row.id)}
							<li class="entry">
								<span class="time">{row.time ?? (row.kind === 'frist' ? 'Frist' : 'Ohne Zeit')}</span>
								<span class="mark" aria-hidden="true">
									{#if row.kind === 'frist'}
										<StatusDot tone={tone(row)} />
									{:else}
										<span class={['dot', row.kind === 'ereignis' && 'dot-open']}></span>
									{/if}
								</span>
								<DayRowLink {row} {kanzlei} {selected} termin={row.kind === 'termin'} />
							</li>
						{/each}
					</ol>
				{/if}
			</section>
		{/each}
	</div>
</Card>

<style>
	/* To the card's edges, top and bottom too: a row's hover does, and a date held at the top covers the rows passing under it. */
	.days {
		display: grid;
		gap: var(--space-2);
		margin: calc(-1 * var(--space-1)) calc(-1 * var(--card-pad)) calc(-1 * var(--space-2));
	}

	.day :global(.list-group) {
		position: sticky;
		/* Held inside the scroller's padding: at 0 the rows would show in a slit over the date. */
		top: calc(-1 * var(--space-1));
		z-index: 1;
		padding: var(--space-2) var(--card-pad) var(--space-1);
		background: var(--background-100);
	}

	.day[data-picked] :global(.list-group) {
		color: var(--gray-1000);
		font-weight: 500;
	}

	.timeline {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.entry {
		position: relative;
		display: grid;
		grid-template-columns: 64px 16px minmax(0, 1fr);
		padding-left: var(--space-4);
	}

	.entry :global(.row) {
		padding-left: var(--space-2);
	}

	/* Level with the row's title: the row's own top padding and its 20px line. */
	.time {
		padding-top: var(--space-2);
		color: var(--gray-900);
		font-size: 13px;
		line-height: 20px;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	/* 18 = the row's 8 of padding plus half the title's 20px line: the centre of the first line. */
	.mark {
		--timeline-at: 18px;
		position: relative;
		display: flex;
		justify-content: center;
		align-items: center;
		height: 100%;
	}

	.mark::before {
		content: '';
		position: absolute;
		inset-block: 0;
		left: 50%;
		width: 1px;
		background: var(--gray-alpha-400);
	}

	.entry:first-child .mark::before {
		top: var(--timeline-at);
	}

	.entry:last-child .mark::before {
		bottom: calc(100% - var(--timeline-at));
	}

	.mark > :global(*) {
		position: absolute;
		top: var(--timeline-at);
		translate: 0 -50%;
		/* the card's background, so the dot cuts the line */
		box-shadow: 0 0 0 2px var(--background-100);
	}

	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--gray-1000);
	}

	/* A thing from an email is not the lawyer's own: a ring, not a dot. */
	.dot-open {
		background: var(--background-100);
		outline: 1px solid var(--gray-700);
		outline-offset: -1px;
	}
</style>
