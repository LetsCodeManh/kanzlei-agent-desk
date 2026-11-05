<!--
	Notice (notice.css): a short message in the flow of a page. Neutral is a note. Error is a
	problem the reader can act on. Not a toast: it stays where it is put, it does not time out.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import './notice.css';

	type Props = HTMLAttributes<HTMLDivElement> & {
		/** neutral without. An error is red, and the words say so too, so colour is never alone */
		tone?: 'error';
		/** the text, one or two lines. May hold a link, or a strong word */
		children: Snippet;
		/** set when the notice appears after the page loaded (a save that failed): it is then read aloud at once.
		 *  Leave it off for one that was there on load, or it interrupts the screen reader for nothing */
		live?: boolean;
		/** a control at the end (a retry button, a link) */
		action?: Snippet;
	};
	let { tone, children, live = false, action, class: className, ...rest }: Props = $props();
</script>

<div role={live ? 'alert' : 'note'} {...rest} class={['notice', className]} data-tone={tone}>
	<p class="notice-text">{@render children()}</p>
	{#if action}<span class="notice-action">{@render action()}</span>{/if}
</div>
