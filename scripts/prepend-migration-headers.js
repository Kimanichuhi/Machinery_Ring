import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.resolve(__dirname, '../supabase/migrations');

async function prependHeader(filePath) {
  const fileName = path.basename(filePath);
  const content = await fs.readFile(filePath, 'utf8');
  if (content.startsWith(`-- Migration: ${fileName}`)) {
    return;
  }

  const header = `-- Migration: ${fileName}\n--\n`;
  await fs.writeFile(filePath, header + content, 'utf8');
  console.log(`Updated: ${fileName}`);
}

async function main() {
  const entries = await fs.readdir(migrationsDir, { withFileTypes: true });
  const sqlFiles = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.sql'))
    .map((entry) => path.join(migrationsDir, entry.name));

  for (const filePath of sqlFiles) {
    await prependHeader(filePath);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
