<script lang="ts">
	import type { Kanzlei } from '#lib/types.ts';
	import ReadForm from './ReadForm.svelte';

	/** First open: no run has finished yet. That is not an empty inbox. */
	let { kanzlei, info, failed }: { kanzlei: string; info: Kanzlei; failed: boolean } = $props();
</script>

<main>
	<div class="inner">
		<div class="head">
			<p class="sub">{info.anwalt.name} · {info.name}</p>
			<h1>Postfach verbinden</h1>
			<p>Das Briefing entsteht aus Ihrem Postfach. Es liest nur: Es sendet nichts, verschiebt nichts und löscht nichts.</p>
		</div>
		{#if failed}
			<p class="error" role="alert">Das Postfach konnte nicht gelesen werden. Bitte noch einmal versuchen.</p>
		{/if}
		<ul>
			<li>
				<div class="texts">
					<span class="title">E-Mail: Microsoft 365 / Outlook</span>
					<span class="sub">{info.anwalt.address}. In dieser Demo ein simuliertes Postfach, ohne Anmeldung.</span>
				</div>
				<ReadForm {kanzlei} label="Demo-Postfach verbinden" />
			</li>
			<li>
				<div class="texts">
					<span class="title">beA</span>
					<span class="sub">Echt nur über die Kanzleisoftware, mit eigener Karte. In dieser Demo liegt beA-Post im Postfach.</span>
				</div>
				<span class="sub state">simuliert</span>
			</li>
			<li>
				<div class="texts">
					<span class="title">Akten und Termine</span>
					<span class="sub">Echt aus der Kanzleisoftware, nur lesend. In dieser Demo eine Datei.</span>
				</div>
				<span class="sub state">simuliert</span>
			</li>
		</ul>
		<p class="sub">Danach liest das Briefing die E-Mails einmal und zeigt das Ergebnis. Ein täglicher Lauf am Morgen ist noch nicht gebaut.</p>
	</div>
</main>

<style>
	main {
		display: grid;
		place-items: center;
		padding: var(--space-5);
	}

	.inner {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
		width: min(100%, 600px);
	}

	.head {
		display: grid;
		gap: var(--space-2);
	}

	h1 {
		font-size: 24px;
		line-height: 32px;
		font-weight: 600;
		letter-spacing: -0.01em;
	}

	.error {
		color: var(--red-900);
		font-weight: 600;
	}

	ul {
		display: flex;
		flex-direction: column;
		border-block: 1px solid var(--gray-alpha-400);
	}

	li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-5);
		padding-block: var(--space-4);
	}

	li + li {
		border-top: 1px solid var(--gray-alpha-400);
	}

	.texts {
		display: grid;
		gap: var(--space-0-5);
		min-width: 0;
	}

	.title {
		font-weight: 500;
	}

	.state {
		flex: none;
	}
</style>
