<!--
	The open email in the Postfach, as a mail client shows it: the subject and who wrote, the AI's line, what code checked,
	the email's words with the quotes marked, and what was answered. "Heute" has its own, EmailSource, in the side sheet.
-->
<script lang="ts">
	import Avatar, { initials } from '#components/avatar/Avatar.svelte';
	import Icon from '#components/icon/Icon.svelte';
	import MailFacts from '#lib/components/MailFacts.svelte';
	import { channelLabel, receivedLabel } from '#lib/format.ts';
	import type { Email, RankedItem, SentMail } from '#lib/types.ts';

	let {
		item,
		email,
		segments,
		sent
	}: { item: RankedItem; email: Email; segments: { text: string; marked: boolean }[]; sent: SentMail[] } = $props();

	const sender = $derived(email.senderName || email.senderAddress);
	const summaryUnsure = $derived(item.unsicher.some((path) => path.startsWith('summary')));
	const summaryMarked = $derived(segments.some((segment) => segment.marked));
</script>

<article>
	<header class="head">
		<h2 title={email.subject}>{email.subject}</h2>
		<div class="from">
			<Avatar letters={initials(sender)} />
			<div class="who">
				<div class="name">{sender}</div>
				<div class="sub address">{email.senderAddress}</div>
			</div>
			<div class="sub when">{receivedLabel(email.received)} · {channelLabel(email.channel)}</div>
		</div>
	</header>

	{#if item.summary}
		<section class="summary">
			<Icon name="sparkles" />
			<div class="summary-text">
				<p>{item.summary}</p>
				{#if summaryUnsure}
					<p class="sub unsure">Von der KI, unsicher. Bitte die E-Mail selbst lesen.</p>
				{:else}
					<p class="sub">Von der KI{summaryMarked ? '. Die Belege sind in der E-Mail markiert.' : ''}</p>
				{/if}
			</div>
		</section>
	{/if}

	<MailFacts {item} />

	<!-- One line: the body keeps its whitespace, so any here would show. -->
	<div class="body">{#each segments as segment, index (index)}{#if segment.marked}<mark>{segment.text}</mark>{:else}{segment.text}{/if}{/each}</div>

	{#each sent as mail, index (index)}
		<section class="sent">
			<Avatar letters="Sie" />
			<div class="sent-text">
				<div class="sub">{mail.kind === 'reply' ? 'Ihre Antwort' : 'Weitergeleitet'} an {mail.to} · simuliert, nicht versendet</div>
				<h3>{mail.subject}</h3>
				{#if mail.body}<div class="body">{mail.body}</div>{/if}
			</div>
		</section>
	{/each}
</article>

<style>
	article {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
		min-width: 0;
	}

	.head {
		display: grid;
		gap: var(--space-4);
		min-width: 0;
	}

	h2 {
		font-size: 20px;
		line-height: 28px;
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.from {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		min-width: 0;
	}

	.who {
		flex: 1;
		min-width: 0;
	}

	.name,
	.address,
	h3 {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.name,
	h3 {
		font-weight: 600;
	}

	.when {
		flex: none;
		font-variant-numeric: tabular-nums;
	}

	.summary {
		display: grid;
		grid-template-columns: 16px minmax(0, 1fr);
		column-gap: var(--space-3);
		align-items: start;
		padding: var(--space-3) var(--space-4);
		border-radius: var(--radius-medium);
		background: var(--gray-alpha-100);
	}

	.summary-text {
		display: grid;
		gap: var(--space-1);
	}

	.summary-text p:first-child {
		font-size: 15px;
		line-height: 22px;
	}

	.unsure {
		color: var(--red-900);
	}

	.body {
		max-width: 70ch;
		font-size: 15px;
		line-height: 24px;
		letter-spacing: 0;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}

	mark {
		border-radius: 2px;
		background: var(--amber-200);
		box-shadow: inset 0 -2px 0 var(--amber-500);
		color: inherit;
	}

	.sent {
		display: flex;
		gap: var(--space-3);
		padding-top: var(--space-5);
		border-top: 1px solid var(--gray-alpha-400);
	}

	.sent-text {
		display: grid;
		gap: var(--space-2);
		flex: 1;
		min-width: 0;
	}

	/* A phone: the time goes under the sender, or it pushes the name out. */
	@media (max-width: 600px) {
		.from {
			flex-wrap: wrap;
		}

		.when {
			flex-basis: 100%;
		}
	}
</style>
