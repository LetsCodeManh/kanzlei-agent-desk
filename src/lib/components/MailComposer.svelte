<!--
	Writes an answer to the open email, in a modal. The server builds the recipient of a reply and each subject, so the form
	only sends the words. A draft is not lost silently: closing the modal or leaving the email with changed text asks first,
	and a failed send keeps the text. The reader mounts one per opening, so it starts open and its text starts from `draft`.
-->
<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';
	import { beforeNavigate } from '$app/navigation';
	import { onMount } from 'svelte';
	import Button from '#components/button/Button.svelte';
	import Modal from '#components/modal/Modal.svelte';
	import TextArea from '#components/text-area/TextArea.svelte';
	import { answerSubject, receivedLabel } from '#lib/format.ts';
	import type { Email, SentKind } from '#lib/types.ts';

	let { kind, email, draft = '' }: { kind: SentKind; email: Email; draft?: string } = $props();

	const PLACEHOLDER = /\[[^\]]*\]/g;

	const formId = $props.id();
	let form = $state<HTMLFormElement>();
	let open = $state(true);
	let to = $state('');
	// svelte-ignore state_referenced_locally
	let body = $state(draft);
	let sending = $state(false);
	let problem = $state('');

	const subject = $derived(answerSubject(kind, email.subject));
	const sender = $derived(email.senderName || email.senderAddress);
	// An AI draft nobody changed is not lost by a close: the button gives it back.
	const dirty = $derived(to.trim() !== '' || body.trim() !== draft.trim());
	const openPlaceholders = $derived(body.match(PLACEHOLDER)?.length ?? 0);

	// After the Modal's own effect, which opens it: a closed dialog takes no focus.
	// A draft opens with its first placeholder selected, so the first key replaces it.
	onMount(() => {
		const field = form?.querySelector<HTMLTextAreaElement>('textarea');
		field?.focus();
		const first = new RegExp(PLACEHOLDER.source).exec(draft);
		if (field && first) field.setSelectionRange(first.index, first.index + first[0].length);
	});

	beforeNavigate((navigation) => {
		if (!open || !dirty) return;
		// A closing tab shows the browser's own question, which allows no confirm().
		if (navigation.type === 'leave' || !confirm('Entwurf verwerfen?')) navigation.cancel();
	});

	const submit: SubmitFunction = () => {
		sending = true;
		problem = '';
		return async ({ result, update }) => {
			sending = false;
			if (result.type === 'failure') {
				problem = String(result.data?.error ?? 'Nicht gespeichert.');
			} else if (result.type === 'error') {
				problem = 'Nicht gespeichert. Bitte noch einmal versuchen.';
			} else {
				open = false;
				await update({ reset: false });
			}
		};
	};
</script>

<Modal
	bind:open
	size="wide"
	title={kind === 'reply' ? 'Antworten' : 'Weiterleiten'}
	closeLabel="Schließen"
	beforeclose={() => !dirty || confirm('Entwurf verwerfen?')}
>
	<div class="compose">
		<form id={formId} class="composer" method="POST" action="?/send" use:enhance={submit} bind:this={form}>
			<input type="hidden" name="kind" value={kind} />

			<div class="fields">
				{#if kind === 'reply'}
					<div class="field"><span class="sub">An</span><span class="value" title={email.senderAddress}>{sender} · {email.senderAddress}</span></div>
				{:else}
					<!-- The design system has no one-line text field, so this is its TextArea, one line tall. Enter does not break the line. -->
					<div class="field">
						<span class="sub">An</span>
						<TextArea
							name="to"
							label="An"
							rows={1}
							flush
							bare
							bind:value={to}
							placeholder="name@beispiel.example"
							spellcheck="false"
							onkeydown={(event) => {
								if (event.key === 'Enter') event.preventDefault();
							}}
						/>
					</div>
				{/if}
				<div class="field"><span class="sub">Betreff</span><span class="value" title={subject}>{subject}</span></div>
			</div>

			{#if draft}<p class="sub">Entwurf der KI, nur aus dieser E-Mail. Bitte prüfen und die [Klammern] ausfüllen.</p>{/if}

			<TextArea name="body" label="Text" rows={8} grow flush bare bind:value={body} placeholder={kind === 'reply' ? 'Ihre Antwort' : 'Ihre Nachricht, die E-Mail hängt an'} error={problem} />
		</form>

		<section class="original" aria-label="Die E-Mail">
			<div class="sub">Am {receivedLabel(email.received)} schrieb {sender}:</div>
			<div class="original-body">{email.body}</div>
		</section>
	</div>

	{#snippet actions()}
		<span class="modal-sub">
			{#if openPlaceholders > 0}Noch {openPlaceholders} {openPlaceholders === 1 ? 'Klammer' : 'Klammern'} offen.{/if}
			Simuliert: Diese Demo versendet nichts.
		</span>
		<div class="modal-actions">
			<Button size="medium" onclick={() => (open = false)}>Verwerfen</Button>
			<Button type="submit" form={formId} size="medium" loading={sending}>Senden</Button>
		</div>
	{/snippet}
</Modal>

<style>
	.compose {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
		min-width: 0;
	}

	.composer {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		min-width: 0;
	}

	.fields {
		display: grid;
	}

	.field {
		display: grid;
		grid-template-columns: 56px minmax(0, 1fr);
		align-items: baseline;
		column-gap: var(--space-2);
		padding-block: var(--space-2);
		border-bottom: 1px solid var(--gray-alpha-400);
	}

	.value {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.original {
		display: grid;
		gap: var(--space-2);
		min-width: 0;
		padding-top: var(--space-4);
		border-top: 1px solid var(--gray-alpha-400);
		color: var(--gray-900);
	}

	.original-body {
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		font-size: 13px;
		line-height: 20px;
		letter-spacing: 0;
	}
</style>
