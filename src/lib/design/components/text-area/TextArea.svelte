<!--
	Text area (text-area.css): words typed over several lines. `value` is the text (bindable); `rows`
	is how many lines tall it is, and it scrolls past them, or with `grow` it is as tall as what it
	holds, never under `rows`. `flush` takes the place of text already on the page: no padding above or
	below, 8px at the sides pulled out by the same margin, so the words stay where they were and the
	edge sits just outside them. `bare` draws no edge, no fill and no ring, for a field that is the only
	place to type under its own rows (a mail's words): the caret says where it is. `mono` sets it in the mono, for a file as it is stored. `error` is why
	the text was refused: a red line under the field, which gets `aria-invalid` and is described by
	it (the line is a live region, so it is read as it appears). The rest of the props (name,
	disabled, placeholder, onkeydown, ...) go on the <textarea>, `class` on the wrapper.
-->
<script lang="ts">
	import type { HTMLTextareaAttributes } from 'svelte/elements';
	import './text-area.css';

	type Props = Omit<HTMLTextareaAttributes, 'value' | 'rows' | 'children' | 'aria-label' | 'aria-labelledby' | 'aria-invalid'> & {
		/** the text; bind it to read it */
		value?: string;
		/** the field's name for assistive tech ("Note"): it has no label drawn */
		label: string;
		/** lines tall (4 unless given); the least with `grow` */
		rows?: number;
		/** as tall as what it holds, from `rows` up, instead of scrolling */
		grow?: boolean;
		/** in the mono, 13px */
		mono?: boolean;
		/** in place of text: the edge just outside the words, which do not move (margin equals padding) */
		flush?: boolean;
		/** no edge, no fill, no ring: the only place to type, under its own rows. Use it with `flush` */
		bare?: boolean;
		/** why it was refused, shown under the field in red; empty or none shows nothing */
		error?: string;
	};
	let { value = $bindable(), label, rows = 4, grow = false, mono = false, flush = false, bare = false, error, class: className, ...rest }: Props = $props();
	const id = $props.id();
	const describedby = $derived([rest['aria-describedby'], error ? `${id}-error` : undefined].filter(Boolean).join(' ') || undefined);
</script>

<div class={['text-area', className]} data-grow={grow ? '' : undefined} data-mono={mono ? '' : undefined} data-flush={flush ? '' : undefined} data-bare={bare ? '' : undefined} style:--text-area-rows={rows}>
	<textarea {...rest} {rows} aria-label={label} aria-invalid={error ? 'true' : undefined} aria-describedby={describedby} bind:value></textarea>
	{#if error}<p class="text-area-error" id="{id}-error" role="alert">{error}</p>{/if}
</div>
