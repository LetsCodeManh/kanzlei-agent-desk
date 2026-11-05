<script lang="ts">
	import Tag from '#components/tag/Tag.svelte';
	import SourceTimeline, { type SourceEntry } from '#lib/components/SourceTimeline.svelte';
	import { channelLabel, dayLabel, receivedLabel, shownEnd, TIER_LABELS, weekdayGerman } from '#lib/format.ts';
	import type { Email, Frist, RankedItem } from '#lib/types.ts';

	/**
	 * An item's checked facts over its emails, the quoted words marked. In the side sheet on "Heute", and in the Postfach.
	 * `sheet`: the sheet's title says the rank, and a Verlauf says what happened and what comes next, over the emails.
	 */
	let {
		item,
		emails,
		sheet = false
	}: { item: RankedItem; emails: { email: Email; segments: { text: string; marked: boolean }[] }[]; sheet?: boolean } = $props();

	const NOT_QUOTED = 'Das Zitat steht nicht in dieser E-Mail. Bitte die E-Mail selbst lesen.';

	const akte = $derived(item.akteRecord);
	const hearings = $derived(item.role === 'court' ? item.events : []);
	const akteLine = $derived(akte && [akte.aktenzeichen, akte.az_gericht, `${akte.mandant.name} ./. ${akte.gegenseite.name}`].filter(Boolean).join(' · '));
	// A Frist says it by itself. The others have no line of their own on this screen.
	const otherUnsure = $derived(item.unsicher.filter((path) => !path.startsWith('fristen')).length);

	const hasSub = $derived(!sheet || Boolean(akteLine) || !item.roleSure);

	// Each email, Frist and Termin in the order they happen. A Frist or a Termin with no date to place it by goes last.
	const verlauf = $derived<SourceEntry[]>(
		[
			...emails.map(({ email }): SourceEntry => {
				const [day, time] = receivedLabel(email.received).split(', ');
				return {
					key: email.id,
					kind: 'email',
					when: day,
					title: email.subject,
					notes: [`${email.senderName || email.senderAddress} · ${time} · ${channelLabel(email.channel)}`],
					tone: 'neutral',
					unsure: false,
					at: email.received
				};
			}),
			...item.fristen.map((frist, index): SourceEntry => {
				const end = shownEnd(frist);
				return {
					key: `frist-${index}`,
					kind: 'frist',
					when: end ? dayLabel(end) : 'offen',
					title: frist.what,
					notes: [end && `berechnet, bitte prüfen${daysText(frist)}`, frist.reason, frist.hint, !frist.quoteOk && NOT_QUOTED].filter((note): note is string => Boolean(note)),
					tone: frist.daysLeft !== null && frist.daysLeft <= 1 ? 'error' : end === null || frist.relative ? 'warning' : 'neutral',
					unsure: !frist.quoteOk,
					at: end
				};
			}),
			...hearings.map(
				(hearing, index): SourceEntry => ({
					key: `termin-${index}`,
					kind: 'termin',
					when: 'Termin',
					title: hearing.date_text,
					notes: hearing.oldDate ? [`vorher ${hearing.oldDate}`] : [],
					tone: 'neutral',
					unsure: false,
					at: null
				})
			)
		].sort((a, b) => (a.at === null ? 1 : b.at === null ? -1 : Date.parse(a.at) - Date.parse(b.at)))
	);

	// One entry only repeats the email's head under it. With no Akte either, nothing is left above the email, so no rule.
	const showVerlauf = $derived(verlauf.length > 1);
	const hasFacts = $derived(hasSub || item.injection || otherUnsure > 0 || showVerlauf);

	function daysText({ daysLeft }: Frist): string {
		if (daysLeft === null) return '';
		if (daysLeft < 0) return ', abgelaufen';
		return `, noch ${daysLeft} ${daysLeft === 1 ? 'Tag' : 'Tage'}`;
	}
</script>

{#snippet head()}
	{#if hasSub}
		<div class="sub">
			{#if !sheet}<div>{TIER_LABELS[item.tier]}</div>{/if}
			{#if akteLine}<div>{akteLine}</div>{/if}
			{#if !item.roleSure}
				<div>Absender nicht bestätigt. Der Rang nimmt die höchste mögliche Stufe.</div>
			{/if}
		</div>
	{/if}

	{#if item.injection}
		<p class="warn">Diese E-Mail enthält eine Anweisung an die KI. Der Rang bleibt davon unberührt.</p>
	{/if}
	{#if otherUnsure > 0}
		<p class="warn">
			{otherUnsure === 1 ? 'Eine Angabe steht' : `${otherUnsure} Angaben stehen`} nicht wörtlich in der E-Mail. Bitte die E-Mail selbst lesen.
		</p>
	{/if}
{/snippet}

<article data-sheet={sheet || undefined}>
	{#if sheet}
		{#if hasFacts}
			<div class="facts">
				{@render head()}
				{#if showVerlauf}<SourceTimeline entries={verlauf} />{/if}
			</div>
		{/if}
	{:else}
		<div class="facts">
			{@render head()}

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
	{/if}

	{#each emails as { email, segments } (email.id)}
		<div class="email">
			<div class="email-head">
				<h3>{email.subject}</h3>
				<div class="sub">{email.senderName || email.senderAddress} · {email.senderAddress}</div>
				<div class="sub">{receivedLabel(email.received)} · {channelLabel(email.channel)}</div>
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
		min-width: 0;
	}

	.facts {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		padding-bottom: var(--space-5);
		border-bottom: 1px solid var(--gray-alpha-400);
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

	article[data-sheet] .email + .email {
		padding-top: var(--space-5);
		border-top: 1px solid var(--gray-alpha-200);
	}

	.email {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.email-head {
		display: grid;
		gap: var(--space-0-5);
	}

	h3 {
		font-size: 15px;
		line-height: 20px;
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.body {
		font: 15px/23px var(--letter);
		letter-spacing: 0;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}

	mark {
		border-radius: 2px;
		background: var(--mark);
		color: var(--gray-1000);
	}
</style>
