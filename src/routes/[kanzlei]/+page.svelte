<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

{#if data.briefing}
	<p class="sub">Einen Eintrag wählen. Seine E-Mail öffnet sich hier, die zitierten Stellen sind markiert.</p>
{/if}
