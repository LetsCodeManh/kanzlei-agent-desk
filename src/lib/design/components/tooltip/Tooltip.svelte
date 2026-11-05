<!--
	Tooltip (tooltip.css): a small card that says what a thing is, opened by hovering or focusing it. It wraps
	nothing: `children` is a snippet that receives `trigger`, the props for the element that opens it, and you
	spread them on that element (a link, a chip, a button). The card is a sibling after it.
	  <Tooltip title="Tide pool">{#snippet children(trigger)}<a href="/x" {...trigger}>Tide pool</a>{/snippet}</Tooltip>
	The card is role=tooltip and the trigger points at it with aria-describedby, so a screen reader reads it on
	focus; it is never focusable. It opens after 120ms, closes on leave, blur, Esc and scroll, and stays open
	while the pointer is on it (WCAG 1.4.13). Below the trigger, above it when there is no room below.
	With only a `title` it is a label (.tooltip-label): one small line, an optional `shortcut` key after it,
	for an icon-only control. `describe={false}` drops aria-describedby, for a control that has its own
	aria-label (Button does): the name is not read twice. Warm-up: right after one tooltip, the next opens at once.
-->
<script module lang="ts">
	// Warm-up, for a row of icon buttons: while one tooltip is open, or for WARM ms after the last
	// closed, the next opens at once. Shared by every Tooltip on the page.
	const WARM = 500;
	let openCount = 0;
	let closedAt = -Infinity;
	const warm = () => openCount > 0 || performance.now() - closedAt < WARM;
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { createAttachmentKey, type Attachment } from 'svelte/attachments';
	import type { HTMLAttributes } from 'svelte/elements';
	import Icon from '#components/icon/Icon.svelte';
	import type { IconName } from '#components/icon/icons.ts';
	import Kbd from '#components/kbd/Kbd.svelte';
	import './tooltip.css';

	/** what to spread on the trigger element: `<a {...trigger}>` */
	export type TooltipTrigger = {
		'aria-describedby'?: string;
		onmouseenter: () => void;
		onmouseleave: () => void;
		onfocus: () => void;
		onblur: () => void;
		[key: symbol]: Attachment<HTMLElement>;
	};

	type Props = Omit<HTMLAttributes<HTMLSpanElement>, 'children' | 'title'> & {
		/** the card's one line of weight: what the thing is called */
		title: string;
		/** small gray line above the title: its kind and topic */
		meta?: string;
		/** a line or two under the title, in gray, wrapping */
		summary?: string;
		/** a glyph before the title, in the title's colour */
		icon?: IconName;
		/** a label's key, a small Kbd after the text; a screen reader gets it from the control's aria-keyshortcuts, not here */
		shortcut?: string;
		/** the trigger points at the tooltip with aria-describedby; false where the control already has its own name (a label on an icon button) */
		describe?: boolean;
		/** the card open in the flow under the trigger, not floating: to show it without hovering (the docs) */
		pinned?: boolean;
		/** the trigger: spread `trigger` on the element that opens the card */
		children: Snippet<[TooltipTrigger]>;
	};
	let { title, meta, summary, icon, shortcut, describe = true, pinned = false, children, class: className, ...rest }: Props = $props();

	const id = $props.id();
	const SHOW = 120; // a pass over a trigger is not a look
	const HIDE = 100; // time to cross from the trigger to its card
	const GAP = 8;
	const MARGIN = 16;

	let anchor = $state<HTMLElement>();
	let card = $state<HTMLElement>();
	let shown = $state(false);
	let left = $state(0);
	let top = $state(0);
	let flip = $state(false);
	let timer = 0;
	let lowerTimer = 0;

	const visible = $derived(pinned || shown);
	const label = $derived(!meta && !summary && !icon);

	function place() {
		if (!anchor || !card) return;
		const r = anchor.getBoundingClientRect();
		const w = card.offsetWidth;
		const h = card.offsetHeight;
		left = Math.min(Math.max(r.left + r.width / 2 - w / 2, MARGIN), innerWidth - w - MARGIN);
		// below the trigger; above when it would run off the bottom and there is more room above
		flip = r.bottom + GAP + h > innerHeight - MARGIN && r.top - GAP - h >= MARGIN;
		top = flip ? r.top - GAP - h : r.bottom + GAP;
	}
	// The card is a popover, so it sits in the top layer: positioned against the window, whatever its trigger's
	// ancestors transform (a toast's translate and scale would otherwise become its containing block).
	function lift() {
		clearTimeout(lowerTimer);
		if (!pinned && card && !card.matches(':popover-open')) card.showPopover();
	}
	function show() {
		clearTimeout(timer);
		const open = () => { lift(); place(); shown = true; };
		if (warm()) open();
		else timer = window.setTimeout(open, SHOW);
	}
	function hide() {
		clearTimeout(timer);
		timer = window.setTimeout(() => (shown = false), HIDE);
	}
	function keep() { clearTimeout(timer); }
	function esc(e: KeyboardEvent) {
		if (e.key === 'Escape' && shown) { clearTimeout(timer); shown = false; }
	}
	function dismissOnScroll() { if (shown) shown = false; }
	// openCount and closedAt follow `shown`, whoever closes it
	$effect(() => {
		if (!shown) return;
		openCount++;
		return () => {
			openCount--;
			closedAt = performance.now();
		};
	});

	$effect(() => {
		if (!shown) return;
		addEventListener('keydown', esc);
		addEventListener('scroll', dismissOnScroll, { capture: true, passive: true });
		return () => {
			removeEventListener('keydown', esc);
			removeEventListener('scroll', dismissOnScroll, { capture: true });
		};
	});
	// once it has faded out, it leaves the top layer
	$effect(() => {
		if (shown || pinned || !card) return;
		lowerTimer = window.setTimeout(() => card?.matches(':popover-open') && card.hidePopover(), 250);
		return () => clearTimeout(lowerTimer);
	});
	$effect(() => () => { clearTimeout(timer); clearTimeout(lowerTimer); });

	const trigger: TooltipTrigger = {
		get 'aria-describedby'() { return describe ? id : undefined; },
		onmouseenter: show,
		onmouseleave: hide,
		onfocus: show,
		onblur: hide,
		[createAttachmentKey()]: (el) => {
			anchor = el;
			return () => (anchor = undefined);
		}
	};
</script>

{@render children(trigger)}<span
	{...rest}
	{id}
	bind:this={card}
	class={['tooltip-card', 'material-menu', label && 'tooltip-label', className]}
	role="tooltip"
	popover={pinned ? undefined : 'manual'}
	data-open={visible ? '' : undefined}
	data-flip={flip ? '' : undefined}
	data-pinned={pinned ? '' : undefined}
	style:left={pinned ? undefined : `${left}px`}
	style:top={pinned ? undefined : `${top}px`}
	onmouseenter={keep}
	onmouseleave={hide}
>
	{#if meta}<span class="tooltip-meta text-label-12">{meta}</span>{/if}
	<span class={['tooltip-head', label ? 'text-label-12' : 'text-label-14']}>
		{#if icon}<Icon name={icon} class="tooltip-icon" />{/if}
		<span class="tooltip-title">{title}</span>
		{#if label && shortcut}<Kbd small aria-hidden="true">{shortcut}</Kbd>{/if}
	</span>
	{#if summary}<span class="tooltip-summary text-copy-13">{summary}</span>{/if}
</span>
