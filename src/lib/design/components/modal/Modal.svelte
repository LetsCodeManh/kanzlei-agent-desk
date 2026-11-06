<!--
	Modal (modal.css): a dialog over the page, ringed by the metal's chrome rim. `open` (bindable) shows
	and hides it; Escape, the ×, any [data-modal-close] inside it and a click on the backdrop close it
	(the press must have started on the backdrop too: a drag out of a text field doesn't). `beforeclose`
	can refuse those four, for work that would be lost. The browser
	keeps focus inside and hands it back on close; it opens with focus on itself, or on a control
	marked autofocus. `place="side"` is a sheet along the right edge;
	`size="wide"` is 560. The footer band is there only when `actions` is given. `inline` draws it open
	in the page's flow, inert: a picture for the docs. The rest of the props go on the <dialog>.
-->
<script module lang="ts">
	import Icon from '#components/icon/Icon.svelte';
	import Tooltip from '../tooltip/Tooltip.svelte';
	/** What <dialog> doesn't do alone: the ×, [data-modal-close] and a click on the backdrop close
	    it. An attachment, for a dialog of the modal's look with no title bar (the command menu).
	    `mayClose` false keeps it open, Escape too. */
	export function modalClose(node: HTMLDialogElement, mayClose?: () => boolean) {
		const close = () => {
			if (!mayClose || mayClose()) node.close();
		};
		const outside = (e: MouseEvent) => {
			const r = node.getBoundingClientRect();
			return e.target === node && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom);
		};
		let pressedOutside = false;
		const down = (e: PointerEvent) => (pressedOutside = outside(e));
		const click = (e: MouseEvent) => {
			if ((e.target as Element).closest('.modal-close, [data-modal-close]')) close();
			else if (pressedOutside && outside(e)) close();
		};
		// Escape on the keydown, not the cancel event: Chrome closes on a second Escape in a row and fires no cancel.
		const key = (e: KeyboardEvent) => {
			if (e.key !== 'Escape') return;
			e.preventDefault();
			close();
		};
		// A close request with no key: a phone's back gesture.
		const cancel = (e: Event) => {
			if (mayClose && !mayClose()) e.preventDefault();
		};
		node.addEventListener('pointerdown', down);
		node.addEventListener('click', click);
		if (mayClose) {
			node.addEventListener('keydown', key);
			node.addEventListener('cancel', cancel);
		}
		return () => {
			node.removeEventListener('pointerdown', down);
			node.removeEventListener('click', click);
			node.removeEventListener('keydown', key);
			node.removeEventListener('cancel', cancel);
		};
	}
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLDialogAttributes } from 'svelte/elements';
	import '../button/button.css';
	import './modal.css';

	type Common = {
		/** shown over the page; bindable, set back to false when it closes */
		open?: boolean;
		/** the title bar's heading, and the dialog's accessible name */
		title: string;
		/** the body */
		children: Snippet;
		/** the footer band's content (a key hint, Cancel, Done); a button with data-modal-close closes the modal */
		actions?: Snippet;
		/** the × in the title bar; false drops it where the footer already says how to close (an esc hint, Cancel). Escape and a click outside still close it */
		closeButton?: boolean;
		/** the ×'s name and tooltip, in the page's language */
		closeLabel?: string;
		/** asked before Escape, the ×, data-modal-close or a click outside closes it; false keeps it open. Setting `open` is not asked */
		beforeclose?: () => boolean;
	};
	type Centred = {
		/** 400 wide without; wide 560, for rows with fields */
		size?: 'wide';
		place?: never;
		/** open in place, inert, as a picture; not over the page */
		inline?: boolean;
	};
	type Side = {
		size?: never;
		/** a sheet along the right edge, the page still there at its left (a person's whole file) */
		place: 'side';
		inline?: never;
	};
	type Props = Omit<HTMLDialogAttributes, 'open' | 'title' | 'children' | 'aria-labelledby'> & Common & (Centred | Side);
	let { open = $bindable(false), title, children, actions, closeButton = true, closeLabel = 'Close', beforeclose, size, place, inline, class: className, ...rest }: Props = $props();

	const uid = $props.id();
	const titleId = `${uid}-title`;
	let dialog: HTMLDialogElement | undefined = $state();

	// `open` drives the dialog; the dialog (Escape, ×, backdrop) drives `open` back through onclose
	$effect(() => {
		if (!dialog) return;
		const shown = inline || open;
		if (shown && !dialog.open) {
			if (inline) return dialog.show();
			dialog.showModal();
			// focus on the dialog itself, not its first control: the × would show its ring and its
			// tooltip as it opens. A control marked autofocus (a field) still takes it; Tab reaches the ×
			if (!dialog.querySelector('[autofocus]')) dialog.focus();
		} else if (!shown && dialog.open) dialog.close();
	});
</script>

<dialog
	{...rest}
	bind:this={dialog}
	class={['modal', className]}
	aria-labelledby={titleId}
	tabindex="-1"
	data-size={size}
	data-place={place}
	inert={inline || rest.inert}
	onclose={() => (open = false)}
	{@attach (node) => modalClose(node, beforeclose)}
>
	<span class="metal-rim one" aria-hidden="true"></span><span class="metal-rim two" aria-hidden="true"></span>
	<span class="metal-rim glint" aria-hidden="true"></span>
	<header class="modal-head">
		<h2 class="modal-title text-heading-20" id={titleId}>{title}</h2>
		{#if closeButton}
			<Tooltip title={closeLabel} describe={false}>
				{#snippet children(t)}
					<button {...t} class="modal-close" type="button" aria-label={closeLabel}>
						<Icon name="close" />
					</button>
				{/snippet}
			</Tooltip>
		{/if}
	</header>
	<div class="modal-body">{@render children()}</div>
	{#if actions}<footer class="modal-foot">{@render actions()}</footer>{/if}
</dialog>
