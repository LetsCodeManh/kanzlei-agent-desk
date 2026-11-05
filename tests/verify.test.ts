import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
	check,
	findSpan,
	markSegments,
	normalise,
	normalisedWithMap,
	quoteOk
} from '#lib/server/briefing/verify.ts';
import type { Facts } from '#lib/types.ts';

const BODY =
	'Der Klägerin wird aufgegeben,\nbinnen einer Frist von zwei Wochen ab Zustellung „Stellung“ zu nehmen.';

function span(quote: string, body: string): string | null {
	const found = findSpan(quote, body);
	return found && body.slice(found[0], found[1]);
}

describe('quoteOk', () => {
	it('passes an exact quote', () => {
		expect(quoteOk('binnen einer Frist von zwei Wochen', BODY)).toBe(true);
	});

	it('normalises line breaks, case and typographic quotes', () => {
		expect(quoteOk('aufgegeben, BINNEN einer', BODY)).toBe(true);
		expect(quoteOk('"Stellung" zu nehmen', BODY)).toBe(true);
	});

	it('passes a quote wrapped in quote marks', () => {
		expect(quoteOk('„zwei Wochen ab Zustellung“', BODY)).toBe(true);
	});

	it('fails an invented or changed quote', () => {
		expect(quoteOk('binnen einer Frist von drei Wochen', BODY)).toBe(false);
		expect(quoteOk('binnen ... Zustellung', BODY)).toBe(false);
	});

	it('fails an empty quote', () => {
		expect(quoteOk('', BODY)).toBe(false);
		expect(quoteOk('  "" ', BODY)).toBe(false);
	});
});

describe('normalise', () => {
	it('collapses whitespace', () => {
		expect(normalise('a \n\t b')).toBe('a b');
	});

	// The trap: toLowerCase keeps ß, Python's casefold makes it ss.
	it('folds ß to ss, on both sides', () => {
		expect(normalise('Straße')).toBe('strasse');
		expect(normalise('STRASSE')).toBe(normalise('Straße'));
		expect(normalise('STRAẞE')).toBe('strasse');
	});

	it('maps the characters the spike maps', () => {
		expect(normalise('„a“ «b» ‚c‘ d’ e–f—g i j k so­ft')).toBe(`"a" "b" 'c' d' e-f-g i j k soft`);
	});

	it('keeps the spike on U+2011: NFKC makes it U+2010 first, so its mapping never fires', () => {
		expect(normalise('g‑h')).toBe('g‐h');
	});
});

function facts(over: Partial<Facts> = {}): Facts {
	return {
		summary: { text: 'x', quotes: ['zwei Wochen'] },
		sender_role: { value: 'court', quote: 'Der Klägerin' },
		aktenzeichen: { value: '', quote: '' },
		fristen: [
			{
				what: '',
				trigger: 'zustellung',
				trigger_date_text: '',
				length_text: 'zwei Wochen',
				quote: 'zwei Wochen ab Zustellung',
				status: 'found'
			}
		],
		frist_event: { present: false, kind: 'other', date_text: '', quote: '' },
		urgent_request: { present: false, quote: '' },
		wiedervorlage_today: { present: false, quote: '' },
		events: [],
		injection_suspect: { present: false, quote: '' },
		...over
	};
}

describe('check', () => {
	it('marks each claimed fact', () => {
		const result = check(facts({ urgent_request: { present: true, quote: 'Rufen Sie heute an' } }), BODY);
		expect(result).toEqual({
			'summary.quotes[0]': true,
			sender_role: true,
			'fristen[0]': true,
			urgent_request: false
		});
	});

	it('claims nothing for an absent flag', () => {
		expect(check(facts(), BODY)).not.toHaveProperty('urgent_request');
	});
});

describe('findSpan', () => {
	it('maps back to the original text', () => {
		expect(span('aufgegeben, BINNEN einer', BODY)).toBe('aufgegeben,\nbinnen einer');
		// An outer quote mark is stripped, as in quoteOk.
		expect(span('"Stellung" zu nehmen', BODY)).toBe('Stellung“ zu nehmen');
	});

	it('handles ß and leading spaces', () => {
		expect(span('STRASSE 1', '  Grüße aus Berlin, Straße 1')).toBe('Straße 1');
	});

	it('agrees with quoteOk', () => {
		for (const quote of ['zwei Wochen', 'drei Wochen', '', 'Der Klägerin wird']) {
			expect(findSpan(quote, BODY) !== null).toBe(quoteOk(quote, BODY));
		}
	});

	// The traps: JS strings count UTF-16 units, and NFKC must see a whole combining sequence.
	it('counts an astral character before the quote', () => {
		expect(span('zwei Wochen', '😀 Frist von zwei Wochen ab')).toBe('zwei Wochen');
	});

	it('keeps an astral character inside the quote whole', () => {
		expect(span('a 😀 b', 'x a 😀 b y')).toBe('a 😀 b');
	});

	it('finds a quote in a body with a combining sequence', () => {
		const body = 'Herr Müller aus Zürich';
		expect(span('Müller aus Zürich', body)).toBe('Müller aus Zürich');
		expect(quoteOk('Müller aus Zürich', body)).toBe(true);
	});
});

describe('normalisedWithMap', () => {
	const inbox = (kanzlei: string) => new URL(`../data/${kanzlei}/inbox/`, import.meta.url);
	const bodies = ['kanzlei-berlin', 'kanzlei-muenchen'].flatMap((kanzlei) =>
		readdirSync(inbox(kanzlei)).map(
			(file) => JSON.parse(readFileSync(new URL(file, inbox(kanzlei)), 'utf-8')).body.content as string
		)
	);

	it('gives the same text as normalise, on every email', () => {
		expect(bodies).toHaveLength(28);
		for (const body of bodies) expect(normalisedWithMap(body).text).toBe(normalise(body));
	});

	it('gives the same text as normalise, on the hard cases', () => {
		for (const text of ['  a  b  ', 'Straße', 'Müller', 'so­ft', '😀 a', 'a\r\nb', ' x ', '']) {
			expect(normalisedWithMap(text).text).toBe(normalise(text));
		}
	});
});

describe('markSegments', () => {
	it('merges overlaps, and leaves escaping to Svelte text nodes', () => {
		expect(markSegments('a <b> c d', ['<b> c', 'c d'])).toEqual([
			{ text: 'a ', marked: false },
			{ text: '<b> c d', marked: true }
		]);
	});

	it('marks nothing when no quote is found', () => {
		expect(markSegments('a b', ['zz'])).toEqual([{ text: 'a b', marked: false }]);
	});
});
