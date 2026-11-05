<!--
	List group (list.css's .list-group): a heading over a run of rows (a list, a checklist, a data
	list, a case's folders), its count at the right in gray. Rest props go on the root.
-->
<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import './list.css';

	type Props = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
		name: string;
		/** at the right, gray (10 items, 2 of 5) */
		count?: string | number;
	};
	let { name, count, class: className, ...rest }: Props = $props();
</script>

<div {...rest} class={['list-group', className]}>{name}{#if count !== undefined && count !== ''}<span>{count}</span>{/if}</div>
