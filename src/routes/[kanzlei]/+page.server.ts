import { error, redirect } from '@sveltejs/kit';
import { saveBriefing } from '#lib/server/briefing/pipeline.ts';
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

export const actions: Actions = {
	default: async ({ params }) => {
		if (!listKanzleien().includes(params.kanzlei)) error(404, 'Diese Kanzlei gibt es nicht.');
		await runOnce(params.kanzlei);
		// A redirect in every case, so a reload does not start a second run.
		redirect(303, `/${params.kanzlei}`);
	}
};
