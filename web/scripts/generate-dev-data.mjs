#!/usr/bin/env node
// Generates a real public/apps.json from applications/*.yml before `npm run dev`,
// so the site has real data locally instead of a 404 on first load.
// Best-effort: never blocks `npm run dev` from starting if this fails.

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const webDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const repoRoot = path.dirname(webDir);
const generator = path.join(repoRoot, 'scripts', 'generate_json.py');
const appsDir = path.join(repoRoot, 'applications');
const out = path.join(webDir, 'public', 'apps.json');

if (!existsSync(generator) || !existsSync(appsDir)) {
  process.exit(0);
}

for (const python of ['python', 'python3']) {
  const result = spawnSync(
    python,
    [generator, '--apps-dir', appsDir, '--out', out, '--pretty'],
    { stdio: 'inherit' }
  );
  if (!result.error && result.status === 0) {
    process.exit(0);
  }
}

console.warn(
  '[generate-dev-data] Could not generate public/apps.json (no working python/python3 found). ' +
  'The site will run against real data once you generate it manually -- see scripts/README.md.'
);
process.exit(0);
