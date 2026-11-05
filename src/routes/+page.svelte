<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<main>
	<div class="inner">
		<div class="head">
			<h1>Morning Briefing</h1>
			<p class="sub">Postfach: simuliert, alle Daten erfunden. Bitte eine Kanzlei wählen.</p>
		</div>
		<ul>
			{#each data.kanzleien as { id, info } (id)}
				<li>
					<a href={resolve('/[kanzlei]/(heute)', { kanzlei: id })}>
						<span class="name">{info.name}</span>
						<span class="sub">{info.anwalt.name}</span>
					</a>
				</li>
			{/each}
		</ul>
	</div>
</main>

<style>
	main {
		display: grid;
		place-items: center;
		min-height: 100dvh;
		padding: var(--space-5);
	}

	.inner {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
		width: min(100%, 520px);
	}

	.head {
		display: grid;
		gap: var(--space-1);
	}

	h1 {
		font-size: 24px;
		line-height: 32px;
		font-weight: 600;
	}

	ul {
		display: flex;
		flex-direction: column;
		border-block: 1px solid var(--gray-alpha-400);
	}

	li + li {
		border-top: 1px solid var(--gray-alpha-400);
	}

	a {
		display: grid;
		gap: var(--space-0-5);
		padding: var(--space-3) var(--space-2);
	}

	a:hover {
		background: var(--gray-alpha-100);
	}

	.name {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
</style>
