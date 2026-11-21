// Leonida Platinum Atlas — the entry program (Node 22, standard library only).
// It hands the guide in: copy this repository's app/ and screenshots/ into
// the output directory, then write output/dossier.json with the vendored
// make.fun frontend library, which is the summary the judge reads (the
// screenshots, the first load's files and bytes, and the source). Keep
// vendor/makefun-frontend.ts exactly as the kit ships it: the scorer rebuilds
// the dossier with its own copy and the two must match byte for byte.
//
// Run it outside the grader with MAKEFUN_OUTPUT_DIR set:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), {
    recursive: true,
  });
}

// The scorer's own caps: the text budget shapes the dossier's bytes, and the
// rest refuse an entry the scorer would refuse — more than 4 screenshots or
// one over 256 KiB, or app/ past 993 files and directories or 48 MiB.
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  }),
);
