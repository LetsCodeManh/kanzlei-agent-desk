import { listKanzleien, loadKanzlei } from '#lib/server/connector.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({
	kanzleien: listKanzleien().map((id) => ({ id, info: loadKanzlei(id) }))
});
