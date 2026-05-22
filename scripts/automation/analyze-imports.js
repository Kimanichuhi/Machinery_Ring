import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

const sourceRoots = [
  'apps/frontend/src',
  'apps/backend/src',
  'packages/shared-types/src',
  'packages/shared-utils/src',
  'packages/ui/src',
  'supabase/functions',
];

const extensions = ['.ts', '.tsx', '.js', '.jsx', '.d.ts'];
const importPattern =
  /(?:import\s+(?:type\s+)?(?:[^'"()]*?\s+from\s+)?|export\s+(?:type\s+)?[^'"()]*?\s+from\s+|import\s*\()\s*['"]([^'"]+)['"]/g;

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function walk(dir) {
  if (!(await exists(dir))) return [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(fullPath)));
    else if (extensions.includes(path.extname(entry.name))) files.push(fullPath);
  }
  return files;
}

async function resolveLocalImport(fromFile, specifier) {
  if (!specifier.startsWith('.') && !specifier.startsWith('@/')) return null;

  const base = specifier.startsWith('@/')
    ? path.join(rootDir, 'apps/frontend/src', specifier.slice(2))
    : path.resolve(path.dirname(fromFile), specifier);

  const candidates = [
    base,
    ...extensions.map((ext) => `${base}${ext}`),
    ...extensions.map((ext) => path.join(base, `index${ext}`)),
  ];

  for (const candidate of candidates) {
    if (await exists(candidate)) return path.relative(rootDir, candidate).replaceAll('\\', '/');
  }

  return { missing: path.relative(rootDir, base).replaceAll('\\', '/') };
}

function normalize(filePath) {
  return path.relative(rootDir, filePath).replaceAll('\\', '/');
}

function detectCycles(graph) {
  const cycles = [];
  const stack = [];
  const seen = new Set();
  const active = new Set();

  function visit(node) {
    if (active.has(node)) {
      const start = stack.indexOf(node);
      cycles.push([...stack.slice(start), node]);
      return;
    }
    if (seen.has(node)) return;
    seen.add(node);
    active.add(node);
    stack.push(node);
    for (const next of graph[node] || []) visit(next);
    stack.pop();
    active.delete(node);
  }

  Object.keys(graph).forEach(visit);
  return cycles;
}

async function main() {
  const absoluteRoots = sourceRoots.map((dir) => path.join(rootDir, dir));
  const files = (await Promise.all(absoluteRoots.map(walk))).flat();
  const graph = {};
  const importMap = {};
  const brokenImports = [];

  for (const file of files) {
    const relativeFile = normalize(file);
    const content = (await fs.readFile(file, 'utf8'))
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    const imports = [];
    graph[relativeFile] = [];

    for (const match of content.matchAll(importPattern)) {
      const specifier = match[1];
      const resolved = await resolveLocalImport(file, specifier);
      imports.push({
        specifier,
        resolved: typeof resolved === 'string' ? resolved : null,
        external: resolved === null,
      });
      if (typeof resolved === 'string') graph[relativeFile].push(resolved);
      if (resolved && typeof resolved === 'object') {
        brokenImports.push({
          file: relativeFile,
          specifier,
          expected: resolved.missing,
        });
      }
    }

    importMap[relativeFile] = imports;
  }

  const cycles = detectCycles(graph);
  const outDir = path.join(rootDir, 'docs/architecture');
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, 'import-map.json'), JSON.stringify(importMap, null, 2));
  await fs.writeFile(path.join(outDir, 'dependency-graph.json'), JSON.stringify(graph, null, 2));
  await fs.writeFile(path.join(outDir, 'broken-imports.json'), JSON.stringify(brokenImports, null, 2));
  await fs.writeFile(path.join(outDir, 'circular-dependencies.json'), JSON.stringify(cycles, null, 2));

  console.log(JSON.stringify({
    files: files.length,
    brokenImports: brokenImports.length,
    circularDependencies: cycles.length,
  }, null, 2));

  if (brokenImports.length > 0 || cycles.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
