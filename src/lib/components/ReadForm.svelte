<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import Button from '#components/button/Button.svelte';

	/** Starts the same run as `pnpm daily`. The action redirects, so a reload does not start a second one. */
	let { kanzlei, label, size = 'medium' }: { kanzlei: string; label: string; size?: 'small' | 'medium' } = $props();

	let reading = $state(false);
</script>

<form
	method="POST"
	action="{resolve('/[kanzlei]/(heute)', { kanzlei })}?/read"
	use:enhance={() => {
		reading = true;
		return async ({ update }) => {
			await update();
			reading = false;
		};
	}}
>
	<Button type="submit" {size} loading={reading}>{label}</Button>
</form>
