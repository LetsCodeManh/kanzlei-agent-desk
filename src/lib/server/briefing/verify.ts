/** Code checks every quote: a normalised substring of that email's body. A failed check marks the fact unsicher. */
import type { Facts } from '../../types.ts';

const CHARS: Record<string, string> = {
	'„': '"',
	'“': '"',
	'”': '"',
	'«': '"',
	'»': '"',
	'‚': "'",
	'‘': "'",
	'’': "'",
	'–': '-',
	'—': '-',
	'‑': '-',
	' ': ' ',
	' ': ' ',
	'­': '' // soft hyphen
};
const CHAR = new RegExp(`[${Object.keys(CHARS).join('')}]`, 'g');
const OUTER_MARKS = /^["' ]+|["' ]+$/g;

function translate(text: string): string {
	return text.replace(CHAR, (char) => CHARS[char]);
}

/** Python's casefold, for German: toLowerCase keeps ß, casefold makes it ss. */
function fold(text: string): string {
	return text.toLowerCase().replace(/ß/g, 'ss');
}

/** NFKC, one kind of quote mark and dash, whitespace collapsed, case folded. */
export function normalise(text: string): string {
	return fold(translate(text.normalize('NFKC')).replace(/\s+/g, ' ').trim());
}

function normalisedQuote(quote: string): string {
	return normalise(quote).replace(OUTER_MARKS, '');
}

export function quoteOk(quote: string, body: string): boolean {
	const q = normalisedQuote(quote);
	return q !== '' && normalise(body).includes(q);
}

/** [path, quote] for every fact the LLM claims. An absent flag or an empty Aktenzeichen claims nothing. */
export function quotedFacts(facts: Facts): [string, string][] {
	const out: [string, string][] = facts.summary.quotes.map((quote, i) => [`summary.quotes[${i}]`, quote]);
	out.push(['sender_role', facts.sender_role.quote]);
	if (facts.aktenzeichen.value) out.push(['aktenzeichen', facts.aktenzeichen.quote]);
	facts.fristen.forEach((frist, i) => out.push([`fristen[${i}]`, frist.quote]));
	for (const key of ['frist_event', 'urgent_request', 'wiedervorlage_today', 'injection_suspect'] as const) {
		if (facts[key].present) out.push([key, facts[key].quote]);
	}
	facts.events.forEach((event, i) => out.push([`events[${i}]`, event.quote]));
	return out;
}

/** path -> quote found in the body. */
export function check(facts: Facts, body: string): Record<string, boolean> {
	return Object.fromEntries(quotedFacts(facts).map(([path, quote]) => [path, quoteOk(quote, body)]));
}

const GRAPHEMES = new Intl.Segmenter('de', { granularity: 'grapheme' });

/**
 * normalise(text), with the span in text behind each UTF-16 unit of the result (for marking quotes).
 * It walks graphemes, not code points: NFKC must see a whole combining sequence to compose it.
 */
export function normalisedWithMap(text: string): { text: string; starts: number[]; ends: number[] } {
	let out = '';
	const starts: number[] = [];
	const ends: number[] = [];
	for (const { segment, index } of GRAPHEMES.segment(text)) {
		for (const char of fold(translate(segment.normalize('NFKC')))) {
			const space = /\s/.test(char);
			if (space && (out === '' || out.endsWith(' '))) continue;
			const kept = space ? ' ' : char;
			out += kept;
			for (let unit = 0; unit < kept.length; unit++) {
				starts.push(index);
				ends.push(index + segment.length);
			}
		}
	}
	if (out.endsWith(' ')) {
		out = out.slice(0, -1);
		starts.pop();
		ends.pop();
	}
	return { text: out, starts, ends };
}

/** [start, end] of the quote in the original body, or null if the check fails. */
export function findSpan(quote: string, body: string): [number, number] | null {
	const q = normalisedQuote(quote);
	if (q === '') return null;
	const { text, starts, ends } = normalisedWithMap(body);
	const start = text.indexOf(q);
	if (start < 0) return null;
	return [starts[start], ends[start + q.length - 1]];
}

export interface Segment {
	text: string;
	marked: boolean;
}

/** The body cut at its quotes, overlaps merged. The page renders these as text nodes, never `{@html}`. */
export function markSegments(body: string, quotes: string[]): Segment[] {
	const spans = quotes
		.map((quote) => findSpan(quote, body))
		.filter((span) => span !== null)
		.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
	const merged: [number, number][] = [];
	for (const [start, end] of spans) {
		const last = merged.at(-1);
		if (last && start <= last[1]) last[1] = Math.max(last[1], end);
		else merged.push([start, end]);
	}
	const out: Segment[] = [];
	let pos = 0;
	for (const [start, end] of merged) {
		if (start > pos) out.push({ text: body.slice(pos, start), marked: false });
		out.push({ text: body.slice(start, end), marked: true });
		pos = end;
	}
	if (pos < body.length) out.push({ text: body.slice(pos), marked: false });
	return out;
}
