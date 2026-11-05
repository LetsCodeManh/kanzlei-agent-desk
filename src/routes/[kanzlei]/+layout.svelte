<script lang="ts">
	import { afterNavigate, goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Connect from '#lib/components/Connect.svelte';
	import DayPage from '#lib/components/DayPage.svelte';
	import ReadForm from '#lib/components/ReadForm.svelte';
	import { readLine } from '#lib/format.ts';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	let panel: HTMLElement | undefined = $state();

	const open = $derived(page.params.email !== undefined);
	const dayHref = $derived(resolve('/[kanzlei]', { kanzlei: data.kanzlei }));

	// The panel scrolls by itself, so the router does not reset it. A new email opens at its top.
	afterNavigate(({ from, to }) => {
		if (panel && from?.params?.email !== to?.params?.email) panel.scrollTop = 0;
	});

	function onkeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && open) goto(dayHref, { reset: false });
	}
</script>

<svelte:window {onkeydown} />

<div class="app">
	<div class="top">
		<div class="demo">
			<span>Demo · erfundene Daten</span>
			<a href={resolve('/')}>Kanzlei wechseln</a>
		</div>
		{#if data.briefing}
			<header>
				<div class="who">
					<strong>{data.info.name}</strong>
					<span class="sub">{data.info.anwalt.name}</span>
				</div>
				<div class="mailbox">
					<div class="mailbox-text">
						<span class="mailbox-line">Outlook verbunden (simuliert): {data.info.anwalt.address}</span>
						<span class="sub">{readLine(data.briefing.coverage)}</span>
					</div>
					<ReadForm kanzlei={data.kanzlei} label="Neu lesen" />
				</div>
			</header>
			{#if data.failed}
				<p class="run-error" role="alert">Das Postfach konnte nicht gelesen werden. Unten steht der letzte Stand.</p>
			{/if}
		{/if}
	</div>

	{#if data.briefing}
		<DayPage briefing={data.briefing} kanzlei={data.kanzlei} ticked={data.ticked} selected={page.params.email} />
		<aside class={['panel', open && 'panel-open']} inert={!open} aria-label="Quelle" bind:this={panel}>
			{#if open}
				<a class="quiet close" href={dayHref} data-sveltekit-reset="false">Schließen</a>
			{/if}
			{@render children()}
		</aside>
	{:else}
		<Connect kanzlei={data.kanzlei} info={data.info} failed={data.failed} />
	{/if}
</div>

<style>
	.app {
		display: grid;
		grid-template-rows: auto minmax(0, 1fr);
		min-height: 100dvh;
	}

	.demo {
		display: flex;
		justify-content: center;
		gap: var(--space-3);
		padding: var(--space-1) var(--space-5);
		background: var(--surface-2);
		color: var(--ink-2);
		font-size: 12px;
		line-height: 16px;
	}

	.demo a {
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-5);
		padding: var(--space-3) var(--space-5);
		border-bottom: 1px solid var(--line);
	}

	.who,
	.mailbox-text {
		display: grid;
		gap: 2px;
		min-width: 0;
	}

	.who strong {
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.mailbox {
		display: flex;
		align-items: center;
		gap: var(--space-4);
		min-width: 0;
		text-align: right;
	}

	.mailbox-line {
		font-size: 13px;
		line-height: 18px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.run-error {
		padding: var(--space-2) var(--space-5);
		background: var(--warn-bg);
		color: var(--danger);
		font-weight: 600;
	}

	/* The source slides in over the page. The list stays where it was. */
	.panel {
		position: fixed;
		z-index: 2;
		inset-block: 0;
		right: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		width: min(560px, 92vw);
		padding: var(--space-5);
		overflow: auto;
		border-left: 1px solid var(--line);
		background: var(--surface-2);
		box-shadow: -8px 0 24px rgb(0 0 0 / 0.06);
		transform: translateX(100%);
		transition: transform 220ms cubic-bezier(0.23, 1, 0.32, 1);
	}

	.panel-open {
		transform: translateX(0);
	}

	.close {
		align-self: flex-end;
	}
</style>
