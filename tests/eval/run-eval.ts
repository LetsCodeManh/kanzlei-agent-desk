/**
 * The eval: both Kanzleien through the pipeline, every code scorer against `gold.json`, one Markdown table.
 * `pnpm eval` replays, with no login. n=14 per Kanzlei: directional, not a benchmark.
 */
import { DEFAULT_MODEL } from '../../src/lib/server/briefing/extract.ts';
import { evaluate, markdown } from './scorers.ts';

console.log(markdown(await evaluate(), DEFAULT_MODEL));
