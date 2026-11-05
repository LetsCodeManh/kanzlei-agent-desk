<!--
	Empty state (empty-state.css): what a card or a list says when it has nothing yet, or is still
	loading. In a card (`place` card): a `line`, a `hint` and, when there is a way out, one `action`.
	Inline, where a row would be: the line alone. `loading` swaps all of it for skeleton lines
	(three, one inline) and a screen-reader `caption`; the state is aria-busy. Not a control: only
	the action takes focus.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import './empty-state.css';

	type Empty = {
		loading?: false;
		/** what is missing, sentence case ("No emails today") */
		line: string;
		caption?: never;
	};
	type Loading = {
		/** data is on its way: skeleton lines, never the empty line */
		loading: true;
		/** read out while loading ("Loading emails…"); visually hidden */
		caption: string;
		line?: never;
		hint?: never;
		action?: never;
	};
	type Card = {
		/** in a card's body, centred (default) */
		place?: 'card';
		/** the way out, in words */
		hint?: string;
		/** the way out as a control: a `<Button>` (the 36px height is set here) */
		action?: Snippet;
	};
	type Inline = {
		/** where a row would be: the line alone, left */
		place: 'inline';
		hint?: never;
		action?: never;
	};
	type Props = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & (Empty | Loading) & (Card | Inline);
	let { place = 'card', loading = false, line, caption, hint, action, class: className, ...rest }: Props = $props();
</script>

<div {...rest} class={['empty-state', className]} data-place={place} aria-busy={loading ? 'true' : undefined}>
	{#if loading}
		<span class="empty-state-skeleton" aria-hidden="true"><i></i><i></i><i></i></span>
		<span class="empty-state-caption">{caption}</span>
	{:else}
		<div class="empty-state-text">
			<span class="empty-state-line">{line}</span>
			{#if hint}<span class="empty-state-hint">{hint}</span>{/if}
		</div>
		{@render action?.()}
	{/if}
</div>
