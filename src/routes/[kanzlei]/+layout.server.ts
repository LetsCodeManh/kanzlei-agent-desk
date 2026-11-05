import { error } from '@sveltejs/kit';
import { readBriefing } from '#lib/server/briefing/pipeline.ts';
import { listKanzleien, loadKanzlei } from '#lib/server/connector.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ params }) => {
	// The URL value is a trust boundary: only a Kanzlei that exists goes on to the file system.
	if (!listKanzleien().includes(params.kanzlei)) error(404, 'Diese Kanzlei gibt es nicht.');
	return { kanzlei: params.kanzlei, info: loadKanzlei(params.kanzlei), ...readBriefing(params.kanzlei) };
};
