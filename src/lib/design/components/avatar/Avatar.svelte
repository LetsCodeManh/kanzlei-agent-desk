<!--
	Avatar (avatar.css): who wrote or who it is, as letters in a gray circle. `letters` is what it shows: `initials(name)`
	for a name, or a short word ("Sie"). Decoration: the name stands beside it, so a screen reader skips it.
-->
<script module lang="ts">
	/** The first letters of a name's first two words. A mail address counts its parts: maria.muster@… is MM. */
	export function initials(name: string): string {
		return name
			.split(/[\s@.]+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((word) => word[0].toUpperCase())
			.join('');
	}
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import './avatar.css';

	type Props = Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & {
		/** what it shows: two letters, or a word of three at most */
		letters: string;
	};
	let { letters, class: className, ...rest }: Props = $props();
</script>

<span {...rest} class={['avatar', className]} aria-hidden="true">{letters}</span>
