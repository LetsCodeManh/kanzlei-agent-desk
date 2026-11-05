<script module lang="ts">
	import type { IconName } from '#components/icon/icons.ts';

	/** A page. Without `href`, a page not built yet: in the list, greyed, not a link.
	    `shortcut` is its go-to keys ("G C"): the last one shows at its end while an ancestor
	    has data-tree-nav-keys. `icon` leads a leaf of a section that stands `alone`. */
	export type TreeNavLeaf = { name: string; href?: string; shortcut?: string; icon?: IconName };
	export type TreeNavBranch<L extends TreeNavLeaf = TreeNavLeaf> = { name: string; pages: L[] };
	/** Under its heading (a link with `href`), either leaves or branches, each a drawer of leaves.
	    `fold`: the heading folds what is under it (Fold's row, with how many leaves), and is not a link.
	    `alone`: its leaves stand by themselves, an app's few screens: no guide line, no marker, the current one filled. */
	export type TreeNavSection<L extends TreeNavLeaf = TreeNavLeaf> = {
		heading?: string;
		href?: string;
		fold?: boolean;
		alone?: boolean;
		pages?: L[];
		branches?: TreeNavBranch<L>[];
	};

	const read = (key: string): Record<string, boolean> => {
		try {
			return JSON.parse(sessionStorage.getItem(key) ?? '{}') || {};
		} catch {
			return {};
		}
	};
</script>

<!--
	Tree nav: a site's sections as a file tree (tree-nav.css). The leaf whose href is `current`
	has the marker; change `current` (a route) and the marker slides there. A drawer (or a folding
	heading) is open if it holds the current leaf or has held it since the nav came, unless the user
	shut it: going to another page shuts none, or the rows under the pointer that just picked one
	would move, and opens what holds it, even if shut. What the user opened or shut is kept for the
	tab under `storageKey` (sessionStorage). `end` is what sits at a leaf's end (a status).
