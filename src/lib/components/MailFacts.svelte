<!--
	What code checked about the open email in the Postfach: its rank, its Akte, its Fristen and Termine, and each warning.
-->
<script lang="ts">
	import Tag from '#components/tag/Tag.svelte';
	import { shownEnd, TIER_LABELS, weekdayGerman } from '#lib/format.ts';
	import type { Frist, RankedItem } from '#lib/types.ts';

	let { item }: { item: RankedItem } = $props();

	const NOT_QUOTED = 'Das Zitat steht nicht in dieser E-Mail. Bitte die E-Mail selbst lesen.';

	const akte = $derived(item.akteRecord);
	const hearings = $derived(item.role === 'court' ? item.events : []);
	const akteLine = $derived(akte && [akte.aktenzeichen, akte.az_gericht, `${akte.mandant.name} ./. ${akte.gegenseite.name}`].filter(Boolean).join(' · '));
	// A Frist says it by itself. The others have no line of their own on this screen.
	const otherUnsure = $derived(item.unsicher.filter((path) => !path.startsWith('fristen')).length);

	function daysText({ daysLeft }: Frist): string {
		if (daysLeft === null) return '';
		if (daysLeft < 0) return ', abgelaufen';
		return `, noch ${daysLeft} ${daysLeft === 1 ? 'Tag' : 'Tage'}`;
	}
</script>

<div class="facts">
	<div class="sub lines">
		<div>{TIER_LABELS[item.tier]}</div>
		{#if akteLine}<div>{akteLine}</div>{/if}
		{#if !item.roleSure}<div>Absender nicht bestätigt. Der Rang nimmt die höchste mögliche Stufe.</div>{/if}
	</div>

	{#if item.injection}
		<p class="warn">Diese E-Mail enthält eine Anweisung an die KI. Der Rang bleibt davon unberührt.</p>
	{/if}
	{#if otherUnsure > 0}
		<p class="warn">
			{otherUnsure === 1 ? 'Eine Angabe steht' : `${otherUnsure} Angaben stehen`} nicht wörtlich in der E-Mail. Bitte die E-Mail selbst lesen.
		</p>
	{/if}

	{#each item.fristen as frist, index (index)}
		{@const end = shownEnd(frist)}
		<div class="fact">
			<div class="fact-date">{end ? weekdayGerman(end) : 'offen'}</div>
			<div class="fact-text">
				<div class="fact-title">
					{frist.what}
					{#if !frist.quoteOk}<Tag tone="error">unsicher</Tag>{/if}
				</div>
				{#if end}<div class="sub">berechnet, bitte prüfen{daysText(frist)}</div>{/if}
				{#if frist.reason}<div class="sub">{frist.reason}</div>{/if}
				{#if frist.hint}<div class="sub">{frist.hint}</div>{/if}
				{#if !frist.quoteOk}<div class="sub">{NOT_QUOTED}</div>{/if}
			</div>
		</div>
	{/each}

	{#each hearings as hearing, index (index)}
		<div class="fact">
			<div class="fact-date">Termin</div>
			<div class="fact-text">
				<div class="fact-title">{hearing.date_text}</div>
				{#if hearing.oldDate}<div class="sub">vorher {hearing.oldDate}</div>{/if}
			</div>
		</div>
	{/each}
</div>

<style>
	.facts {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		min-width: 0;
	}

	.lines {
		display: grid;
		gap: var(--space-0-5);
	}

	.warn {
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius-medium);
		background: var(--amber-100);
		color: var(--amber-900);
		font-weight: 500;
	}

	.fact {
		display: grid;
		grid-template-columns: 72px minmax(0, 1fr);
		column-gap: var(--space-3);
	}

	.fact-date {
		font-weight: 500;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.fact-text {
		display: grid;
		gap: var(--space-0-5);
		min-width: 0;
	}

	.fact-title {
		font-weight: 500;
	}
</style>
