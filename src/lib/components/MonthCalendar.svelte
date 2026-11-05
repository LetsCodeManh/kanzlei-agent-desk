<!--
	The month as a calendar draws it: six weeks, Monday first, each day a tile with what is on it.
	A Termin is a band, a Frist a dot in its tone, a thing from an email plain text. A tile shows three at most, fewer when the window is short, and says how many more: the timeline lists them all.
	Too short for one line, a tile is its date and a count.
	The arrows move between days (one tab stop). The grid is this screen's own.
-->
<script lang="ts">
	import { untrack } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import Button from '#components/button/Button.svelte';
	import Card from '#components/card/Card.svelte';
	import Icon from '#components/icon/Icon.svelte';
	import StatusDot from '#components/status-dot/StatusDot.svelte';
	import { firstDayOf, monthDays, monthsCovered, type CalendarRow } from '#lib/calendar.ts';
	import { longGerman, monthGerman } from '#lib/format.ts';
	import type { Day } from '#lib/types.ts';

	let { rows, today, picked, onpick }: { rows: CalendarRow[]; today: Day; picked: Day; onpick: (day: Day) => void } = $props();

	const SHOWN = 3;
	// As the CSS below: six rows 6 apart, a tile's 8 of padding, its date's 24 and 4 under it, and a line of 18 with 2 between.
	const TILE_GAP = 6;
	const TILE_CHROME = 36;
	const LINE = 20;
	// As the media query below: narrow, a tile takes the height it needs.
	const narrow = new MediaQuery('max-width: 900px', false);
	const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
	const KINDS = { termin: 'Termin', frist: 'Frist', ereignis: 'Aus einer E-Mail' };
	const MOVES: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };

	let month = $state(untrack(() => picked.slice(0, 7)));
	let focused = $state<number | null>(null);
	let gridHeight = $state(0);

	const months = $derived(monthsCovered(rows, today));
	const at = $derived(months.indexOf(month));
	const days = $derived(monthDays(month));
	const offView = $derived(rows.filter((row) => row.iso < days[0] || row.iso > days[41]).length);
	const stop = $derived(focused ?? Math.max(days.indexOf(picked), 0));
	const tile = $derived((gridHeight - 5 * TILE_GAP) / 6);
	const lines = $derived(narrow.current || gridHeight === 0 ? SHOWN : Math.min(SHOWN, Math.max(0, Math.floor((tile - TILE_CHROME + 2) / LINE))));

	function turn(by: number) {
		month = months[at + by];
		onpick(firstDayOf(month, rows, today));
		focused = null;
	}

	function on(day: Day): CalendarRow[] {
		return rows.filter((row) => row.iso === day);
	}

	function dot(row: CalendarRow, past: boolean) {
		if (past) return 'muted';
		return row.tone === 'danger' ? 'error' : row.tone === 'warn' ? 'warning' : 'neutral';
	}

	function label(day: Day, list: CalendarRow[]): string {
		const what = list.length > 0 ? list.map((row) => `${KINDS[row.kind]}: ${row.title}`).join('; ') : 'nichts';
		return `${longGerman(day)}${day === today ? ', heute' : ''}, ${what}`;
	}

	function onkeydown(event: KeyboardEvent & { currentTarget: HTMLButtonElement }, index: number) {
		const to = event.key in MOVES ? index + MOVES[event.key] : event.key === 'Home' ? index - (index % 7) : event.key === 'End' ? index - (index % 7) + 6 : null;
		if (to === null) return;
		event.preventDefault();
		if (to < 0 || to >= days.length) return;
		focused = to;
		event.currentTarget.closest('ol')?.querySelectorAll('button')[to].focus();
	}
</script>

