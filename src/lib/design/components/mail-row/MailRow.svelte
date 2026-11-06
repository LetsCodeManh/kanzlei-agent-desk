<!--
	Mail row (mail-row.css): one email in a list, a link that opens it beside the list. Who wrote and when, the subject,
	a summary, then its tags. In a `<ul class="mail-rows">`, in a Card's body: it renders the `<li>`. Rest props go on the link.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAnchorAttributes } from 'svelte/elements';
	import Avatar, { initials } from '../avatar/Avatar.svelte';
	import './mail-row.css';

	type Props = Omit<HTMLAnchorAttributes, 'children'> & {
		href: string;
		/** who wrote: its initials come from it */
		sender: string;
		/** when it came, as the list says it: `07:50`, `Fr 30 Okt` */
		when: string;
		/** one line, cut */
		subject: string;
		/** what it says, two lines at most */
		summary?: string;
		/** a dot named "Unread" by `unreadLabel`, the name and the subject in semibold */
		unread?: boolean;
		/** a screen reader's word for the dot */
		unreadLabel?: string;
		/** the one open beside the list */
		current?: boolean;
		/** after the name: where it came from, a Tag */
		source?: Snippet;
		/** before the time: what was done on it, a small Icon with a label */
		status?: Snippet;
		/** under the words: Tags. None: no line */
		tags?: Snippet;
	};
	let { href, sender, when, subject, summary, unread = false, unreadLabel = 'Unread', current = false, source, status, tags, class: className, ...rest }: Props = $props();
</script>

<li>
	<a {...rest} {href} class={['mail-row', className]} aria-current={current ? 'true' : undefined} data-unread={unread || undefined}>
		{#if unread}<span class="mail-row-dot" role="img" aria-label={unreadLabel}></span>{/if}
		<Avatar letters={initials(sender)} />
		<span class="mail-row-body">
			<span class="mail-row-texts">
				<span class="mail-row-top">
					<span class="mail-row-sender" title={sender}>{sender}</span>
					{@render source?.()}
					<span class="mail-row-end">
						{@render status?.()}
						<span class="mail-row-when">{when}</span>
					</span>
				</span>
				<span class="mail-row-subject" title={subject}>{subject}</span>
				{#if summary}<span class="mail-row-summary">{summary}</span>{/if}
			</span>
			{#if tags}<span class="mail-row-tags">{@render tags()}</span>{/if}
		</span>
	</a>
</li>
