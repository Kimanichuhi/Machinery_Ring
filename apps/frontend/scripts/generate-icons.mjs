// One-off script to regenerate favicon/PWA icons from the existing 1024x1024
// source art, fixing: missing favicon.ico/-16x16/-32x32/-48x48 (referenced in
// index.html but absent), and oversized pwa-icon-192/512 (mislabeled 1024x1024
// originals at ~750KB each). Run with: node scripts/generate-icons.mjs
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');
const source = join(publicDir, 'pwa-icon-512.png');

async function pngBuffer(size) {
  return sharp(source).resize(size, size).png({ compressionLevel: 9 }).toBuffer();
}

function buildIco(pngBuffers) {
  // ICO format: 6-byte header, one 16-byte directory entry per image, then
  // the raw image data back-to-back. Storing PNG data directly in an ICO
  // entry is valid per the format spec since Windows Vista.
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(pngBuffers.length, 4);

  const dirEntries = [];
  const imageData = [];
  let offset = 6 + pngBuffers.length * 16;

  for (const { size, buffer } of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2); // color palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(buffer.length, 8);
    entry.writeUInt32LE(offset, 12);
    dirEntries.push(entry);
    imageData.push(buffer);
    offset += buffer.length;
  }

  return Buffer.concat([header, ...dirEntries, ...imageData]);
}

async function main() {
  const [png192, png512, png16, png32, png48] = await Promise.all([
    pngBuffer(192),
    pngBuffer(512),
    pngBuffer(16),
    pngBuffer(32),
    pngBuffer(48),
  ]);

  writeFileSync(join(publicDir, 'pwa-icon-192.png'), png192);
  writeFileSync(join(publicDir, 'pwa-icon-512.png'), png512);
  writeFileSync(join(publicDir, 'favicon-16x16.png'), png16);
  writeFileSync(join(publicDir, 'favicon-32x32.png'), png32);
  writeFileSync(join(publicDir, 'favicon-48x48.png'), png48);
  writeFileSync(
    join(publicDir, 'favicon.ico'),
    buildIco([
      { size: 16, buffer: png16 },
      { size: 32, buffer: png32 },
      { size: 48, buffer: png48 },
    ])
  );

  console.log('Generated: pwa-icon-192.png, pwa-icon-512.png, favicon-16x16.png, favicon-32x32.png, favicon-48x48.png, favicon.ico');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
