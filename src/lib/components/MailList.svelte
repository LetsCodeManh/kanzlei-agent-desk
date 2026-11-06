<!--
	The Eingang's rows: every email, by day. The archive is one flat run, with its date on each row.
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Icon from '#components/icon/Icon.svelte';
	import ListGroup from '#components/list/ListGroup.svelte';
	import MailRowLink from '#components/mail-row/MailRow.svelte';
	import Tag from '#components/tag/Tag.svelte';
	import { germanTime } from '#lib/format.ts';
	import { dayGroups, mailMarks, rowSubject, rowWhen } from '#lib/mail-row.ts';
	import type { Day, DayScreen, Mailbox, MailRow } from '#lib/types.ts';

	let {
		mails,
		day,
		today,
		mailbox,
		kanzlei,
		archive = false
	}: { mails: MailRow[]; day: DayScreen; today: Day; mailbox: Mailbox; kanzlei: string; archive?: boolean } = $props();
</script>

{#snippet row(mail: MailRow, when: string)}
	{@const sent = mailbox.sent.filter((answer) => answer.emailId === mail.id)}
	{@const marks = mailMarks(day, mail)}
	<MailRowLink
		href={resolve('/[kanzlei]/postfach/[email]', { kanzlei, email: mail.id })}
		sender={mail.sender}
		{when}
		subject={rowSubject(mail)}
		summary={mail.summary}
		unread={!mailbox.read.includes(mail.id)}
		unreadLabel="Ungelesen"
		current={mail.id === page.params.email}
		data-sveltekit-reset="false"
	>
		{#snippet source()}
			{#if mail.channel === 'bea'}<Tag>beA</Tag>{/if}
		{/snippet}
		{#snippet status()}
			{#if sent.some((answer) => answer.kind === 'reply')}<Icon name="reply" size={14} label="Beantwortet" />{/if}
			{#if sent.some((answer) => answer.kind === 'forward')}<Icon name="forward" size={14} label="Weitergeleitet" />{/if}
		{/snippet}
		{#snippet tags()}
			{#each marks as mark (mark.text)}<Tag tone={mark.tone}>{mark.text}</Tag>{/each}
		{/snippet}
	</MailRowLink>
{/snippet}

{#if archive}
	<ul class="mail-rows" data-archive>
		{#each mails as mail (mail.id)}
			{@render row(mail, rowWhen(mail.received, today))}
		{/each}
	</ul>
{:else}
	{#each dayGroups(mails, today) as group (group.name)}
		<section class="group">
			<ListGroup name={group.name} />
			<ul class="mail-rows">
				{#each group.mails as mail (mail.id)}
					{@render row(mail, group.name === 'Früher' ? rowWhen(mail.received, today) : germanTime(mail.received))}
				{/each}
			</ul>
		</section>
	{/each}
{/if}

<style>
	/* No gap over the card's foot. */
	.group:last-child .mail-rows {
		margin-bottom: calc(-1 * var(--space-2));
	}

	/* The Fold's body already runs to the card's edges. */
	[data-archive] {
		margin: 0;
	}
</style>
