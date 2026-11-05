<!--
	An item's Verlauf in the sheet, top to bottom on one line: an email is a ring (not the lawyer's own), a Frist a dot in
	its tone, a Termin a full dot. The same marks as the Zeitleiste on "Heute".
-->
<script lang="ts" module>
	export type SourceEntry = {
		key: string;
		kind: 'email' | 'frist' | 'termin';
		when: string;
		title: string;
		notes: string[];
		tone: 'error' | 'warning' | 'neutral';
		unsure: boolean;
		/** Sorts the line. Null: no date to place it by, so last. */
		at: string | null;
	};
</script>

<script lang="ts">
	import StatusDot from '#components/status-dot/StatusDot.svelte';
	import Tag from '#components/tag/Tag.svelte';

	let { entries }: { entries: SourceEntry[] } = $props();
</script>

<ol class="timeline">
	{#each entries as entry (entry.key)}
		<li class="entry">
			<span class="when">{entry.when}</span>
			<span class="mark" aria-hidden="true">
				{#if entry.kind === 'frist'}
					<StatusDot tone={entry.tone} />
				{:else}
					<span class={['dot', entry.kind === 'email' && 'dot-open']}></span>
				{/if}
			</span>
			<div class="text">
				<div class="title-line">
					<span class="title" title={entry.title}>{entry.title}</span>
					{#if entry.unsure}<Tag tone="error">unsicher</Tag>{/if}
				</div>
				{#each entry.notes as note (note)}<div class="sub">{note}</div>{/each}
			</div>
		</li>
	{/each}
</ol>

<style>
	.timeline {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.entry {
		display: grid;
		grid-template-columns: 72px 16px minmax(0, 1fr);
		column-gap: var(--space-3);
	}

	.entry:not(:last-child) .text {
		padding-bottom: var(--space-4);
	}

	.when {
		color: var(--gray-900);
		font-size: 13px;
		line-height: 20px;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	/* 10 = half the title's 20px line: the centre of the first line. */
	.mark {
		--timeline-at: 10px;
		position: relative;
		height: 100%;
	}

	.mark::before {
		content: '';
		position: absolute;
		inset-block: 0;
		left: 50%;
		width: 1px;
		background: var(--gray-alpha-400);
	}

	.entry:first-child .mark::before {
		top: var(--timeline-at);
	}

	.entry:last-child .mark::before {
		bottom: calc(100% - var(--timeline-at));
	}

	.mark > :global(*) {
		position: absolute;
		top: var(--timeline-at);
		left: 50%;
		translate: -50% -50%;
		/* the sheet's background, so the dot cuts the line */
		box-shadow: 0 0 0 2px var(--background-100);
	}

	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--gray-1000);
	}

	.dot-open {
		background: var(--background-100);
		outline: 1px solid var(--gray-700);
		outline-offset: -1px;
	}

	.text {
		display: grid;
		gap: var(--space-0-5);
		align-content: start;
		min-width: 0;
	}

	.title-line {
		display: flex;
		align-items: baseline;
		gap: var(--space-2);
		min-width: 0;
	}

	.title {
		min-width: 0;
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
</style>
