<script lang="ts">
	import { resolve } from '$app/paths';
	import { untrack } from 'svelte';
	import { fileLabel, shortGerman, shownEnd } from '#lib/format.ts';
	import type { Briefing, HeuteLine, RankedItem } from '#lib/types.ts';
	import Row from './Row.svelte';

	let { briefing, kanzlei, selected }: { briefing: Briefing; kanzlei: string; selected?: string } = $props();

	const ranked = $derived(briefing.items.filter((item) => item.tier < 6));
	const rest = $derived(briefing.items.filter((item) => item.tier === 6));
	const warnings = $derived(rest.filter((item) => item.injection).length);
	const heute = $derived(
		[
			{ label: 'Termine', lines: briefing.heute.termine, always: true },
			{ label: 'Heute tun', lines: briefing.heute.tun, always: false },
			{ label: 'Prüfen', lines: briefing.heute.pruefen, always: false },
			{ label: 'Bald', lines: briefing.heute.bald, always: false }
		].filter((group) => group.always || group.lines.length > 0)
	);

	const emailIds = (item: RankedItem) => item.emails.map((email) => email.id);

	// Open at the start when the URL holds an item in here, so a reload does not hide what is on the right.
	// After that the lawyer opens and closes it, and a click elsewhere does not move the list.
	let restOpen = $state(untrack(() => rest.some((item) => isCurrent(emailIds(item)))));

	function hrefOf(ids: string[]): string | undefined {
		return ids.length > 0 ? resolve('/[kanzlei]/[email]', { kanzlei, email: ids[0] }) : undefined;
	}

	function isCurrent(ids: string[]): boolean {
		return selected !== undefined && ids.includes(selected);
	}

	/** A line in "Heute" is only text: its item says whether a fact in it failed its quote check. */
	function lineUnsure({ emailIds: ids }: HeuteLine): boolean {
		return briefing.items.some((item) => item.unsicher.length > 0 && emailIds(item).some((id) => ids.includes(id)));
	}
</script>

{#snippet itemRow(item: RankedItem)}
	{@const ids = emailIds(item)}
	<Row href={hrefOf(ids)} current={isCurrent(ids)}>
		<span class="grid">
			{#each item.fristen as frist, index (index)}
				{@const end = shownEnd(frist)}
				{@const urgent = frist.daysLeft !== null && frist.daysLeft <= 1}
				<span class={['date', urgent && 'urgent']}>{end ? shortGerman(end) : 'offen'}</span>
				<span class="text">
					<span class="title">{frist.what}</span>
					<span class="sub">
						{[fileLabel(item), frist.reason, frist.hint].filter(Boolean).join(' · ')}
						{#if ids.length === 0}<span class="tag">aus der Akte</span>{/if}
						{#if !frist.quoteOk}<span class="tag tag-danger">unsicher</span>{/if}
					</span>
				</span>
				<span class={['days', urgent && 'urgent']}>{frist.daysLeft ?? ''}</span>
			{:else}
				<span></span>
				<span class="text">
					<span>{item.summary}</span>
					<span class="sub">
						{fileLabel(item)}
						{#if item.unsicher.length > 0}<span class="tag tag-danger">unsicher</span>{/if}
					</span>
				</span>
				<span></span>
			{/each}
			{#if item.role === 'court'}
				{#each item.events as hearing, index (index)}
					<span></span>
					<span class="sub">Termin: {hearing.date_text}{hearing.oldDate ? `, vorher ${hearing.oldDate}` : ''}</span>
					<span></span>
				{/each}
			{/if}
		</span>
	</Row>
{/snippet}

<div class="pane">
	<section class="band">
		<div class="head"><h2>Heute</h2></div>
		<div class="heute">
			{#each heute as group (group.label)}
				<div class="heute-group">
					<h3>{group.label}</h3>
					<div class="heute-lines">
						{#each group.lines as line, index (index)}
							<Row href={hrefOf(line.emailIds)} current={isCurrent(line.emailIds)}>
								{line.text}
								{#if line.emailIds.length === 0}<span class="tag">aus der Akte</span>{/if}
								{#if lineUnsure(line)}<span class="tag tag-danger">unsicher</span>{/if}
							</Row>
						{:else}
							<p class="empty">keine Termine heute oder morgen</p>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</section>

	<section class="band">
		<div class="head head-table">
			<h2>Fristen</h2>
			<span class="sub">Daten berechnet, bitte prüfen</span>
			<span class="sub">Tage</span>
		</div>
		<div class="list">
			{#each ranked as item, index (index)}
				{@render itemRow(item)}
			{/each}
		</div>
	</section>

	<details class="band" bind:open={restOpen}>
		<summary>
			<h2>Rest</h2>
			<span class="sub">{rest.length} {rest.length === 1 ? 'E-Mail' : 'E-Mails'}{warnings > 0 ? `, ${warnings} mit Warnung` : ''}</span>
		</summary>
		<div class="rest">
			{#each rest as item, index (index)}
				{@const ids = emailIds(item)}
				<Row href={hrefOf(ids)} current={isCurrent(ids)}>
					<span class="rest-row">
						<span class="title">{item.summary}</span>
						{#if item.injection}<span class="tag tag-warn">Warnung</span>{/if}
						{#if item.unsicher.length > 0}<span class="tag tag-danger">unsicher</span>{/if}
					</span>
				</Row>
			{/each}
		</div>
	</details>
</div>

<style>
	.pane {
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
		padding: var(--space-5);
	}

	.band {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	h2 {
		font-size: 15px;
		font-weight: 600;
	}

	.head-table {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-items: baseline;
		gap: var(--space-3);
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

	.heute {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.heute-group {
		display: grid;
		grid-template-columns: 80px minmax(0, 1fr);
		gap: var(--space-3);
	}

	h3 {
		padding-block: var(--space-1);
		color: var(--ink-2);
		font-size: 13px;
		white-space: nowrap;
	}

	.heute-lines {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.empty {
		padding-block: var(--space-1);
		color: var(--ink-2);
	}

	.list {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.rest {
		display: flex;
		flex-direction: column;
	}

	.grid {
		display: grid;
		grid-template-columns: 56px minmax(0, 1fr) 32px;
		column-gap: var(--space-3);
		row-gap: var(--space-1);
		align-items: baseline;
		padding-block: var(--space-1);
	}

	.date,
	.days {
		font-family: var(--mono);
		font-size: 13px;
		font-variant-numeric: tabular-nums;
	}

	.days {
		text-align: right;
	}

	.urgent {
		color: var(--danger);
		font-weight: 600;
	}

	.text {
		display: grid;
		gap: 2px;
		min-width: 0;
	}

	.title {
		display: block;
		min-width: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.rest-row {
		display: flex;
		align-items: baseline;
		gap: var(--space-2);
		min-width: 0;
	}

	.rest-row .title {
		flex: 1;
	}
</style>
