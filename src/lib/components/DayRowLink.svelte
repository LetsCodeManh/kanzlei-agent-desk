<script lang="ts">
	import { resolve } from '$app/paths';
	import Tag from '#components/tag/Tag.svelte';
	import type { DayRow } from '#lib/types.ts';

	/**
	 * One row on "Heute". A row with an email opens it in the sheet. A row from the case list has nothing to open.
	 * Its list item must be positioned: the link's ::after covers all of it, so the whole row is the target and the hover.
	 */
	let {
		row,
		kanzlei,
		selected,
		termin = false,
		showDate = false
	}: { row: DayRow; kanzlei: string; selected?: string; termin?: boolean; showDate?: boolean } = $props();

	const current = $derived(selected !== undefined && row.emailIds.includes(selected));
</script>

{#snippet inner()}
	{#if showDate}<span class={['date', row.tone]}>{row.date}</span>{/if}
	<span class="texts">
		<span class="title-line">
			<span class="title">{row.title}</span>
			{#if termin}<Tag>Termin</Tag>{/if}
			{#if row.unsure}<Tag tone="error">unsicher</Tag>{/if}
			{#if row.warning}<Tag tone="warning">Warnung</Tag>{/if}
		</span>
		<span class="sub one-line">{row.sub}</span>
		{#each row.notes as note (note)}
			<span class={['note', row.tone === 'warn' && 'note-warn']}>{note}</span>
		{/each}
	</span>
	{#if row.when}<span class={['when', row.tone]}>{row.when}</span>{/if}
{/snippet}

{#if row.emailIds.length > 0}
	<!-- No scroll: the page stays where it was, under the sheet. -->
	<a
		class={['row', showDate && 'row-date']}
		href={resolve('/[kanzlei]/(heute)/[email]', { kanzlei, email: row.emailIds[0] })}
		aria-current={current ? 'true' : undefined}
		data-sveltekit-reset="false"
	>
		{@render inner()}
	</a>
{:else}
	<div class={['row', showDate && 'row-date']}>{@render inner()}</div>
{/if}

<style>
	.row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		column-gap: var(--space-3);
		align-items: baseline;
		min-width: 0;
		padding: var(--space-2) var(--space-4);
	}

	.row-date {
		grid-template-columns: 72px minmax(0, 1fr) auto;
	}

	a.row::after {
		content: '';
		position: absolute;
		inset: 0;
		transition: background-color var(--duration-hover) var(--ease-out);
	}

	a.row:hover::after,
	a.row[aria-current]::after {
		background: var(--gray-alpha-100);
	}

	a.row:focus-visible {
		outline: none;
	}

	a.row:focus-visible::after {
		outline: 2px solid var(--focus-ring);
		outline-offset: -2px;
	}

	.texts {
		display: grid;
		gap: var(--space-0-5);
		min-width: 0;
	}

	.title-line {
		display: flex;
		align-items: baseline;
		gap: var(--space-2);
		min-width: 0;
	}

	.title {
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
		color: var(--gray-900);
		font-size: 13px;
		line-height: 18px;
	}

	.note-warn {
		color: var(--amber-900);
		font-weight: 500;
	}

	.date {
		font-weight: 500;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.when {
		color: var(--gray-900);
		font-size: 13px;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.danger {
		color: var(--red-900);
		font-weight: 500;
	}

	.date.warn {
		color: var(--amber-900);
	}
</style>
