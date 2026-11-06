<!--
	List section (list.css's .list-section): a mono title over its rows (a list, steps, a checklist,
	settings), two levels: the section's gap between the title and its rows, the rows' own gap or
	padding between them. Sections stack in their parent's gap, wider than this one. Rest props go on the root.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import './list.css';

	type Props = Omit<HTMLAttributes<HTMLElement>, 'children' | 'title'> & {
		/** the mono title over the rows */
		title: string;
		/** the rows, one element */
		children: Snippet;
	};
	let { title, children, class: className, ...rest }: Props = $props();
</script>

<section {...rest} class={['list-section', className]}>
	<h3 class="list-title">{title}</h3>
	{@render children()}
</section>
