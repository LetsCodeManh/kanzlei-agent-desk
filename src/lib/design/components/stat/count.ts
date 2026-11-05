// A figure counting to its value in the ring's draw (800ms, --ease-out, as stat.css's arc), so a
// figure and its arc land together: Stat's, and the figures' row's. Thousands grouped ('1,500'); a
// sign or a unit around the number stays put while it counts ('€1,000', '60%', '−€50').

/** stat.css: .stat-ring-arc's stroke-dasharray, the draw's length */
export const DRAW = 800;
// a whole number, grouped by thousands, with no digits before or after it (12.5 doesn't count)
const FIGURE = /^(\D*?)(\d[\d,]*)(\D*)$/;
const parse = (fig: string) => {
	const m = FIGURE.exec(fig);
	return m ? { before: m[1], n: +m[2].replace(/,/g, ''), after: m[3] } : null;
};


/** a figure that counts: a whole number, a sign or a unit around it */
export const counts = (fig: string) => parse(fig) !== null;
/** the figure at nothing, before it rises */
export const zero = (fig: string) => {
	const f = parse(fig);
	return f ? `${f.before}0${f.after}` : fig;
};

// --ease-out, cubic-bezier(.23, 1, .32, 1), solved for t by bisection
function easeOut(x: number) {
	const at = (t: number, a: number, b: number) => 3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t * t * b + t ** 3;
	let lo = 0;
	let hi = 1;
	for (let i = 0; i < 20; i++) {
		const mid = (lo + hi) / 2;
		if (at(mid, 0.23, 0.32) < x) lo = mid;
		else hi = mid;
	}
	return at((lo + hi) / 2, 0, 1);
}

/** `show` each step from the figure `from` to `to`; one that doesn't count, at once.
    Returns what stops it. */
export function countTo(from: string, to: string, show: (fig: string) => void): () => void {
	const target = parse(to);
	const start = parse(from)?.n;
	if (!target || start === undefined || start === target.n) {
		show(to);
		return () => {};
	}
	const t0 = performance.now();
	let frame = 0;
	const step = (now: number) => {
		const k = Math.min((now - t0) / DRAW, 1);
		show(`${target.before}${Math.round(start + (target.n - start) * easeOut(k)).toLocaleString('en-GB')}${target.after}`);
		if (k < 1) frame = requestAnimationFrame(step);
	};
	frame = requestAnimationFrame(step);
	return () => cancelAnimationFrame(frame);
}
