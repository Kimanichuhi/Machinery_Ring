import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.resolve(__dirname, '../supabase/migrations');

function sanitizeName(input) {
  const trimmed = String(input || 'auto').trim();
  if (!trimmed) return 'auto';
  return trimmed
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '')
    .replace(/^_+|_+$/g, '')
    .substring(0, 64) || 'auto';
}

function timestamp() {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const hh = String(now.getUTCHours()).padStart(2, '0');
  const min = String(now.getUTCMinutes()).padStart(2, '0');
  const ss = String(now.getUTCSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}${hh}${min}${ss}`;
}

async function main() {
  try {
    await fs.mkdir(migrationsDir, { recursive: true });
  } catch (error) {
    console.error('Failed to ensure migrations directory exists:', error);
    process.exit(1);
  }

  const description = sanitizeName(process.argv[2]);
  const fileName = `${timestamp()}_${description}.sql`;
  const filePath = path.join(migrationsDir, fileName);
  const header = `-- Migration: ${fileName}\n--\n`;

  try {
    await fs.writeFile(filePath, `${header}-- Write your migration SQL here\n`, { flag: 'wx' });
    console.log(`Created migration: ${fileName}`);
    console.log(`Path: ${filePath}`);
  } catch (error) {
    if (error.code === 'EEXIST') {
      console.error(`Migration file already exists: ${fileName}`);
    } else {
      console.error('Failed to create migration file:', error);
    }
    process.exit(1);
  }
}

main();
