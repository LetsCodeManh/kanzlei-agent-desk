<script lang="ts">
	import Notice from '#components/notice/Notice.svelte';
	import type { Briefing } from '#lib/types.ts';

	/** Over every screen: a failed run and an email not read must not wait in one tab. */
	let { failed, notRead }: { failed: boolean; notRead: Briefing['notRead'] } = $props();
</script>

{#if failed}
	<Notice tone="error">Das Postfach konnte nicht gelesen werden. Unten steht der letzte Stand.</Notice>
{/if}
{#each notRead as email (email.id)}
	<Notice tone="error">
		Nicht gelesen: {[email.sender || email.id, email.subject].filter(Boolean).join(', ')}. {email.reason}. Bitte im Postfach selbst prüfen.
	</Notice>
{/each}
