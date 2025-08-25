#!/usr/bin/env node
/*
 * check-ui-import-casing.js
 *
 * Scans the webapp/src tree for imports that reference `@/components/ui/...` and
 * verifies that the import path matches an actual file under
 * webapp/src/components/ui using case-sensitive resolution. This works on
 * macOS (case-insensitive) and Linux (case-sensitive) by enumerating
 * directory entries and comparing names exactly.
 *
 * Usage:
 *   node orchestra_webapp/scripts/check-ui-import-casing.js
 *
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WEBAPP_ROOT = path.resolve(__dirname, '..');
const SRC_ROOT = path.join(WEBAPP_ROOT, 'webapp', 'src');
const UI_ROOT = path.join(SRC_ROOT, 'components', 'ui');

const SOURCE_EXT = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];

function getAllSourceFiles(dir) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    const entries = fs.readdirSync(cur, { withFileTypes: true });
    for (const e of entries) {
      const p = path.join(cur, e.name);
      if (e.isDirectory()) {
        // skip node_modules
        if (e.name === 'node_modules' || e.name === '.git') continue;
        stack.push(p);
      } else if (e.isFile()) {
        if (p.endsWith('.ts') || p.endsWith('.tsx') || p.endsWith('.js') || p.endsWith('.jsx') || p.endsWith('.mjs') || p.endsWith('.cjs')) {
          out.push(p);
        }
      }
    }
  }
  return out;
}

function extractUiImports(content) {
  const imports = new Set();
  const importRegex = /from\s+['"](@\/components\/ui\/[\w\-\/\.]+)['"]/g;
  const dynamicRegex = /import\(\s*['"](@\/components\/ui\/[\w\-\/\.]+)['"]\s*\)/g;
  let m;
  while ((m = importRegex.exec(content))) imports.add(m[1]);
  while ((m = dynamicRegex.exec(content))) imports.add(m[1]);
  return [...imports];
}

// List all files under UI_ROOT and return array of relative paths (from UI_ROOT)
function listUiFiles() {
  const out = [];
  const stack = [UI_ROOT];
  while (stack.length) {
    const cur = stack.pop();
    const entries = fs.readdirSync(cur, { withFileTypes: true });
    for (const e of entries) {
      const p = path.join(cur, e.name);
      if (e.isDirectory()) {
        stack.push(p);
      } else if (e.isFile()) {
        out.push(path.relative(UI_ROOT, p));
      }
    }
  }
  return out;
}

function stripExt(p) {
  return p.replace(/\.(tsx|ts|jsx|js|mjs|cjs)$/i, '');
}

function findCaseInsensitiveCandidates(suffix, uiFiles) {
  // suffix like 'button' or 'fancy-file-selector/index'
  const match = uiFiles.filter(f => stripExt(f).toLowerCase() === suffix.toLowerCase());
  return match;
}

function checkExactMatch(suffix) {
  // verify exact match exists (case-sensitive) among allowed candidates
  for (const ext of SOURCE_EXT) {
    const p = path.join(UI_ROOT, suffix + ext);
    if (fs.existsSync(p)) return { ok: true, matched: path.relative(UI_ROOT, p) };
  }
  // check index files under directory
  const dir = path.join(UI_ROOT, suffix);
  if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
    for (const ext of SOURCE_EXT) {
      const p = path.join(dir, 'index' + ext);
      if (fs.existsSync(p)) return { ok: true, matched: path.relative(UI_ROOT, p) };
    }
  }
  return { ok: false };
}

async function main() {
  console.log('Scanning source files for "@/components/ui/..." imports');
  const srcFiles = getAllSourceFiles(SRC_ROOT);
  const uiFiles = listUiFiles();

  const importsMap = new Map(); // importPath => Set of files that import

  for (const file of srcFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const imports = extractUiImports(content);
    for (const imp of imports) {
      if (!importsMap.has(imp)) importsMap.set(imp, new Set());
      importsMap.get(imp).add(path.relative(WEBAPP_ROOT, file));
    }
  }

  const results = [];

  for (const [imp, files] of importsMap.entries()) {
    // imp is like '@/components/ui/button' or '@/components/ui/fancy-file-selector/index'
    const suffix = imp.replace('@/components/ui/', '');
    const exact = checkExactMatch(suffix);
    if (exact.ok) continue; // OK

    // Look for case-insensitive candidates
    const candidates = findCaseInsensitiveCandidates(suffix, uiFiles);
    results.push({ importPath: imp, files: Array.from(files), candidates });
  }

  if (results.length === 0) {
    console.log('\nNo case-mismatch issues detected for imports under @/components/ui.');
    process.exit(0);
  }

  console.log('\nPotential case-mismatch issues found:\n');
  for (const r of results) {
    console.log('Import: ', r.importPath);
    console.log('  Referenced from:');
    for (const f of r.files) console.log('    -', f);
    if (r.candidates.length > 0) {
      console.log('  Candidate files (case-insensitive matches found under components/ui):');
      for (const c of r.candidates) console.log('    -', c);
      console.log('  Suggestion: Update import to match the candidate filename (case-sensitive) OR rename the file to match import.');
    } else {
      console.log('  No candidate file found under components/ui. This import may reference a missing file.');
    }
    console.log('');
  }

  process.exit(1);
}

main().catch(err => {
  console.error(err);
  process.exit(2);
});
