<script lang="ts">
	import { receivedLabel, shownEnd, TIER_LABELS, weekdayGerman } from '#lib/format.ts';
	import type { Frist } from '#lib/types.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const item = $derived(data.item);
	const akte = $derived(item.akteRecord);
	const hearings = $derived(item.role === 'court' ? item.events : []);
	// A Frist says it by itself. The others have no line of their own on this screen.
	const otherUnsure = $derived(item.unsicher.filter((path) => !path.startsWith('fristen')).length);

	function daysText({ daysLeft }: Frist): string {
		if (daysLeft === null) return '';
		if (daysLeft < 0) return ', abgelaufen';
		return `, noch ${daysLeft} ${daysLeft === 1 ? 'Tag' : 'Tage'}`;
	}
</script>

<article>
	<div class="facts">
		<div class="sub">
			<div>{TIER_LABELS[item.tier]}</div>
			{#if akte}
				<div>{akte.aktenzeichen} · {akte.az_gericht} · {akte.mandant.name} ./. {akte.gegenseite.name}</div>
			{/if}
			{#if !item.roleSure}
				<div>Absender nicht bestätigt. Der Rang nimmt die höchste mögliche Stufe.</div>
			{/if}
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
						{#if !frist.quoteOk}<span class="tag tag-danger">unsicher</span>{/if}
					</div>
					{#if end}<div class="sub">berechnet, bitte prüfen{daysText(frist)}</div>{/if}
					{#if frist.reason}<div class="sub">{frist.reason}</div>{/if}
					{#if frist.hint}<div class="sub">{frist.hint}</div>{/if}
					{#if !frist.quoteOk}<div class="sub">Das Zitat steht nicht in dieser E-Mail. Bitte die E-Mail selbst lesen.</div>{/if}
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

	{#each data.emails as { email, segments } (email.id)}
		<div class="email">
			<div class="email-head">
				<h2>{email.subject}</h2>
				<div class="sub">{email.senderName || email.senderAddress} · {email.senderAddress}</div>
				<div class="sub">{receivedLabel(email.received)} · {email.channel === 'bea' ? 'beA' : 'E-Mail'}</div>
			</div>
			<!-- One line: the body keeps its whitespace, so any here would show. -->
			<div class="body">{#each segments as segment, index (index)}{#if segment.marked}<mark>{segment.text}</mark>{:else}{segment.text}{/if}{/each}</div>
		</div>
	{/each}
</article>

<style>
	article {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	.facts {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		padding-bottom: var(--space-5);
		border-bottom: 1px solid var(--line);
	}

	.warn {
		padding: var(--space-2) var(--space-3);
		border-radius: 6px;
		background: var(--warn-bg);
		color: var(--warn-ink);
		font-weight: 500;
	}

	.fact {
		display: grid;
		grid-template-columns: 76px minmax(0, 1fr);
		column-gap: var(--space-3);
	}

	.fact-date {
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.fact-text {
		display: grid;
		gap: 2px;
		min-width: 0;
	}

	.fact-title {
		font-weight: 500;
	}

	.email {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.email-head {
		display: grid;
		gap: 2px;
	}

	h2 {
		font-size: 15px;
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.body {
		font: 15px/23px var(--letter);
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}

	mark {
		border-radius: 2px;
		background: var(--mark);
		color: var(--ink);
	}
</style>
