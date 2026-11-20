// make-favicon.mjs — draws the Atlas favicon: a gold trophy glyph on a dark
// rounded square, encoded as a PNG and wrapped in an .ico container.
// Standard library only. Run: node make-favicon.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SIZE = 48;
const px = new Uint8Array(SIZE * SIZE * 4);

function setPixel(x, y, [r, g, b, a]) {
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
  const i = (y * SIZE + x) * 4;
  px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = a;
}
function fillRect(x0, y0, x1, y1, color) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) setPixel(x, y, color);
}

const BG = [13, 21, 38, 255];
const GOLD = [217, 164, 65, 255];
const GOLD_LIGHT = [240, 197, 105, 255];

// Background: rounded square (corner radius 9) with a gold rim.
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const cx = Math.max(9 - x, x - (SIZE - 10), 0);
    const cy = Math.max(9 - y, y - (SIZE - 10), 0);
    if (Math.hypot(cx, cy) <= 9) {
      const edge = x === 0 || y === 0 || x === SIZE - 1 || y === SIZE - 1 || cx + cy >= 8;
      setPixel(x, y, BG);
      if (edge && Math.hypot(cx, cy) >= 8) setPixel(x, y, GOLD);
    }
  }
}

// Handles: gold rings either side of the cup.
for (const hx of [11, 37]) {
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const d = Math.hypot(x - hx, y - 17);
      if (d >= 3.2 && d <= 5.4) setPixel(x, y, GOLD);
    }
  }
}

// Cup: a trapezoid, wide at the rim (y=11) narrowing to y=27, with a lighter band.
for (let y = 11; y <= 27; y++) {
  const t = (y - 11) / 16;
  const half = 12 - t * 5.5;
  for (let x = Math.round(24 - half); x <= Math.round(24 + half); x++) {
    setPixel(x, y, y <= 13 ? GOLD_LIGHT : GOLD);
  }
}
// Stem and base.
fillRect(22, 28, 26, 33, GOLD);
fillRect(17, 34, 31, 36, GOLD);
fillRect(15, 37, 33, 39, GOLD_LIGHT);

// ---- PNG encode (RGBA, no filtering) ------------------------------------------
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));
for (let y = 0; y < SIZE; y++) {
  raw[y * (SIZE * 4 + 1)] = 0;
  Buffer.from(px.buffer, y * SIZE * 4, SIZE * 4).copy(raw, y * (SIZE * 4 + 1) + 1);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // colour type RGBA
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

// ---- ICO wrap (PNG-compressed entry) -------------------------------------------
const header = Buffer.alloc(6);
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(1, 4); // image count
const entry = Buffer.alloc(16);
entry[0] = SIZE; // width
entry[1] = SIZE; // height
entry.writeUInt16LE(1, 4); // colour planes
entry.writeUInt16LE(32, 6); // bits per pixel
entry.writeUInt32LE(png.length, 8);
entry.writeUInt32LE(6 + 16, 12); // offset of image data
const ico = Buffer.concat([header, entry, png]);

const out = join(dirname(fileURLToPath(import.meta.url)), 'app', 'favicon.ico');
writeFileSync(out, ico);
console.log(`wrote ${out} (${ico.length} bytes, PNG payload ${png.length} bytes)`);
