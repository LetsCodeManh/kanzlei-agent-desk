<script lang="ts">
	import { page } from '$app/state';
	import Card from '#components/card/Card.svelte';
	import EmptyState from '#components/empty-state/EmptyState.svelte';
	import Fold from '#components/fold/Fold.svelte';
	import MailList from '#lib/components/MailList.svelte';
	import MailStats from '#lib/components/MailStats.svelte';
	import RunProblems from '#lib/components/RunProblems.svelte';
	import { readLine } from '#lib/format.ts';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const mails = $derived(data.briefing?.day.postfach ?? []);
	const inbox = $derived(mails.filter((mail) => !data.mailbox.archived.includes(mail.id)));
	const archive = $derived(mails.filter((mail) => data.mailbox.archived.includes(mail.id)));
	// An open email in the archive shows in the list, also from a direct link. It stays writable, for the Fold's own head.
	let archiveOpen = $derived(archive.some((mail) => mail.id === page.params.email));
</script>

<svelte:head><title>Postfach · Morning Briefing</title></svelte:head>

{#if data.briefing}
	<main class="grid-page grid-full grid-window page">
		<RunProblems failed={data.failed} notRead={data.briefing.notRead} />

		<div class="grid-head">
			<div>
				<h1 class="text-heading-24">Postfach</h1>
				<p class="text-copy-14">Alle Konten · Vom Briefing: {readLine(data.briefing.coverage)}</p>
			</div>
		</div>

		<MailStats kanzlei={data.kanzlei} info={data.info} {mails} read={data.mailbox.read} added={data.mailbox.added} notRead={data.briefing.coverage.notRead} />

		<div class="grid-split split">
			<div class="grid-column">
				<Card class="grid-fill" level={2} title="Eingang" count={inbox.length} scroll>
					{#if inbox.length === 0}
						<EmptyState line="Keine E-Mails im Eingang." />
					{:else}
						<MailList mails={inbox} day={data.briefing.day} today={data.briefing.today} mailbox={data.mailbox} kanzlei={data.kanzlei} />
					{/if}
					{#if archive.length > 0}
						<div class="archive">
							<Fold label="Archiv" count={archive.length} bind:open={archiveOpen}>
								<MailList mails={archive} day={data.briefing.day} today={data.briefing.today} mailbox={data.mailbox} kanzlei={data.kanzlei} archive />
							</Fold>
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
