<!--
	Keyboard key (kbd.css): a key to press, drawn as a keycap. One key, its label the children; or
	`keys`, a combo pressed together, modifiers first. Medium 24px, `small` 20px for running text
	and inside a field. `down` is the pressed look, set by a page that echoes the keyboard. A key
	is never clickable: it names what to press.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import './kbd.css';

	type Key = {
		/** the label: the key's own symbol (⌘, ⇧, ↵) or its short name (esc, Space) */
		children: Snippet;
		keys?: never;
		/** held down: it sinks and the lip closes */
		down?: boolean;
	};
	type Combo = {
		children?: never;
		/** keys pressed together, in the order they are pressed: modifiers first */
		keys: string[];
		/** the labels of the keys held down */
		down?: string[];
	};
	type Props = Omit<HTMLAttributes<HTMLElement>, 'children'> & {
		/** 20px, for running text and inside a field */
		small?: boolean;
	} & (Key | Combo);
	let { keys, small = false, down, children, class: className, ...rest }: Props = $props();
</script>

{#if keys}
	<span {...rest} class={['kbd-combo', className]}>
		{#each keys as label (label)}
			<kbd class={['kbd', small && 'kbd-small']} data-down={Array.isArray(down) && down.includes(label) ? '' : undefined}>{label}</kbd>
		{/each}
	</span>
{:else}
	<kbd {...rest} class={['kbd', small && 'kbd-small', className]} data-down={down === true ? '' : undefined}>
		{@render children?.()}
	</kbd>
{/if}
