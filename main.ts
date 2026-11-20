// Leonida Platinum Atlas — hand-in program for gta6-trophy-guide-01 (Node 22, standard library only).
//
// The entry itself is the static web app in app/: plain files a browser opens at app/index.html, with no
// build step and no network access — the trophy list and every guide live in app/data/trophies.json.
// This program's only job is the hand-in. It copies app/ and screenshots/ from beside this file into the
// output directory and writes dossier.json there with the vendored make.fun library, so the judge reads
// exactly the app and the screenshots that are in this repository. vendor/makefun-frontend.ts stays
// untouched on purpose: the scorer rebuilds the dossier with its own copy and compares byte for byte.
//
// Run it the way the grader does, with MAKEFUN_OUTPUT_DIR standing in for /output outside the container:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Serve the app locally with `node serve.ts`, then open http://localhost:8080.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The caps below are the scorer's own (reference/gate.json), passed unchanged: at most 4 screenshots of
// at most 256 KiB each, at most 993 files and directories and 48 MiB in app/, and the dossier text capped
// at 163,840 bytes. buildDossier refuses anything past them, exactly as the gate would.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 }),
);
