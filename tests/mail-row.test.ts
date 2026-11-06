import { describe, expect, it } from 'vitest';
import { dayGroups, mailMarks } from '#lib/mail-row.ts';
import type { DayRow, DayScreen, MailRow } from '#lib/types.ts';

const TODAY = '2026-11-02';

function mail(over: Partial<MailRow>): MailRow {
	return { id: 'e', channel: 'email', received: '2026-11-02T08:00:00+00:00', sender: 'S', subject: 'T', summary: '', labels: [], unsure: false, warning: false, ...over };
}

function row(over: Partial<DayRow>): DayRow {
	return { id: 'r', title: '', sub: '', notes: [], date: null, iso: null, time: null, when: '', days: null, tone: null, emailIds: ['e'], unsure: false, warning: false, ...over };
}

function day(over: Partial<DayScreen>): DayScreen {
	return { termineAkte: [], termineNew: [], ereignisse: [], aufgaben: [], pruefen: [], bald: [], spaeter: [], postfach: [], ...over };
}

describe('mailMarks', () => {
	const frist = mail({ labels: ['Frist'] });

	it('shows the soonest Frist of an email, not another email\'s', () => {
		const screen = day({
			bald: [row({ date: 'Fr 06.11.', days: 4, emailIds: ['other'] }), row({ date: 'Do 12.11.', days: 10 })],
			spaeter: [row({ date: 'Do 26.11.', days: 24 })]
		});
		expect(mailMarks(screen, frist)).toEqual([{ text: 'Frist Do 12.11.', tone: undefined }]);
	});

	it('says to check a Frist with no date before any dated one', () => {
		const screen = day({ pruefen: [row({ tone: 'warn' })], bald: [row({ date: 'Fr 06.11.', days: 1, tone: 'danger' })] });
		expect(mailMarks(screen, frist)).toEqual([{ text: 'Frist: Datum prüfen', tone: 'warning' }]);
	});

	it('fails on a Frist label with no row, rather than show no date', () => {
		expect(() => mailMarks(day({}), frist)).toThrow('no Frist row');
	});

	it('keeps a warning and an unsure fact first', () => {
		const marks = mailMarks(day({ aufgaben: [row({})] }), mail({ warning: true, unsure: true, labels: ['Aufgabe'] }));
		expect(marks.map((mark) => mark.text)).toEqual(['Warnung', 'unsicher', 'Aufgabe']);
	});
});

describe('dayGroups', () => {
	it('goes by the day in Germany, so 23:30 UTC is already the next day', () => {
		const late = mail({ id: 'late', received: '2026-11-01T23:30:00+00:00' });
		const evening = mail({ id: 'evening', received: '2026-11-01T22:10:00+00:00' });
		const older = mail({ id: 'older', received: '2026-10-31T11:00:00+00:00' });
		const groups = dayGroups([late, evening, older], TODAY);
		expect(groups.map(({ name, mails }) => [name, mails.map(({ id }) => id)])).toEqual([
			['Heute', ['late']],
			['Gestern', ['evening']],
			['Früher', ['older']]
		]);
	});

	it('keeps every email and shows no empty group', () => {
		const groups = dayGroups([mail({ received: '2026-10-01T11:00:00+00:00' })], TODAY);
		expect(groups.map(({ name }) => name)).toEqual(['Früher']);
	});
});
