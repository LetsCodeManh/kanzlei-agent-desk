<!--
	Fold (fold.css): a quiet row that opens what is under it: a group's done projects, a person's
	older threads, a topic's notes. A <details>: Space and Enter on the head, find-in-page opening
	it, the state read out, all the browser's. `open` is bindable; the rest of the props go on the
	<details> (ontoggle, id, ...). Folds nest.
-->
<script lang="ts">
	import Icon from '#components/icon/Icon.svelte';
	import type { Snippet } from 'svelte';
	import type { HTMLDetailsAttributes } from 'svelte/elements';
	import './fold.css';

	type Props = Omit<HTMLDetailsAttributes, 'open' | 'children'> & {
		/** what is under it, in words ("3 done", "Tuesday 14 October · beA") */
		label: string;
		/** how many are under it, after the label ("4 messages", 5); left out when the label says it */
		count?: string | number;
		/** open or shut; bindable */
		open?: boolean;
		/** what opens */
		children: Snippet;
	};
	let { label, count, open = $bindable(false), children, class: className, ...rest }: Props = $props();
</script>

<details bind:open class={['fold', className]} {...rest}>
	<summary class="fold-head">
		<Icon name="chevron-right" class="fold-mark" />
		<span class="fold-label">{label}</span>
		{#if count != null}<span class="fold-count">{count}</span>{/if}
	</summary>
	<div class="fold-body">{@render children()}</div>
</details>