-->
<script lang="ts" generics="L extends TreeNavLeaf">
	import Icon from '#components/icon/Icon.svelte';
	import { onMount, untrack, type Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import Fold from '../fold/Fold.svelte';
	import Kbd from '../kbd/Kbd.svelte';
	import './tree-nav.css';

	type Props = HTMLAttributes<HTMLElement> & {
		/** Headings, each with leaves or branches of leaves. */
		sections: TreeNavSection<L>[];
		/** The href whose leaf has the marker. */
		current?: string;
		/** The nav's aria-label. */
		label: string;
		/** Keeps what is opened or shut for the tab (sessionStorage). */
		storageKey?: string;
		/** Drawn at a leaf's end, as a status. */
		end?: Snippet<[L]>;
	};
	let { sections, current, label, storageKey, end, class: className, ...rest }: Props = $props();
	const id = $props.id();

	// a branch (heading/name) -> opened (true) or shut (false) by the user
	let chosen: Record<string, boolean> = $state({});
	onMount(() => {
		if (storageKey) chosen = read(storageKey);
	});

	const isCurrent = (page: L) => page.href !== undefined && page.href === current;
	const branchKey = (section: TreeNavSection<L>, branch: TreeNavBranch<L>) => `${section.heading ?? ''}/${branch.name}`;
	const all = (section: TreeNavSection<L>) => [...(section.pages ?? []), ...(section.branches ?? []).flatMap((b) => b.pages)];

	// what has held the current leaf since the nav came: open until the user shuts it. Going to a page opens
	// what holds it, even if the user had shut it, so the reader sees where they are; a load keeps what was shut
	let held: Record<string, boolean> = $state({});
	let was: string | undefined;
	$effect(() => {
		const keys: string[] = [];
		for (const section of sections) {
			if (section.fold && section.heading && all(section).some(isCurrent)) keys.push(section.heading);
			for (const branch of section.branches ?? []) if (branch.pages.some(isCurrent)) keys.push(branchKey(section, branch));
		}
		const moved = was !== undefined && was !== current;
		was = current;
		untrack(() => {
			for (const key of keys) {
				held[key] = true;
				if (moved && chosen[key] === false) delete chosen[key];
			}
			if (moved) keep();
		});
	});

	function toggle(key: string, open: boolean) {
		chosen[key] = !open;
		keep();
	}
	function keep() {
		if (!storageKey) return;
		try {
			sessionStorage.setItem(storageKey, JSON.stringify(chosen));
		} catch {
			// private mode: kept until the page goes
		}
	}

	// the full name as a tooltip, only where it is cut off (a leaf's or a branch's)
	function tip(e: Event) {
		const a = (e.target as Element).closest?.<HTMLElement>('a, button.tree-nav-branch');
		const name = a?.querySelector('.tree-nav-name');
		if (a && name) a.title = name.scrollWidth > name.clientWidth ? (name.textContent ?? '') : '';
	}
</script>

{#snippet leaf(page: L)}
	<a
		class="text-label-14"
		href={page.href}
		aria-current={isCurrent(page) ? 'page' : undefined}
		aria-keyshortcuts={page.shortcut}
		>{#if page.icon}<Icon name={page.icon} class="tree-nav-icon" />{/if}<span class="tree-nav-name">{page.name}</span>{#if page.shortcut}<Kbd small class="tree-nav-key" aria-hidden="true"
				>{page.shortcut.split(' ').at(-1)}</Kbd
			>{/if}{@render end?.(page)}</a
	>
{/snippet}

{#snippet leaves(pages: L[])}
	{@const at = pages.findIndex(isCurrent)}
	<div class="tree-nav-clip">
		{#if at >= 0}<span class="tree-nav-marker" aria-hidden="true" style:--tree-nav-at={at}></span>{/if}
		<ul class="tree-nav-leaves">
			{#each pages as page (page.href ?? page.name)}
				<li>{@render leaf(page)}</li>
			{/each}
		</ul>
	</div>
{/snippet}

<!-- what is under a heading: its branches, each a drawer of leaves, or its leaves -->
{#snippet body(section: TreeNavSection<L>, s: number)}
	{#if section.branches}
		<ul>
			{#each section.branches as branch, b (branch.name)}
				{@const key = branchKey(section, branch)}
				{@const holds = branch.pages.some(isCurrent)}
				{@const open = chosen[key] ?? (holds || !!held[key])}
				{@const drawer = `${id}-${s}-${b}`}
				<li>
					<button
						class={['tree-nav-branch text-label-14', holds && 'tree-nav-here']}
						type="button"
						aria-expanded={open}
						aria-controls={drawer}
						onclick={() => toggle(key, open)}
						><Icon name="chevron-right" class="tree-nav-chevron" /><span class="tree-nav-name">{branch.name}</span><span class="tree-nav-count text-label-12-mono">{branch.pages.length}</span></button
					>
					<div class={['tree-nav-drawer', open && 'tree-nav-open']} id={drawer} inert={!open}>
						{@render leaves(branch.pages)}
					</div>
				</li>
			{/each}
		</ul>
	{:else if section.pages && section.alone}
		<ul class="tree-nav-alone">
			{#each section.pages as page (page.href ?? page.name)}
				<li>{@render leaf(page)}</li>
			{/each}
		</ul>
	{:else if section.pages}
		{@render leaves(section.pages)}
	{/if}
{/snippet}

<nav {...rest} class={['tree-nav', className]} aria-label={label} onpointerover={tip} onfocusin={tip}>
	{#each sections as section, s (section)}
		{#if section.fold && section.heading}
			{@const key = section.heading}
			{@const open = chosen[key] ?? (all(section).some(isCurrent) || !!held[key])}
			<!-- only what the user does is kept: a toggle the page caused (open as it should be) is not -->
			<Fold class="tree-nav-fold" label={section.heading} count={all(section).length} {open} ontoggle={(e) => e.currentTarget.open !== open && toggle(key, open)}>
				{@render body(section, s)}
			</Fold>
		{:else}
			<section>
				{#if section.heading && section.href}
					<a class="tree-nav-heading text-label-12-mono" href={section.href} aria-current={section.href === current ? 'page' : undefined}
						>{section.heading}</a
					>
				{:else if section.heading}
					<span class="tree-nav-heading text-label-12-mono">{section.heading}</span>
				{/if}
				{@render body(section, s)}
			</section>
		{/if}
	{/each}
</nav>
