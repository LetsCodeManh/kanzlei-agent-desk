<!--
	Card (card.css): a titled panel of a screen (the inbox, the calendar, the cases). The head is a
	band with the title at the left (a heading, `level` by where the card sits) and, at the right, a
	`count` or a `sub`, then `actions`; a `badge` sits beside the title. The body is the children:
	a List for rows, a ListGroup heading over a run of them. Not a control: no hover. `fill` makes the body take the card's height under the head; `scroll`
	makes the body scroll inside a card of a given height; it says where it is (the head casts a
	shadow once rows pass under it, the rows fade into the foot while more are below).
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import './card.css';

	type Count = {
		/** how many, with its `unit` lighter after it */
		count: number | string;
		unit?: string;
		sub?: never;
	};
	type Sub = {
		count?: never;
		unit?: never;
		/** a note at the right (when it was updated), or a Tag (Overdue) */
		sub: string | Snippet;
	};
	type Nothing = { count?: never; unit?: never; sub?: never };
	type Props = Omit<HTMLAttributes<HTMLElement>, 'children' | 'title'> & {
		/** the name of the card: it labels the section */
		title: string;
		/** the title's heading level, by where the card sits */
		level?: 2 | 3 | 4;
		/** beside the title: a `.card-badge` (live is a green `.card-dot` and word) or a Tag */
		badge?: Snippet;
		/** the body: rows on background 100; none, and the card is its head alone */
		children?: Snippet;
		/** the body scrolls inside the card's given height */
		scroll?: boolean;
		/** the body takes what the card's given height leaves under the head (a calendar's tiles, a map) */
		fill?: boolean;
		/** at the right, after a count or a sub: small plain Buttons (a link with `href`: See all →) and the
		    `.card-more` icon button (with an aria-label) */
		actions?: Snippet;
	} & (Count | Sub | Nothing);
	let { title, level = 3, badge, count, unit, sub, actions, children, scroll = false, fill = false, class: className, ...rest }: Props = $props();

	const id = $props.id();

	// data-scrolled while scrolled from the top, data-more while rows are below the foot. Kept true as
	// it scrolls, as it or its rows change size, as rows are written into it and as a row's animation
	// ends (a row rising stands lower, past the foot, and no resize says when it lands).
	function edges(body: HTMLElement) {
		const update = () => {
			body.toggleAttribute('data-scrolled', body.scrollTop > 0);
			body.toggleAttribute('data-more', body.scrollTop + body.clientHeight < body.scrollHeight - 1);
		};
		const size = new ResizeObserver(update);
		const watch = () => {
			size.disconnect();
			size.observe(body);
			for (const child of body.children) size.observe(child);
			update();
		};
		const rows = new MutationObserver(watch);
		body.addEventListener('scroll', update, { passive: true });
		body.addEventListener('animationend', update);
		rows.observe(body, { childList: true });
		watch();
		return () => {
			body.removeEventListener('scroll', update);
			body.removeEventListener('animationend', update);
			size.disconnect();
			rows.disconnect();
		};
	}
</script>

<section {...rest} class={['card', className]} aria-labelledby={id}>
	<header class="card-head">
		<svelte:element this={`h${level}`} class="card-title" {id}>{title}{@render badge?.()}</svelte:element>
		<!-- {' '}: Svelte drops a plain space at the edge of a block, and the count needs it before its unit -->
		{#if count !== undefined}
			<span class="card-count">{count}{#if unit}{' '}<span class="card-count-unit">{unit}</span>{/if}</span>
		{:else if typeof sub === 'string'}
			<span class="card-sub">{sub}</span>
		{:else if sub}
			{@render sub()}
		{/if}
		{#if actions}<div class="card-actions">{@render actions()}</div>{/if}
	</header>
	{#if children}
		{#if scroll}
			<div class="card-body card-scroll" data-fill={fill || undefined} {@attach edges}>{@render children()}</div>
		{:else}
			<div class="card-body" data-fill={fill || undefined}>{@render children()}</div>
		{/if}
	{/if}
</section>
