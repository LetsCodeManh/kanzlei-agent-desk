<!--
	Stat tile (stat.css): one figure against its target, with a ring beside it. A met target closes
	the ring in the metal's chrome. The tile is drawn in its final state; with `rise` it first shows
	nothing and then gives its value (the ring draws, the figure counts), as stat.js's Stat.rise.
	When a prop changes later the tile changes in place (Stat.set): the arc moves, the figure counts,
	a ring that reaches `done` draws as the plain arc first and turns to metal once it has landed.
	With no `value` there is no target and no ring: the figure alone (the next hearing's time).
-->
<script lang="ts">
	import { untrack } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import '../button/button.css';
	import { countTo as count, counts, DRAW, zero } from './count.ts';
	import './stat.css';

	type Props = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
		/** on-track and behind (the pace says which), done (the metal rim), over (red), empty (no arc) */
		status: 'on-track' | 'behind' | 'done' | 'over' | 'empty';
		/** what the figure is of; also the ring's accessible name */
		label: string;
		/** the head's right side ("60%") */
		sub?: string;
		/** the figure; a whole number (grouped by thousands, a sign or a unit around it: €1,000) counts up,
		    anything else is set at once */
		fig: string;
		/** after the figure ("/ 10") */
		denom?: string;
		/** under the figure ("Target 10"); over, say by how much */
		meta?: string;
		/** how far round the arc reaches, 0 to 100; none: no target, so no ring */
		value?: number;
		/** where you should be by now, 0 to 100: a tick across the ring; none leaves it out */
		pace?: number;
		/** for a screen reader when the percentage isn't the whole story ("120%, over by 2") */
		valuetext?: string;
		/** the tile's place in an entrance: it rises at 40 + (rise + 1) * 35ms. Without it the tile is drawn at once */
		rise?: number;
		/** the screen's main figure: 40px figure, 76px ring */
		size?: 'hero';
		/** the tile of what the page shows now, as a period picked (Today, Week, Month): a hairline round it */
		current?: boolean;
	};

	let { status, label, sub, fig, denom, meta, value, pace, valuetext, rise, size, current, class: className, ...rest }: Props = $props();

	// what the tile shows now; null until it has mounted, so the prerendered tile is the final one
	type Shown = { status: Props['status']; value: number; fig: string; landed: boolean };
	let shown: Shown | null = $state(null);
	const view = $derived(shown ?? { status, value: value ?? 0, fig, landed: false });

	let timer: ReturnType<typeof setTimeout> | undefined;
	let stop = () => {};

	function countTo(to: string) {
		stop();
		stop = count(shown!.fig, to, (fig) => (shown!.fig = fig));
	}

	// Stat.set: a tile changed in place
	function apply(to: { status: Props['status']; value: number; fig: string | null }) {
		clearTimeout(timer);
		const now = shown!;
		now.value = to.value;
		if (to.status !== 'done') now.landed = false;
		if (to.status !== 'done') now.status = to.status;
		else if (now.status !== 'done') {
			// the plain arc draws first; the metal comes once it has landed
			now.status = 'on-track';
			timer = setTimeout(() => {
				now.landed = true;
				now.status = 'done';
			}, DRAW);
		}
		if (to.fig != null) countTo(to.fig);
	}

	$effect(() => {
		const to = { status, value: value ?? 0, fig };
		untrack(() => {
			if (shown === null) {
				// the first run: drawn final, or (rise) shown as nothing and given its value
				if (rise == null) {
					shown = { ...to, landed: false };
					return;
				}
				shown = { status: 'empty', value: 0, fig: zero(to.fig), landed: false };
				timer = setTimeout(() => apply({ ...to, fig: counts(to.fig) ? to.fig : null }), 40 + (rise + 1) * 35);
			} else apply(to);
		});
		return () => {
			clearTimeout(timer);
			stop();
		};
	});

</script>

<div
	{...rest}
	class={['stat', className]}
	data-size={size}
	data-current={current ? '' : undefined}
	data-state={view.status}
	data-landed={view.landed ? '' : undefined}
	style:--stat-value={view.value}
	style:--stat-pace={pace}
>
	<div class="stat-head">
		<span class="stat-label">{label}</span>
		{#if sub != null}<span class="stat-sub">{sub}</span>{/if}
	</div>
	<div class="stat-main">
		<div class="stat-readout">
			<div class="stat-fig-row">
				<span class="stat-fig" data-end={fig}><span>{view.fig}</span></span>
				{#if denom}<span class="stat-denom">{denom}</span>{/if}
			</div>
			{#if meta}<div class="stat-meta">{meta}</div>{/if}
		</div>
		{#if value != null}
			<div class="stat-ring" role="progressbar" aria-label={label} aria-valuemin="0" aria-valuemax="100" aria-valuenow={view.value} aria-valuetext={valuetext}>
				<svg viewBox="0 0 44 44" aria-hidden="true">
					<circle class="stat-ring-track" cx="22" cy="22" r="18" />
					<circle class="stat-ring-arc" cx="22" cy="22" r="18" pathLength="100" />
					{#if pace != null}
						<g class="stat-ring-pace">
							<line class="stat-ring-pace-halo" x1="22" x2="22" y1="0" y2="8" />
							<line class="stat-ring-pace-tick" x1="22" x2="22" y1="0" y2="8" />
						</g>
					{/if}
				</svg>
				<span class="stat-ring-metal" aria-hidden="true"><span class="metal-rim one"></span><span class="metal-rim two"></span><span class="metal-rim glint"></span></span>
			</div>
		{/if}
	</div>
</div>
