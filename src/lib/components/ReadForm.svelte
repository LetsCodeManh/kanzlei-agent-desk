<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';

	/** Starts the same run as `pnpm daily`. The action redirects, so a reload does not start a second one. */
	let { kanzlei, label, primary = false }: { kanzlei: string; label: string; primary?: boolean } = $props();

	let reading = $state(false);
</script>

<form
	method="POST"
	action="{resolve('/[kanzlei]', { kanzlei })}?/read"
	use:enhance={() => {
		reading = true;
		return async ({ update }) => {
			await update();
			reading = false;
		};
	}}
>
	<button class={primary ? 'primary' : 'quiet'} disabled={reading}>{reading ? 'Wird gelesen' : label}</button>
</form>
