<script lang="ts">
	import favicon from '#lib/assets/favicon.svg';
	import '#lib/design/tokens/index.css';
	import '../app.css';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Morning Briefing</title>
</svelte:head>

{@render children()}
