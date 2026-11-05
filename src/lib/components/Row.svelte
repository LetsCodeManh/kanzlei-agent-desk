<script lang="ts">
	import type { Snippet } from 'svelte';

	/** No `href`: nothing to open, such as a line from `akten.json`. It must not look clickable. */
	let { href, current = false, children }: { href?: string; current?: boolean; children: Snippet } = $props();
</script>

{#if href}
	<a {href} class="row" aria-current={current ? 'true' : undefined}>{@render children()}</a>
{:else}
	<div class="row">{@render children()}</div>
{/if}

<style>
	.row {
		display: block;
		margin-inline: calc(var(--space-2) * -1); /* a bleed: the hover's ground, with the text still on the column */
		padding: var(--space-1) var(--space-2);
		border-radius: 6px;
	}

	a:hover {
		background: var(--surface-hover);
	}

	a[aria-current] {
		background: var(--surface-selected);
	}
</style>
