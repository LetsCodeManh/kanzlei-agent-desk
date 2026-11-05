<!--
	Status dot (status-dot.css): a small circle that marks a state or that something is there. Not
	a control. With a label it is read aloud, without one it is decoration (aria-hidden).
-->
<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import './status-dot.css';

	type Props = HTMLAttributes<HTMLSpanElement> & {
		/** 4, 6 or 8 px */
		size?: 4 | 6 | 8;
		/** neutral is ink ("it is here"), muted is quiet gray, the rest say how it is */
		tone?: 'neutral' | 'muted' | 'success' | 'warning' | 'error';
		/** the dot's words for a screen reader. Without it the dot is decoration and hidden from one */
		label?: string;
	};
	let { size = 6, tone = 'neutral', label, class: className, ...rest }: Props = $props();
</script>

<span
	{...rest}
	class={['status-dot', className]}
	data-size={size}
	data-tone={tone}
	aria-hidden={label ? undefined : 'true'}
>{#if label}<span class="status-dot-label">{label}</span>{/if}</span>