{#snippet actions()}
	<Button size="small" aria-label="Monat zurück" disabled={at <= 0} onclick={() => turn(-1)}>
		{#snippet icon()}<Icon name="chevron-left" />{/snippet}
	</Button>
	<Button size="small" aria-label="Monat vor" disabled={at >= months.length - 1} onclick={() => turn(1)}>
		{#snippet icon()}<Icon name="chevron-right" />{/snippet}
	</Button>
{/snippet}

<Card class="grid-fill" fill level={2} title={monthGerman(month)} sub={offView > 0 ? `${offView} außerhalb dieser Ansicht` : ''} {actions}>
	<div class="month">
		<div class="weekdays" aria-hidden="true">
			{#each WEEKDAYS as weekday (weekday)}<span>{weekday}</span>{/each}
		</div>
		<ol class="days" data-tight={lines === 0 || undefined} bind:clientHeight={gridHeight}>
			{#each days as day, index (day)}
				{@const list = on(day)}
				{@const past = day < today}
				{@const fits = list.length > lines ? Math.max(lines - 1, 0) : lines}
				<li>
					<button
						class="day"
						type="button"
						aria-pressed={day === picked}
						aria-current={day === today ? 'date' : undefined}
						aria-label={label(day, list)}
						tabindex={index === stop ? 0 : -1}
						data-out={day.slice(0, 7) !== month || undefined}
						data-past={past || undefined}
						onkeydown={(event) => onkeydown(event, index)}
						onclick={() => {
							onpick(day);
							focused = null;
						}}
					>
						<span class="date" aria-hidden="true">{+day.slice(8)}</span>
						{#if list.length > 0}
							<span class="events">
								{#each list.slice(0, fits) as row (row.id)}
									<span class="event" data-termin={row.kind === 'termin' || undefined} title={row.title}>
										{#if row.kind === 'frist'}<StatusDot tone={dot(row, past)} />{/if}
										<span class="event-name">{row.title}</span>
									</span>
								{/each}
								{#if list.length > fits}<span class="more">{lines === 0 ? list.length : `${list.length - fits} weitere`}</span>{/if}
							</span>
						{/if}
					</button>
				</li>
			{/each}
		</ol>
	</div>
</Card>

<style>
	.month {
		display: flex;
		flex-direction: column;
		height: 100%;
		padding: var(--space-3);
	}

	.weekdays,
	.days {
		display: grid;
		grid-template-columns: repeat(7, minmax(0, 1fr));
		column-gap: var(--space-1-5);
	}

	.weekdays span {
		padding: 0 var(--space-2) var(--space-2);
		color: var(--gray-900);
		font-size: 12px;
		line-height: 16px;
	}

	.days {
		flex: 1;
		min-height: 0;
		grid-template-rows: repeat(6, minmax(0, 1fr));
		row-gap: var(--space-1-5);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.days > li {
		min-height: 0;
	}

	.day {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		width: 100%;
		height: 100%;
		min-width: 0;
		margin: 0;
		padding: var(--space-1);
		overflow: hidden;
		border: 0;
		border-radius: var(--radius-medium);
		background: var(--background-100);
		box-shadow: 0 0 0 1px var(--gray-alpha-200);
		color: var(--gray-1000);
		font: inherit;
		letter-spacing: inherit;
		text-align: left;
		cursor: pointer;
		transition: box-shadow var(--duration-hover) var(--ease-out);
	}

	.days[data-tight] .day {
		flex-direction: row;
		align-items: center;
	}

	.day:hover {
		box-shadow: var(--shadow-small);
	}

	/* picked: --shadow-large's drop, its ring at 600 */
	.day[aria-pressed='true'] {
		box-shadow:
			0 0 0 1px var(--gray-alpha-600),
			0 2px 2px rgb(0 0 0 / 0.04),
			0 8px 16px -4px rgb(0 0 0 / 0.08);
	}

	.day:focus-visible {
		outline: 2px solid var(--focus-ring);
		outline-offset: 2px;
	}

	.day[data-past]:not([data-out]) {
		background: var(--background-200);
	}

	.day[data-out] {
		background: none;
		box-shadow: none;
	}

	.day[data-out]:hover {
		background: var(--gray-alpha-100);
	}

	.day[data-out][aria-pressed='true'] {
		box-shadow: 0 0 0 1px var(--gray-alpha-400);
	}

	.day:is([data-past], [data-out]) .date,
	.day:is([data-past], [data-out]) .event {
		color: var(--gray-900);
	}

	.date {
		flex: none;
		width: 24px;
		height: 24px;
		border-radius: 999px;
		font-size: 13px;
		line-height: 24px;
		text-align: center;
		font-variant-numeric: tabular-nums;
	}

	.day[aria-current='date'] .date {
		background: var(--gray-1000);
		color: var(--background-100);
		font-weight: 500;
	}

	.events {
		display: flex;
		flex-direction: column;
		gap: var(--space-0-5);
		min-width: 0;
	}

	.event {
		display: flex;
		align-items: center;
		gap: var(--space-1-5);
		min-width: 0;
		height: 18px;
		padding: 0 var(--space-1);
		border-radius: 4px;
		font-size: 12px;
		line-height: 18px;
		white-space: nowrap;
	}

	.event[data-termin] {
		background: var(--gray-200);
		font-weight: 500;
	}

	.event-name {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		mask-image: linear-gradient(to right, #000 calc(100% - 16px), transparent);
	}

	.more {
		padding: 0 var(--space-1);
		color: var(--gray-900);
		font-size: 12px;
		line-height: 18px;
	}

	@media (max-width: 900px) {
		.days {
			grid-template-rows: repeat(6, minmax(72px, auto));
		}
	}
</style>
