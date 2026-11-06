import { readMailbox } from '#lib/server/mailbox.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ parent }) => {
	const { kanzlei } = await parent();
	return { mailbox: readMailbox(kanzlei) };
};
