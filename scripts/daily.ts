/** `pnpm daily`: every Kanzlei once. A non-zero exit on a failed Kanzlei or an email not read. */
import { runDaily } from '../src/lib/server/briefing/pipeline.ts';

process.exitCode = (await runDaily()) ? 0 : 1;
