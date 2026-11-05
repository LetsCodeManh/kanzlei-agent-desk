<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Card from '#components/card/Card.svelte';
	import EmptyState from '#components/empty-state/EmptyState.svelte';
	import Tag from '#components/tag/Tag.svelte';
	import RunProblems from '#lib/components/RunProblems.svelte';
	import { channelLabel, receivedLabel, readLine } from '#lib/format.ts';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const mails = $derived(data.briefing?.day.postfach ?? []);
</script>

<svelte:head><title>Postfach · Morning Briefing</title></svelte:head>

{#if data.briefing}
	<main class="grid-page grid-full grid-window page">
		<RunProblems failed={data.failed} notRead={data.briefing.notRead} />

		<div class="grid-head">
			<div>
				<h1 class="text-heading-24">Postfach</h1>
				<p class="text-copy-14">Alle Konten · {readLine(data.briefing.coverage)}</p>
			</div>
		</div>

		<div class="grid-split split">
			<div class="grid-column">
				<Card class="grid-fill" level={2} title="Eingang" count={mails.length} scroll>
					{#if mails.length === 0}
						<EmptyState line="Keine E-Mails." />
					{:else}
						<ul class="mails">
							{#each mails as mail (mail.id)}
								<li>
									<a
										class="mail"
										href={resolve('/[kanzlei]/postfach/[email]', { kanzlei: data.kanzlei, email: mail.id })}
										aria-current={mail.id === page.params.email ? 'true' : undefined}
										data-sveltekit-reset="false"
									>
										<span class="texts">
											<span class="sender">{mail.sender}</span>
											<span class="line">{mail.subject}</span>
											<span class="sub line">{mail.summary}</span>
										</span>
										<span class="side">
											<span class="sub">{receivedLabel(mail.received)}</span>
											<span class="tags">
												{#if mail.warning}<Tag tone="warning">Warnung</Tag>{/if}
												{#if mail.unsure}<Tag tone="error">unsicher</Tag>{/if}
												{#each mail.labels as label (label)}<Tag>{label}</Tag>{/each}
												<Tag>{channelLabel(mail.channel)}</Tag>
											</span>
										</span>
									</a>
								</li>
							{/each}
						</ul>
					{/if}
				</Card>
			</div>

			<div class="grid-column">
				{#key page.params.email}
					<Card class="grid-fill" level={2} title="E-Mail" scroll>
						<div class="reader">{@render children()}</div>
					</Card>
				{/key}
			</div>
		</div>
	</main>
{/if}

<style>
	.split {
		--grid-split-main: 1fr;
	}

	.mails > li + li {
		border-top: 1px solid var(--gray-alpha-200);
	}

	.mail {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		column-gap: var(--space-3);
		padding: var(--space-2) var(--space-4);
	}

	.mail:hover {
		background: var(--gray-alpha-100);
	}

	.mail[aria-current] {
		background: var(--gray-alpha-200);
	}

	.texts {
		display: grid;
		gap: var(--space-0-5);
		min-width: 0;
	}

	.sender {
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.line {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.side {
		display: grid;
		gap: var(--space-1);
		justify-items: end;
		align-content: start;
	}

	.tags {
		display: flex;
		gap: var(--space-1);
	}

	.reader {
		padding: var(--space-4);
	}

	@media (max-width: 900px) {
		.page {
			display: grid;
			height: auto;
		}
		.page :global(.grid-fill) {
			flex: none;
		}
	}
</style>
