<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import '#components/grid/grid.css';
	import Shell from '#components/shell/Shell.svelte';
	import TreeNav from '#components/tree-nav/TreeNav.svelte';
	import Connect from '#lib/components/Connect.svelte';
	import ReadForm from '#lib/components/ReadForm.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const dayHref = $derived(resolve('/[kanzlei]/(heute)', { kanzlei: data.kanzlei }));
	const postfachHref = $derived(resolve('/[kanzlei]/postfach', { kanzlei: data.kanzlei }));
	const openTasks = $derived(data.briefing?.day.aufgaben.filter((row) => !data.ticked.includes(row.id)).length ?? 0);
	const sections = $derived([
		{
			alone: true,
			pages: [
				{ name: 'Heute', href: dayHref, icon: 'house' as const, count: openTasks },
				{ name: 'Postfach', href: postfachHref, icon: 'inbox' as const, count: data.briefing?.day.postfach.length ?? 0 }
			]
		}
	]);
	// An email on "Heute" is still "Heute". The nav marks the tab, not the URL.
	const current = $derived(page.route.id?.includes('/postfach') ? postfachHref : dayHref);
</script>

{#if data.briefing}
	<Shell home={dayHref} style="background: var(--background-200)">
		{#snippet brand()}<span>{data.info.name}</span>{/snippet}
		{#snippet side()}
			<TreeNav {sections} {current} label="Bereiche">
				{#snippet end(leaf)}<span class="count">{leaf.count}</span>{/snippet}
			</TreeNav>
		{/snippet}
		{#snippet foot()}
			<p class="shell-note text-label-13"><b>{data.info.anwalt.name}</b></p>
			<div class="shell-note text-label-13 mailbox">
				<span>Outlook verbunden (simuliert)</span>
				<span class="address">{data.info.anwalt.address}</span>
			</div>
			<ReadForm kanzlei={data.kanzlei} label="Neu lesen" size="small" />
			<p class="demo">Demo · erfundene Daten · <a href={resolve('/')}>Kanzlei wechseln</a></p>
		{/snippet}
		{@render children()}
	</Shell>
{:else}
	<div class="connect">
		<p class="demo strip">Demo · erfundene Daten · <a href={resolve('/')}>Kanzlei wechseln</a></p>
		<Connect kanzlei={data.kanzlei} info={data.info} failed={data.failed} />
	</div>
{/if}

<style>
	.count {
		flex: none;
		margin-left: auto;
		color: var(--gray-900);
		font-size: 12px;
		font-weight: 400;
		font-variant-numeric: tabular-nums;
	}

	.mailbox {
		display: grid;
		gap: var(--space-0-5);
		min-width: 0;
	}

	.address {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.demo {
		color: var(--gray-900);
		font-size: 12px;
		line-height: 16px;
	}

	.demo a {
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.connect {
		display: grid;
		grid-template-rows: auto minmax(0, 1fr);
		min-height: 100dvh;
	}

	.strip {
		padding: var(--space-1) var(--space-5);
		text-align: center;
	}
</style>
