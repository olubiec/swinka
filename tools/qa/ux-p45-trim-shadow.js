'use strict';
/**
 * QA check for PK-P45c2: floor-edge dither shadow (trim_floor_shadow.png).
 *
 * Checks:
 *  - S1: file exists and is 16x4
 *  - S2: every non-transparent pixel colour is A (#382538) or B (#54394f)
 *  - S3: no pixel has alpha strictly between 0 and 255
 *  - S4: row 3 is fully transparent and opaque-pixel count per row is 16, 8, 4, 0
 *  - S5: running generator script twice produces identical bytes
 *
 * Uses built-in zlib.inflateSync to parse 8-bit RGBA PNG with filter types 0..4.
 */

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const child_process = require('node:child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const SHADOW_PNG = path.join(ROOT, 'assets', 'world', 'house', 'trim_floor_shadow.png');
const GENERATOR = path.join(ROOT, 'tools', 'art', 'room_trim_shadow.py');

const COLOR_A = { r: 0x38, g: 0x25, b: 0x38 }; // #382538 (56, 37, 56)
const COLOR_B = { r: 0x54, g: 0x39, b: 0x4f }; // #54394f (84, 57, 79)

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function parsePngRgba(buf) {
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  if (!buf.subarray(0, 8).equals(sig)) {
    throw new Error('Not a valid PNG file (signature mismatch)');
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idatChunks = [];

  while (offset < buf.length) {
    if (offset + 8 > buf.length) break;
    const length = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > buf.length) {
      throw new Error(`Corrupted PNG chunk ${type} at offset ${offset}`);
    }
    const data = buf.subarray(dataStart, dataEnd);
    offset = dataEnd + 4; // skip CRC

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data.readUInt8(8);
      colorType = data.readUInt8(9);
      if (bitDepth !== 8) {
        throw new Error(`Unsupported bit depth: ${bitDepth} (expected 8)`);
      }
      if (colorType !== 6) {
        throw new Error(`Unsupported color type: ${colorType} (expected RGBA=6)`);
      }
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    } else if (type === 'IEND') {
      break;
    }
  }

  if (width === 0 || height === 0) {
    throw new Error('Missing or empty IHDR chunk');
  }

  const decompressed = zlib.inflateSync(Buffer.concat(idatChunks));
  const bpp = 4; // RGBA 8-bit
  const rowBytes = width * bpp;
  const stride = 1 + rowBytes;

  if (decompressed.length !== height * stride) {
    throw new Error(`Decompressed length ${decompressed.length} does not match expected ${height * stride}`);
  }

  const prevRecon = Buffer.alloc(rowBytes, 0);
  const currRecon = Buffer.alloc(rowBytes, 0);
  const rows = [];

  for (let y = 0; y < height; y++) {
    const filterType = decompressed[y * stride];
    const raw = decompressed.subarray(y * stride + 1, (y + 1) * stride);

    for (let i = 0; i < rowBytes; i++) {
      const x = raw[i];
      const a = i >= bpp ? currRecon[i - bpp] : 0;
      const b = prevRecon[i];
      const c = i >= bpp ? prevRecon[i - bpp] : 0;

      let val = 0;
      switch (filterType) {
        case 0: // None
          val = x;
          break;
        case 1: // Sub
          val = (x + a) & 0xff;
          break;
        case 2: // Up
          val = (x + b) & 0xff;
          break;
        case 3: // Average
          val = (x + Math.floor((a + b) / 2)) & 0xff;
          break;
        case 4: // Paeth
          val = (x + paeth(a, b, c)) & 0xff;
          break;
        default:
          throw new Error(`Unsupported PNG filter type: ${filterType}`);
      }
      currRecon[i] = val;
    }

    const row = [];
    for (let px = 0; px < width; px++) {
      row.push({
        r: currRecon[px * bpp],
        g: currRecon[px * bpp + 1],
        b: currRecon[px * bpp + 2],
        a: currRecon[px * bpp + 3],
      });
    }
    rows.push(row);
    currRecon.copy(prevRecon);
  }

  return { width, height, rows };
}

function runGenerator() {
  const assetsRel = path.relative(process.cwd(), path.join(ROOT, 'assets'));
  try {
    child_process.execFileSync('python3', [GENERATOR, assetsRel], { stdio: 'pipe' });
  } catch (err) {
    if (err.code === 'ENOENT') {
      child_process.execFileSync('python', [GENERATOR, assetsRel], { stdio: 'pipe' });
    } else {
      throw err;
    }
  }
}

function matchColor(px, c) {
  return px.r === c.r && px.g === c.g && px.b === c.b;
}

function runTests() {
  const failures = [];

  // S1: file exists and is 16x4
  if (!fs.existsSync(SHADOW_PNG)) {
    failures.push(`S1 failed: ${SHADOW_PNG} does not exist`);
    console.error(failures.join('\n'));
    process.exit(1);
  }

  const buf = fs.readFileSync(SHADOW_PNG);
  let png;
  try {
    png = parsePngRgba(buf);
  } catch (err) {
    failures.push(`S1 failed: Could not parse PNG: ${err.message}`);
    console.error(failures.join('\n'));
    process.exit(1);
  }

  if (png.width !== 16 || png.height !== 4) {
    failures.push(`S1 failed: expected size 16x4, got ${png.width}x${png.height}`);
  }

  // S2: every non-transparent pixel colour is A or B
  // S3: no pixel has alpha strictly between 0 and 255
  // S4: row 3 is fully transparent and opaque-pixel count per row is 16, 8, 4, 0
  const opaqueCounts = [];

  for (let y = 0; y < png.height; y++) {
    let opaqueInRow = 0;
    for (let x = 0; x < png.width; x++) {
      const px = png.rows[y][x];

      // S3 check
      if (px.a !== 0 && px.a !== 255) {
        failures.push(`S3 failed: pixel at (${x}, ${y}) has partial alpha ${px.a}`);
      }

      if (px.a === 255) {
        opaqueInRow++;
        // S2 check
        const isA = matchColor(px, COLOR_A);
        const isB = matchColor(px, COLOR_B);
        if (!isA && !isB) {
          failures.push(`S2 failed: pixel at (${x}, ${y}) color (${px.r}, ${px.g}, ${px.b}) is neither Plum A nor Plum B`);
        }
      }
    }
    opaqueCounts.push(opaqueInRow);
  }

  const expectedCounts = [16, 8, 4, 0];
  for (let y = 0; y < 4; y++) {
    if (opaqueCounts[y] !== expectedCounts[y]) {
      failures.push(`S4 failed: row ${y} opaque count is ${opaqueCounts[y]}, expected ${expectedCounts[y]}`);
    }
  }

  // S5: script twice = identical bytes
  try {
    runGenerator();
    const bytes1 = fs.readFileSync(SHADOW_PNG);
    runGenerator();
    const bytes2 = fs.readFileSync(SHADOW_PNG);
    if (!bytes1.equals(bytes2)) {
      failures.push('S5 failed: running generator script twice produced different bytes');
    }
  } catch (err) {
    failures.push(`S5 failed to execute generator: ${err.message}`);
  }

  if (failures.length > 0) {
    console.error('UX P45 TRIM SHADOW FAILED:\n' + failures.join('\n'));
    process.exit(1);
  }

  console.log('UX P45 TRIM SHADOW OK (S1..S5 passed)');
}

runTests();
