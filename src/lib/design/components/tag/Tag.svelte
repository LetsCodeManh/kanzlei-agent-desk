<!--
	Tag (tag.css): a short label on a tone, beside what it qualifies. Neutral without a tone. Not a
	control: no hover, no focus.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import './tag.css';

	type Props = HTMLAttributes<HTMLSpanElement> & {
		/** neutral without; the word says it too, so colour is never alone */
		tone?: 'success' | 'warning' | 'error';
		/** the label, one line */
		children: Snippet;
	};
	let { tone, children, class: className, ...rest }: Props = $props();
</script>

<span {...rest} class={['tag', className]} data-tone={tone}>{@render children()}</span>
