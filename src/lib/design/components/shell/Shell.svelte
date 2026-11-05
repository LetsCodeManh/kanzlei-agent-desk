<!--
	Shell: an app's frame, a sidebar of its screens beside the page (shell.css). The brand on top
	(a link when `home` is given), then `side` (a tree nav), then `foot` (a note, a switch);
	`children` is the page, a .grid-page main or the app's own. Tab's first stop is a link past the
	menu to the page (its <main>), seen only while it has focus. Wide, the brand on top and the foot at the bottom are held; only `side` scrolls between them, fading out under the brand once scrolled and above the foot while there is more below. Narrow (900 and under), the sidebar
	is a bar that stays on the window, the brand and the menu button (an icon, a close when open); it opens `side` and `foot` over the page, the foot held
	and `side` scrolling above it as wide (a long tree), inert while shut. A link in it or Esc shuts it; wide, it is the sidebar whatever
	it was. `hideOnScroll`: narrow, the bar slides away as the page scrolls down and comes back on any scroll up. `bar` is what else the bar holds, between the brand and the menu button (a title as it is read, a search).
-->
<script lang="ts">
	import Icon from '#components/icon/Icon.svelte';
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { MediaQuery } from 'svelte/reactivity';
	import Button from '../button/Button.svelte';
	import './shell.css';

	type Props = HTMLAttributes<HTMLDivElement> & {
		brand: Snippet;
		home?: string;
		side: Snippet;
		foot?: Snippet;
		children: Snippet;
		/** narrow: what else the bar holds, between the brand and the menu button; not in the sidebar */
		bar?: Snippet;
		/** narrow: the menu is open; bind it to shut it from the page (a search went somewhere) */
		open?: boolean;
		/** narrow: the bar slides away as the page scrolls down and comes back on any scroll up, at the top, while the menu is open or focus is in the bar */
		hideOnScroll?: boolean;
	};
	let { brand, home, side, foot, children, bar, open = $bindable(false), hideOnScroll = false, class: className, ...rest }: Props = $props();

	const id = $props.id();
	// as shell.css's @media
	const narrow = new MediaQuery('max-width: 900px', false);
	let toggle: HTMLElement | undefined;
	let root: HTMLElement | undefined;
	// narrow: the page fades out under the bar once it runs under it, not while the menu is open (shell.css)
	let scrollY = $state(0);
	// `side` scrolls on its own between the held brand (or bar) and foot, wide and in the open menu; shell.css reads these
	let sideScrolled = $state(false);
	let sideMore = $state(false);
	// one passive listener plus a ResizeObserver (the box, and what is in it: a branch opening)
	const trackSide = (el: HTMLElement) => {
		const read = () => {
			sideScrolled = el.scrollTop > 0;
			sideMore = el.scrollHeight - el.clientHeight - el.scrollTop > 1;
		};
		const ro = new ResizeObserver(read);
		ro.observe(el);
		for (const child of el.children) ro.observe(child);
		el.addEventListener('scroll', read, { passive: true });
		read();
		return () => {
			el.removeEventListener('scroll', read);
			ro.disconnect();
		};
	};

	// hideOnScroll: a move under this many px either way is a jitter (a finger's tremor, a trackpad's
	// tail, the rubber band at an end), not a direction: it neither hides nor shows the bar
	const JITTER = 6;
	let barHeight = $state(0);
	let hidden = $state(false);
	let lastY = 0;
	$effect(() => {
		const y = scrollY;
		if (!hideOnScroll || !narrow.current || open || y < barHeight) {
			hidden = false;
		} else if (y - lastY > JITTER) {
			hidden = true;
		} else if (lastY - y > JITTER) {
			hidden = false;
		} else {
			return; // inside the jitter: keep lastY, so a slow scroll still adds up
		}
		lastY = y;
	});

	// past the menu: the page takes the focus (focusable for it, as a target of a link is not)
	function skip(e: MouseEvent) {
		const main = root?.querySelector<HTMLElement>(':scope > main') ?? root?.querySelector<HTMLElement>(':scope > aside + *');
		if (!main) return;
		e.preventDefault();
		if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');
		main.focus();
	}

	function onkeydown(e: KeyboardEvent) {
		if (!open || !narrow.current || e.key !== 'Escape') return;
		open = false;
		toggle?.querySelector('button')?.focus();
	}
	// a screen picked: the menu goes, the page is what was asked for
	const shutOnLink = (menu: HTMLElement) => {
		const shut = (e: MouseEvent) => {
			if (e.target instanceof Element && e.target.closest('a[href]')) open = false;
		};
		menu.addEventListener('click', shut);
		return () => menu.removeEventListener('click', shut);
	};
</script>

<svelte:window {onkeydown} bind:scrollY />

<div {...rest} class={['shell', className]} data-hidden={hidden ? '' : undefined} data-scrolled={!open && scrollY > 0 ? '' : undefined} {@attach (el) => void (root = el)}>
	<!-- the plain pill as a link (button.css), not Button's: its link only goes, this one focuses -->
	<a class="plain shell-skip" data-size="small" href="#{id}-page" onclick={skip}>Skip to the page</a>
	<aside class="shell-side" bind:clientHeight={barHeight} data-side-scrolled={sideScrolled ? '' : undefined} data-side-more={sideMore ? '' : undefined}>
		<div class="shell-bar">
			<svelte:element this={home ? 'a' : 'p'} class="shell-brand text-label-14" href={home}>{@render brand()}</svelte:element>
			{#if bar}<div class="shell-bar-more">{@render bar()}</div>{/if}
			<span class="shell-toggle" {@attach (el) => void (toggle = el)}>
				<Button size="medium" aria-label="Menu" tooltip={false} aria-expanded={open} aria-controls="{id}-menu" onclick={() => (open = !open)}>
					{#snippet icon()}<Icon name={open ? 'close' : 'menu'} />{/snippet}
				</Button>
			</span>
		</div>
		<div class={['shell-menu', open && 'shell-open']} id="{id}-menu" inert={narrow.current && !open} {@attach shutOnLink}>
			<div class="shell-clip">
				<div class="shell-side-scroll" {@attach trackSide}>{@render side()}</div>
				{#if foot}<div class="shell-foot">{@render foot()}</div>{/if}
			</div>
		</div>
	</aside>
	{@render children()}
</div>
