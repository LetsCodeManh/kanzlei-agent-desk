import { error, redirect } from '@sveltejs/kit';
import { readBriefing, saveBriefing } from '#lib/server/briefing/pipeline.ts';
import { setTick } from '#lib/server/briefing/ticks.ts';
import { listKanzleien } from '#lib/server/connector.ts';
import type { Actions } from './$types';

/** A second click during a run waits for that run. A live run costs model calls, and both would write one file. */
const running = new Map<string, Promise<void>>();

function runOnce(kanzlei: string): Promise<void> {
	let current = running.get(kanzlei);
	if (!current) {
		current = saveBriefing(kanzlei)
			.then(({ notRead }) => {
				for (const email of notRead) console.error(`${kanzlei}/${email.id}: ${email.detail}`);
			})
			// The page shows that it failed, from the mark `saveBriefing` leaves. The cause stays on the server.
			.catch((cause) => console.error(`${kanzlei}: ${cause instanceof Error ? cause.message : String(cause)}`))
			.finally(() => running.delete(kanzlei));
		running.set(kanzlei, current);
	}
	return current;
}

function knownKanzlei(kanzlei: string): string {
	if (!listKanzleien().includes(kanzlei)) error(404, 'Diese Kanzlei gibt es nicht.');
	return kanzlei;
}

export const actions: Actions = {
	/** "Demo-Postfach verbinden" and "Neu lesen": the same run as `pnpm daily`. */
	read: async ({ params }) => {
		const kanzlei = knownKanzlei(params.kanzlei);
		await runOnce(kanzlei);
		// A redirect in every case, so a reload does not start a second run.
		redirect(303, `/${kanzlei}`);
	},
	/** A tick on "Heute tun". Only a task's row: a Frist is struck after its check, so a POST cannot tick one. */
	tick: async ({ params, request }) => {
		const kanzlei = knownKanzlei(params.kanzlei);
		const form = await request.formData();
		const id = form.get('id');
		const { briefing } = readBriefing(kanzlei);
		if (!briefing || !briefing.day.aufgaben.some((row) => row.id === id)) error(400, 'Diese Aufgabe gibt es nicht.');
		setTick(kanzlei, briefing.today, id as string, form.get('done') === 'true');
	}
};
