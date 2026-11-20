// Generates app/favicon.ico: a gold trophy glyph on a dark navy rounded square.
// Draws a 64x64 RGBA image pixel by pixel, encodes it as a PNG with node's zlib, and wraps the PNG in an
// ICO container (browsers accept a PNG payload inside .ico). Run: node gen-favicon.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const SIZE = 64;
const px = new Uint8Array(SIZE * SIZE * 4);

const NAVY = [10, 17, 34, 255];
const NAVY_EDGE = [38, 53, 90, 255];
const GOLD = [217, 169, 65, 255];
const GOLD_LIGHT = [240, 205, 114, 255];
const CLEAR = [0, 0, 0, 0];

function set(x, y, color) {
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
  const i = (y * SIZE + x) * 4;
  px[i] = color[0]; px[i + 1] = color[1]; px[i + 2] = color[2]; px[i + 3] = color[3];
}
function fillRect(x0, y0, x1, y1, color) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, color);
}
function inRoundedSquare(x, y) {
  const r = 12;
  const cx = Math.min(Math.max(x, r), SIZE - 1 - r);
  const cy = Math.min(Math.max(y, r), SIZE - 1 - r);
  return (x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r || (x >= r && x < SIZE - r) || (y >= r && y < SIZE - r);
}

// Background: rounded square, navy with a lighter edge.
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    if (!inRoundedSquare(x, y)) { set(x, y, CLEAR); continue; }
    const edge = x < 3 || y < 3 || x >= SIZE - 3 || y >= SIZE - 3;
    set(x, y, edge ? NAVY_EDGE : NAVY);
  }
}

// Trophy cup: a trapezoid bowl (rows narrow toward the bottom), two handles, a stem and a base.
for (let y = 14; y <= 30; y++) {
  const t = (y - 14) / 16;                    // 0 at the rim, 1 at the bowl's bottom
  const half = Math.round(13 - 7 * t);        // half-width shrinks 13 -> 6
  for (let x = 32 - half; x <= 32 + half; x++) set(x, y, y <= 17 ? GOLD_LIGHT : GOLD);
}
// Handles: arcs on both sides of the bowl.
for (let y = 16; y <= 26; y++) {
  const t = (y - 16) / 10;
  const off = Math.round(14 + 3 * Math.sin(t * Math.PI));
  set(32 - off, y, GOLD); set(32 - off + 1, y, GOLD);
  set(32 + off, y, GOLD); set(32 + off - 1, y, GOLD);
}
// Stem and base.
fillRect(29, 31, 35, 40, GOLD);
fillRect(22, 41, 42, 44, GOLD);
fillRect(20, 45, 44, 48, GOLD_LIGHT);

// --- PNG encoding (RGBA, filter 0 per row) ---
function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let c = 0xffffffff;
  for (const b of buf) c = table[(c ^ b) & 0xff] ^ (c >>> 8);
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
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8;   // bit depth
ihdr[9] = 6;   // colour type RGBA
const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));
for (let y = 0; y < SIZE; y++) {
  raw[y * (SIZE * 4 + 1)] = 0;
  Buffer.from(px.buffer, y * SIZE * 4, SIZE * 4).copy(raw, y * (SIZE * 4 + 1) + 1);
}
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

// --- ICO container with the PNG as its single image ---
const ico = Buffer.alloc(6 + 16);
ico.writeUInt16LE(0, 0);       // reserved
ico.writeUInt16LE(1, 2);       // type: icon
ico.writeUInt16LE(1, 4);       // one image
ico[6] = SIZE;                 // width
ico[7] = SIZE;                 // height
ico[8] = 0;                    // palette colours
ico[9] = 0;                    // reserved
ico.writeUInt16LE(1, 10);      // colour planes
ico.writeUInt16LE(32, 12);     // bits per pixel
ico.writeUInt32LE(png.length, 14);
ico.writeUInt32LE(6 + 16, 18); // image offset

writeFileSync(new URL('./app/favicon.ico', import.meta.url), Buffer.concat([ico, png]));
console.log(`app/favicon.ico written (${6 + 16 + png.length} bytes, PNG payload ${png.length} bytes)`);
