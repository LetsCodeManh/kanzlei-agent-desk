/**
 * The set: Lucide's drawings (lucide.dev, v0.525) on its 24px grid, so every glyph shares one
 * keyline: 2px clear round the edge, circles 20 across, squares 18. Outlines in `currentColor`,
 * round caps and joins; the stroke is 2.25 on the grid, 1.5 at 16px. `solid` is filled too,
 * keeping the outline's rounded corners. `decisions/icon.md` has the rules.
 *
 * Lucide: ISC License. Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2022 as
 * part of Feather (MIT). All other copyright (c) for Lucide are held by Lucide Contributors 2022.
 * Permission to use, copy, modify, and/or distribute this software for any purpose with or
 * without fee is hereby granted, provided that the above copyright notice and this permission
 * notice appear in all copies. THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL
 * WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
 * FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR
 * CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS,
 * WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN
 * CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 */
type Shape =
	| { tag: 'path'; d: string }
	| { tag: 'circle'; cx: number; cy: number; r: number }
	| { tag: 'rect'; x: number; y: number; width: number; height: number; rx?: number }
	| { tag: 'line'; x1: number; y1: number; x2: number; y2: number }
	| { tag: 'polygon'; points: string };
export type Glyph = { shapes: Shape[]; solid?: boolean };

const circle = (cx: number, cy: number, r: number): Shape => ({ tag: 'circle', cx, cy, r });
const rect = (x: number, y: number, width: number, height: number, rx?: number): Shape => ({ tag: 'rect', x, y, width, height, rx });
const line = (x1: number, y1: number, x2: number, y2: number): Shape => ({ tag: 'line', x1, y1, x2, y2 });
const mark = (...d: string[]): Glyph => ({ shapes: d.map((d): Shape => ({ tag: 'path', d })) });

const SET = {
	close: mark('M18 6 6 18', 'm6 6 12 12'),
	menu: mark('M4 12h16', 'M4 18h16', 'M4 6h16'),
	map: mark('M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z', 'M15 5.764v15', 'M9 3.236v15'),
	house: mark('M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8', 'M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'),
	inbox: mark('M22 12h-6l-2 3h-4l-2-3H2', 'M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z'),
	reply: mark('M20 18v-2a4 4 0 0 0-4-4H4', 'm9 17-5-5 5-5'),
	forward: mark('m15 17 5-5-5-5', 'M4 18v-2a4 4 0 0 1 4-4h12'),
	archive: { shapes: [rect(2, 3, 20, 5, 1), { tag: 'path', d: 'M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8' }, { tag: 'path', d: 'M10 12h4' }] },
	'archive-restore': { shapes: [rect(2, 3, 20, 5, 1), { tag: 'path', d: 'M4 8v11a2 2 0 0 0 2 2h2' }, { tag: 'path', d: 'M20 8v11a2 2 0 0 1-2 2h-2' }, { tag: 'path', d: 'm9 15 3-3 3 3' }, { tag: 'path', d: 'M12 12v9' }] },
	mail: { shapes: [{ tag: 'path', d: 'm22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7' }, rect(2, 4, 20, 16, 2)] },
	'mail-open': mark('M21.2 8.4c.5.38.8.97.8 1.6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 .8-1.6l8-6a2 2 0 0 1 2.4 0l8 6Z', 'm22 10-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 10'),
	sparkles: mark('M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z', 'M20 3v4', 'M22 5h-4', 'M4 17v2', 'M5 18H3'),
	plus: mark('M5 12h14', 'M12 5v14'),
	minus: mark('M5 12h14'),
	check: mark('M20 6 9 17l-5-5'),
	'chevron-left': mark('m15 18-6-6 6-6'),
	'chevron-right': mark('m9 18 6-6-6-6'),
	'chevron-down': mark('m6 9 6 6 6-6'),
	'arrow-right': mark('M5 12h14', 'm12 5 7 7-7 7'),
	'arrow-up': mark('m5 12 7-7 7 7', 'M12 19V5'),
	'arrow-up-right': mark('M7 7h10v10', 'M7 17 17 7'),
	search: { shapes: [circle(11, 11, 8), { tag: 'path', d: 'm21 21-4.34-4.34' }] },
	copy: { shapes: [rect(8, 8, 14, 14, 2), { tag: 'path', d: 'M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2' }] },
	regenerate: mark('M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8', 'M21 3v5h-5'),
	calendar: { shapes: [rect(3, 4, 18, 18, 2), { tag: 'path', d: 'M8 2v4M16 2v4M3 10h18' }] },
	lock: { shapes: [rect(3, 11, 18, 11, 2), { tag: 'path', d: 'M7 11V7a5 5 0 0 1 10 0v4' }] },
	settings: { shapes: [{ tag: 'path', d: 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z' }, circle(12, 12, 3)] },
	more: { shapes: [circle(5, 12, 1), circle(12, 12, 1), circle(19, 12, 1)] },
	list: mark('M3 6h.01', 'M3 12h.01', 'M3 18h.01', 'M8 6h13', 'M8 12h13', 'M8 18h13'),
	grid: { shapes: [rect(3, 3, 7, 7, 1), rect(14, 3, 7, 7, 1), rect(3, 14, 7, 7, 1), rect(14, 14, 7, 7, 1)] },
	chart: { shapes: [line(6, 20, 6, 14), line(12, 20, 12, 4), line(18, 20, 18, 10)] },
	play: { shapes: [{ tag: 'polygon', points: '6 3 20 12 6 21 6 3' }], solid: true },
	pause: { shapes: [rect(6, 4, 4, 16, 1), rect(14, 4, 4, 16, 1)], solid: true },
	stop: { shapes: [rect(5, 5, 14, 14, 2)], solid: true },
	circle: { shapes: [circle(12, 12, 10)] },
	dot: { shapes: [circle(12, 12, 5)], solid: true },
	info: { shapes: [circle(12, 12, 10), { tag: 'path', d: 'M12 16v-4M12 8h.01' }] },
	success: { shapes: [circle(12, 12, 10), { tag: 'path', d: 'm9 12 2 2 4-4' }] },
	warning: mark('m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3', 'M12 9v4', 'M12 17h.01'),
	error: mark(
		'M15.312 2a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586l-4.688-4.688A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2z',
		'M12 8v4',
		'M12 16h.01'
	)
} satisfies Record<string, Glyph>;

export type IconName = keyof typeof SET;
export const GLYPHS: Record<IconName, Glyph> = SET;
export const ICON_NAMES = Object.keys(SET) as IconName[];
