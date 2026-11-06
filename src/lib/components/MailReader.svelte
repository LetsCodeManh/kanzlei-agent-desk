<!--
	The open email in the Postfach: what a mail client offers on it, and the email.
	Opening it marks it read. By a POST on mount, not in the load, because a hover preloads the load.
-->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	import Button from '#components/button/Button.svelte';
	import Card from '#components/card/Card.svelte';
	import Icon from '#components/icon/Icon.svelte';
	import MailComposer from '#lib/components/MailComposer.svelte';
	import MailMessage from '#lib/components/MailMessage.svelte';
	import type { Email, Mailbox, RankedItem, SentKind } from '#lib/types.ts';

	let {
		item,
		emails,
		mailbox,
		draft
	}: { item: RankedItem; emails: { email: Email; segments: { text: string; marked: boolean }[] }[]; mailbox: Mailbox; draft: string | null } = $props();

	const email = $derived(emails[0].email);
	const beA = $derived(email.channel === 'bea');
	const read = $derived(mailbox.read.includes(email.id));
	const archived = $derived(mailbox.archived.includes(email.id));
	const sent = $derived(mailbox.sent.filter((mail) => mail.emailId === email.id));

	// A new object per opening: the key below mounts a fresh composer.
	let composing = $state.raw<{ kind: SentKind; draft?: string } | null>(null);

	onMount(() => {
		if (read) return;
		// The email stays unread if this fails, which is the safe side, and the browser's console says why.
		fetch('?/seen', { method: 'POST', body: new FormData(), headers: { 'x-sveltekit-action': 'true' } }).then((response) => {
			if (!response.ok) throw new Error(`Als gelesen markieren: ${response.status}`);
			return invalidateAll();
		});
	});
</script>

{#snippet actions()}
	{#if !beA}
		<Button size="small" aria-label="Antworten" onclick={() => (composing = { kind: 'reply' })}>{#snippet icon()}<Icon name="reply" />{/snippet}</Button>
		<Button size="small" aria-label={draft ? 'Antwort von der KI entwerfen' : 'Kein KI-Entwurf für diese E-Mail'} disabled={!draft} onclick={() => (composing = { kind: 'reply', draft: draft ?? '' })}>{#snippet icon()}<Icon name="sparkles" />{/snippet}</Button>
		<Button size="small" aria-label="Weiterleiten" onclick={() => (composing = { kind: 'forward' })}>{#snippet icon()}<Icon name="forward" />{/snippet}</Button>
	{/if}
	<form method="POST" action={read ? '?/unread' : '?/seen'} use:enhance><Button type="submit" size="small" aria-label={read ? 'Als ungelesen markieren' : 'Als gelesen markieren'}>{#snippet icon()}<Icon name={read ? 'mail' : 'mail-open'} />{/snippet}</Button></form>
	<form method="POST" action={archived ? '?/unarchive' : '?/archive'} use:enhance><Button type="submit" size="small" aria-label={archived ? 'In den Eingang verschieben' : 'Archivieren'}>{#snippet icon()}<Icon name={archived ? 'archive-restore' : 'archive'} />{/snippet}</Button></form>
{/snippet}

<Card class="grid-fill" level={2} title="E-Mail" {actions} scroll>
	<div class="reader">
		{#if beA}<p class="sub">beA-Post beantworten Sie in der Kanzleisoftware.</p>{/if}

		<MailMessage {item} {email} segments={emails[0].segments} {sent} />
	</div>
</Card>

{#if composing}
	{#key composing}
		<MailComposer kind={composing.kind} draft={composing.draft} {email} />
	{/key}
{/if}

<style>
	.reader {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
		padding: var(--space-4) 0;
	}
</style>
