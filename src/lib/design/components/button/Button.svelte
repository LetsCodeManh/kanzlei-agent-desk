<!--
	Button (button.css). Plain, a gray pill, for almost everything: 44px, `size` medium 36 or small
	28; `shortcut` puts its key at the end; `pressed` (bindable) makes it a toggle, flipped by a
	click. An `icon` alone: it is then as wide as it is tall, the icon in its middle, and it
	needs an aria-label.
	`href` makes a plain one a link to another screen, the same pill (See all →).
	An icon alone also shows its aria-label as a label Tooltip on hover and focus (with its `shortcut`);
	`tooltip={false}` turns that off.
	`loading` (busy: a spinner in the label's place, same size) and `disabled` (inactive) are
	aria-busy and aria-disabled, never the native disabled: both stay focusable, and the click is
	ignored here.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import Kbd from '../kbd/Kbd.svelte';
	import Tooltip, { type TooltipTrigger } from '../tooltip/Tooltip.svelte';
	import './button.css';

	type Common = {
		/** an action is under way: a spinner takes the label's place, the button keeps its size; focusable, the click ignored (aria-busy) */
		loading?: boolean;
		/** the action is impossible right now: gray, focusable so it can be explained, the click ignored (aria-disabled); the native disabled is not offered */
		disabled?: boolean;
		/** an icon alone shows its aria-label as a label tooltip (default); false for none */
		tooltip?: boolean;
	};
	type Plain = {
		/** 44px without; medium 36 where 44 would crowd, small 28 in a row of text or as one toggle of many */
		size?: 'small' | 'medium';
		/** its key, shown at the end (an icon alone: in its tooltip) and named in aria-keyshortcuts ("?") */
		shortcut?: string;
		/** set, it is a toggle (aria-pressed), flipped by a click; bindable */
		pressed?: boolean;
		/** a 16px icon alone, aria-hidden: the button is as wide as tall and needs an aria-label */
		icon?: Snippet;
		href?: never;
	};
	type Link = {
		size?: 'small' | 'medium';
		/** a link in the plain pill: it goes somewhere, it does nothing here */
		href: string;
		shortcut?: never;
		pressed?: never;
		icon?: never;
		loading?: never;
		disabled?: never;
	};
	// The native `disabled` is not offered: `disabled` here is the boolean above, and it is taken out of
	// the rest props, so it can never reach the <button>. aria-busy and aria-disabled are ours alone.
	type Props = Omit<HTMLButtonAttributes, 'disabled' | 'aria-busy' | 'aria-disabled'> & Common & (Plain | Link);
	let {
		size,
		shortcut,
		pressed = $bindable(),
		icon,
		href,
		loading,
		disabled,
		tooltip = true,
		children,
		type = 'button',
		class: className,
		onclick,
		...rest
	}: Props = $props();

	$effect.pre(() => {
		if (!children && !icon) throw new Error('Button: give it a label (children) or an icon');
		if (!children && !rest['aria-label'] && !rest['aria-labelledby']) throw new Error('Button: an icon alone needs an aria-label');
	});

	// an icon alone, named by an aria-label: its name is the tooltip's label
	const name = $derived(!children && !href && tooltip ? rest['aria-label'] : undefined);
	// the tooltip's handlers and the caller's own, both called
	function hooks(t: TooltipTrigger): HTMLButtonAttributes {
		const both = <E extends Event>(mine: () => void, theirs?: ((e: E) => void) | null) => (e: E) => { theirs?.(e); mine(); };
		return {
			...t,
			onmouseenter: both(t.onmouseenter, rest.onmouseenter),
			onmouseleave: both(t.onmouseleave, rest.onmouseleave),
			onfocus: both(t.onfocus, rest.onfocus),
			onblur: both(t.onblur, rest.onblur)
		} as HTMLButtonAttributes;
	}

	type Click = MouseEvent & { currentTarget: EventTarget & HTMLButtonElement };
	// busy or disabled: the click is ours to ignore (the button stays focusable, so no native disabled); a submit doesn't submit
	function click(e: Click) {
		if (loading || disabled) return e.preventDefault();
		onclick?.(e);
		if (pressed !== undefined && !e.defaultPrevented) pressed = !pressed;
	}
</script>

{#snippet spinner()}
	<svg class="button-spinner" viewBox="0 0 16 16" aria-hidden="true">
		{#each { length: 8 } as _, i (i)}
			<line x1="8" y1="2" x2="8" y2="4.6" transform="rotate({i * 45} 8 8)" opacity={1 - i * 0.12} />
		{/each}
	</svg>
{/snippet}

{#snippet plainButton(t?: TooltipTrigger)}
	<button
		{...rest}
		{...t && hooks(t)}
		class={['plain', !children && 'button-square', className]}
		data-size={size}
		{type}
		aria-pressed={pressed}
		aria-keyshortcuts={shortcut}
		aria-busy={loading ? 'true' : undefined}
		aria-disabled={disabled ? 'true' : undefined}
		onclick={click}
	>
		{@render icon?.()}{@render children?.()}{#if shortcut && children}<Kbd small aria-hidden="true">{shortcut}</Kbd>{/if}{#if loading}{@render spinner()}{/if}
	</button>
{/snippet}

{#if href}
	<a {...rest as Record<string, unknown>} class={['plain', className]} data-size={size} {href}>{@render children?.()}</a>
{:else if name}
	<Tooltip title={name} {shortcut} describe={false}>{#snippet children(t)}{@render plainButton(t)}{/snippet}</Tooltip>
{:else}
	{@render plainButton()}
{/if}
