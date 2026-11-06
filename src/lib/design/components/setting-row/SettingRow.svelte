<!--
	Setting row (setting-row.css): what a preference is and does on the left, its control (children)
	at the right. The control names itself (a Segmented's `label`): keep the setting's name and the
	control's label the same. A group of settings is a ListSection (its title) over
	a `.setting-row-list` (its rows), written by the page. On or off is a Segmented of Off and On: the system has no
	switch. The rest of the props go on the root.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import './setting-row.css';

	type Props = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
		/** what it is */
		label: string;
		/** what it does */
		sub?: string;
		/** its control, at the right */
		children: Snippet;
	};
	let { label, sub, children, class: className, ...rest }: Props = $props();
</script>

<div {...rest} class={['setting-row', className]}>
	<div class="setting-row-text">
		<p class="setting-row-name">{label}</p>
		{#if sub}<p class="setting-row-sub">{sub}</p>{/if}
	</div>
	{@render children()}
</div>
