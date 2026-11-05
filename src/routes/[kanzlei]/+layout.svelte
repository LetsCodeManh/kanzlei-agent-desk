<script lang="ts">
	import { enhance } from '$app/forms';
	import { afterNavigate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import BriefingPane from '#lib/components/BriefingPane.svelte';
	import { coverageLine, dayLabel } from '#lib/format.ts';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	let starting = $state(false);
	let emailPane: HTMLElement | undefined = $state();

	// The panes scroll by themselves, so the router does not reset them. A new email opens at its top.
	afterNavigate(({ from, to }) => {
		if (emailPane && from?.params?.email !== to?.params?.email) emailPane.scrollTop = 0;
	});
</script>

<div class="app">
	<header>
		<div class="status">
			<div class="name">
				<strong>{data.info.name}</strong>
				<a href={resolve('/')}>Kanzlei wechseln</a>
			</div>
			{#if data.briefing}
				<p class="sub">
					{dayLabel(data.briefing.today)} · Postfach: simuliert · {coverageLine(data.briefing.coverage)}
				</p>
				{#if data.briefing.notRead.length > 0}
					<ul class="not-read">
						{#each data.briefing.notRead as email (email.id)}
							<li>
								Nicht gelesen: {[email.sender || email.id, email.subject].filter(Boolean).join(', ')}. {email.reason}. Bitte
								im Postfach selbst prüfen.
							</li>
						{/each}
					</ul>
				{/if}
			{:else}
				<p class="sub">Postfach: simuliert · noch kein Lauf</p>
			{/if}
		</div>
		<form
			method="POST"
			action={resolve('/[kanzlei]', { kanzlei: data.kanzlei })}
			use:enhance={() => {
				starting = true;
				return async ({ update }) => {
					await update();
					starting = false;
				};
			}}
		>
			{#if data.failed}
				<p class="run-error" role="alert">
					Tageslauf fehlgeschlagen.{data.briefing ? ' Unten steht der letzte Lauf.' : ''}
				</p>
			{/if}
			<button disabled={starting}>{starting ? 'Tageslauf läuft' : 'Tageslauf starten'}</button>
		</form>
	</header>

	<div class="panes">
		<div class="left">
			{#if data.briefing}
				<BriefingPane briefing={data.briefing} kanzlei={data.kanzlei} selected={page.params.email} />
			{:else}
				<div class="no-run">
					<strong>Noch kein Lauf.</strong>
					<p class="sub">Das Postfach wurde noch nicht gelesen. Das heißt nicht, dass es leer ist. „Tageslauf starten“ liest es.</p>
				</div>
			{/if}
		</div>
		<div class="right" bind:this={emailPane}>
			{@render children()}
		</div>
	</div>
</div>

<style>
	.app {
		display: grid;
		grid-template-rows: auto minmax(0, 1fr);
		height: 100dvh;
	}

	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-5);
		padding: var(--space-3) var(--space-5);
		border-bottom: 1px solid var(--line);
	}

	.status {
		display: grid;
		gap: 2px;
		min-width: 0;
	}

	.name {
		display: flex;
		align-items: baseline;
		gap: var(--space-3);
		min-width: 0;
	}

	strong {
		font-size: 15px;
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.name a {
		flex: none;
		color: var(--ink-2);
		font-size: 13px;
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.not-read {
		color: var(--danger);
		font-size: 13px;
		line-height: 18px;
		font-weight: 600;
	}

	form {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		flex: none;
	}

	.run-error {
		color: var(--danger);
		font-size: 13px;
		line-height: 18px;
	}

	button {
		height: 36px;
		min-width: 148px; /* the same width with either label, so the header does not move */
		padding-inline: var(--space-4);
		border: 0;
		border-radius: 8px;
		background: var(--accent);
		color: var(--on-accent);
		font: inherit;
		font-weight: 500;
		white-space: nowrap;
		cursor: pointer;
	}

	button:disabled {
		cursor: progress;
	}

	.panes {
		display: grid;
		grid-template-columns: minmax(0, 11fr) minmax(0, 9fr);
		min-height: 0;
	}

	.left {
		overflow: auto;
	}

	.right {
		overflow: auto;
		padding: var(--space-5);
		border-left: 1px solid var(--line);
		background: var(--surface-2);
	}

	.no-run {
		display: grid;
		gap: var(--space-2);
		padding: var(--space-5);
	}
</style>
