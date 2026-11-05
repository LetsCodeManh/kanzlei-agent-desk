<!--
	An icon (icon.css): one glyph of the set (icons.ts) on Lucide's 24px grid, drawn in the text's colour.
	Decorative by default (`aria-hidden`); give it a `label` and it is an image with that name.
	The size is the box it is drawn in; the stroke scales with it. Its root takes the rest of its
	props as attributes.
-->
<script lang="ts">
	import type { SVGAttributes } from 'svelte/elements';
	import { GLYPHS, type IconName } from './icons.ts';
	import './icon.css';

	type Props = Omit<SVGAttributes<SVGSVGElement>, 'children'> & {
		/** which glyph: `icons.ts` has the set */
		name: IconName;
		/** the box in px, width and height (default 16) */
		size?: number;
		/** its name for a screen reader, when the icon says something the page does not */
		label?: string;
	};
	let { name, size = 16, label, class: className, ...rest }: Props = $props();
	const glyph = $derived(GLYPHS[name]);
</script>

<svg
	class={['icon-glyph', glyph.solid && 'icon-glyph-solid', className]}
	viewBox="0 0 24 24"
	width={size}
	height={size}
	role={label ? 'img' : undefined}
	aria-label={label}
	aria-hidden={label ? undefined : 'true'}
	{...rest}
>
	{#each glyph.shapes as shape, k (k)}
		{@const { tag, ...attrs } = shape}
		<svelte:element this={tag} {...attrs} />
	{/each}
</svg>
