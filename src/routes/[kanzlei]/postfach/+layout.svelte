<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Card from '#components/card/Card.svelte';
	import EmptyState from '#components/empty-state/EmptyState.svelte';
	import Fold from '#components/fold/Fold.svelte';
	import Tag from '#components/tag/Tag.svelte';
	import MailStats from '#lib/components/MailStats.svelte';
	import RunProblems from '#lib/components/RunProblems.svelte';
	import { channelLabel, readLine, receivedLabel } from '#lib/format.ts';
	import type { MailRow } from '#lib/types.ts';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const mails = $derived(data.briefing?.day.postfach ?? []);
	const inbox = $derived(mails.filter((mail) => !data.mailbox.archived.includes(mail.id)));
	const archive = $derived(mails.filter((mail) => data.mailbox.archived.includes(mail.id)));
	// An open email in the archive shows in the list, also from a direct link. It stays writable, for the Fold's own head.
	let archiveOpen = $derived(archive.some((mail) => mail.id === page.params.email));
</script>

<svelte:head><title>Postfach · Morning Briefing</title></svelte:head>

{#snippet rows(list: MailRow[])}
	<ul class="mails">
		{#each list as mail (mail.id)}
			{@const unread = !data.mailbox.read.includes(mail.id)}
			{@const sent = data.mailbox.sent.filter((answer) => answer.emailId === mail.id)}
			<li>
				<a
					class="mail"
					href={resolve('/[kanzlei]/postfach/[email]', { kanzlei: data.kanzlei, email: mail.id })}
					aria-current={mail.id === page.params.email ? 'true' : undefined}
					data-unread={unread || undefined}
					data-sveltekit-reset="false"
				>
					<span class="texts">
						<span class="top">
							{#if unread}<span class="dot" role="img" aria-label="Ungelesen"></span>{/if}
							<span class="sender line">{mail.sender}</span>
							<span class="sub when">{receivedLabel(mail.received)}</span>
						</span>
						<span class="subject line">{mail.subject}</span>
						<span class="sub line">{mail.summary}</span>
					</span>
					<span class="tags">
						{#if mail.warning}<Tag tone="warning">Warnung</Tag>{/if}
						{#if mail.unsure}<Tag tone="error">unsicher</Tag>{/if}
						{#each mail.labels as label (label)}<Tag>{label}</Tag>{/each}
						<Tag>{channelLabel(mail.channel)}</Tag>
						{#if sent.some((answer) => answer.kind === 'reply')}<Tag tone="success">Beantwortet</Tag>{/if}
						{#if sent.some((answer) => answer.kind === 'forward')}<Tag tone="success">Weitergeleitet</Tag>{/if}
					</span>
				</a>
			</li>
		{/each}
	</ul>
{/snippet}

{#if data.briefing}
	<main class="grid-page grid-full grid-window page">
		<RunProblems failed={data.failed} notRead={data.briefing.notRead} />

		<div class="grid-head">
			<div>
				<h1 class="text-heading-24">Postfach</h1>
				<p class="text-copy-14">Alle Konten · Vom Briefing: {readLine(data.briefing.coverage)}</p>
			</div>
		</div>

		<MailStats info={data.info} {mails} read={data.mailbox.read} notRead={data.briefing.coverage.notRead} />

		<div class="grid-split split">
			<div class="grid-column">
				<Card class="grid-fill" level={2} title="Eingang" count={inbox.length} scroll>
					{#if inbox.length === 0}
						<EmptyState line="Keine E-Mails im Eingang." />
					{:else}
						{@render rows(inbox)}
					{/if}
					{#if archive.length > 0}
						<div class="archive">
							<Fold label="Archiv" count={archive.length} bind:open={archiveOpen}>{@render rows(archive)}</Fold>
						</div>
					{/if}
				</Card>
			</div>

			<div class="grid-column">{@render children()}</div>
		</div>
	</main>
{/if}

<style>
	/* The list is a third, the email two. */
	.split {
		--grid-split-main: 1fr;
		--grid-split-side: 2fr;
	}

	/* A short window: the page scrolls under this least, so no card shrinks to nothing. `.page`: it must outweigh grid.css's 0. */
	.page .split {
		min-height: 320px;
	}

	/* A row's hover and its selection run to the card's edges, with no gap under the head or over the foot. */
	.mails {
		margin: calc(-1 * var(--space-1)) calc(-1 * var(--card-pad)) 0;
	}

	.mails:last-child {
		margin-bottom: calc(-1 * var(--space-2));
	}

	.mails > li + li {
		border-top: 1px solid var(--gray-alpha-200);
	}

	.mail {
		display: flex;
		flex-direction: column;
		gap: var(--space-1-5);
		padding: var(--space-2) var(--card-pad);
		transition: background-color var(--duration-hover) var(--ease-out);
	}

	/* 100, not 200: a Tag's fill is gray-200, so on 200 a selected row's tags lost their pill. */
	.mail:hover,
	.mail[aria-current] {
		background: var(--gray-alpha-100);
	}

	.mail:focus-visible {
		outline: 2px solid var(--focus-ring);
		outline-offset: -2px;
	}

	.texts {
		display: grid;
		gap: var(--space-0-5);
		min-width: 0;
	}

	.top {
		display: flex;
		align-items: baseline;
		gap: var(--space-2);
		min-width: 0;
	}

	.dot {
		flex: none;
		align-self: center;
		width: 6px;
		height: 6px;
		border-radius: 999px;
		background: var(--blue-700);
	}

	.line {
		min-width: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.sender {
		flex: 1;
		font-weight: 500;
	}

	.when {
		flex: none;
		font-variant-numeric: tabular-nums;
	}

	.mail[data-unread] :is(.sender, .subject) {
		font-weight: 600;
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
	}

	/* The Fold's hairline and its rows run to the card's edges, as the rows above. */
	.archive {
		margin-inline: calc(-1 * var(--card-pad));
		padding-inline: var(--card-pad);
		border-top: 1px solid var(--gray-alpha-200);
	}

	.archive :global(.fold-body) {
		margin-inline: calc(-1 * var(--card-pad));
		padding-inline: 0;
	}

	.archive .mails {
		margin: 0;
	}

	/* A phone: the page scrolls, and the list keeps a scroller of its own, so the email is not far below it.
	   `main`: `.grid-page.grid-window` has the same weight as `.page`, and it won, so the cards overlapped. */
	@media (max-width: 900px) {
		main.page {
			display: grid;
			height: auto;
		}
		main.page :global(.grid-fill) {
			flex: none;
		}
		.split > :first-child > :global(.grid-fill) {
			max-height: 60vh;
		}
	}
</style>
