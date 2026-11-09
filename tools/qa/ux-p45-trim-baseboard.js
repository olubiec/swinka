#!/usr/bin/env node
/**
 * QA test for PK-P45c1: baseboard strip sprite verification.
 * Checks B1-B6:
 * B1 the file exists and is 16x8;
 * B2 every pixel colour is in the palette (flatten ramps + outline fg/deep);
 * B3 every pixel has alpha 255;
 * B4 columns 0 and 15 are identical;
 * B5 no #ffffff/#000000;
 * B6 the python script run twice leaves the file byte-identical (run it with a temp assets dir).
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const zlib = require('zlib');
const cp = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const TRIM_PATH = path.join(ROOT, 'assets', 'world', 'house', 'trim_baseboard.png');
const PALETTE_PATH = path.join(ROOT, 'assets', 'data', 'style_palette.json');
const SCRIPT_PATH = path.join(ROOT, 'tools', 'art', 'room_trim_baseboard.py');

function readPngRgba(filePath) {
  const buf = fs.readFileSync(filePath);
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < 8; i++) {
    if (buf[i] !== sig[i]) {
      throw new Error(`Not a PNG file: ${filePath}`);
    }
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idatChunks = [];

  while (offset < buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    const data = buf.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    } else if (type === 'IEND') {
      break;
    }
  }

  if (colorType !== 6 || bitDepth !== 8) {
    throw new Error(`Expected RGBA 8-bit PNG, got colorType=${colorType}, bitDepth=${bitDepth}`);
  }

  const raw = zlib.inflateSync(Buffer.concat(idatChunks));
  const bpp = 4;
  const rowStride = 1 + width * bpp;
  if (raw.length !== height * rowStride) {
    throw new Error(`Invalid decompressed data length: got ${raw.length}, expected ${height * rowStride}`);
  }

  function paeth(a, b, c) {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc) return a;
    if (pb <= pc) return b;
    return c;
  }

  const rows = [];
  const prevRow = Buffer.alloc(width * bpp);
  const currRow = Buffer.alloc(width * bpp);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowStride;
    const filter = raw[rowOffset];

    for (let i = 0; i < width * bpp; i++) {
      const x = raw[rowOffset + 1 + i];
      const a = i >= bpp ? currRow[i - bpp] : 0;
      const b = prevRow[i];
      const c = i >= bpp ? prevRow[i - bpp] : 0;

      let val = 0;
      if (filter === 0) {
        val = x;
      } else if (filter === 1) {
        val = (x + a) & 0xff;
      } else if (filter === 2) {
        val = (x + b) & 0xff;
      } else if (filter === 3) {
        val = (x + Math.floor((a + b) / 2)) & 0xff;
      } else if (filter === 4) {
        val = (x + paeth(a, b, c)) & 0xff;
      } else {
        throw new Error(`Unknown filter ${filter} at row ${y}`);
      }
      currRow[i] = val;
    }

    const rowPixels = [];
    for (let x = 0; x < width; x++) {
      rowPixels.push([
        currRow[x * bpp],
        currRow[x * bpp + 1],
        currRow[x * bpp + 2],
        currRow[x * bpp + 3],
      ]);
    }
    rows.push(rowPixels);
    currRow.copy(prevRow);
  }

  return { width, height, rows };
}

function getPythonBin() {
  if (process.env.PYTHON) return process.env.PYTHON;
  try {
    cp.execFileSync('python3', ['--version'], { stdio: 'ignore' });
    return 'python3';
  } catch (e) {
    return 'python';
  }
}

function runTests() {
  console.log('Testing PK-P45c1 baseboard strip...');

  // B1: file exists and is 16x8
  if (!fs.existsSync(TRIM_PATH)) {
    throw new Error(`B1 FAILED: File does not exist at ${TRIM_PATH}`);
  }
  const img = readPngRgba(TRIM_PATH);
  if (img.width !== 16 || img.height !== 8) {
    throw new Error(`B1 FAILED: Expected size 16x8, got ${img.width}x${img.height}`);
  }
  console.log('  [PASS] B1: File exists and is 16x8');

  // Palette loading for B2
  const pal = JSON.parse(fs.readFileSync(PALETTE_PATH, 'utf8'));
  const paletteSet = new Set();
  for (const ramp of Object.values(pal.ramps)) {
    for (const hex of ramp) {
      paletteSet.add(hex.toLowerCase());
    }
  }
  if (pal.outline && pal.outline.fg) paletteSet.add(pal.outline.fg.toLowerCase());
  if (pal.outline && pal.outline.deep) paletteSet.add(pal.outline.deep.toLowerCase());

  // B2, B3, B4, B5
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const [r, g, b, a] = img.rows[y][x];

      // B3: every pixel has alpha 255
      if (a !== 255) {
        throw new Error(`B3 FAILED: Pixel (${x}, ${y}) has alpha ${a} !== 255`);
      }

      // B5: no #ffffff / #000000
      if (r === 255 && g === 255 && b === 255) {
        throw new Error(`B5 FAILED: Pixel (${x}, ${y}) is #ffffff`);
      }
      if (r === 0 && g === 0 && b === 0) {
        throw new Error(`B5 FAILED: Pixel (${x}, ${y}) is #000000`);
      }

      // B2: every pixel colour in palette
      const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toLowerCase();
      if (!paletteSet.has(hex)) {
        throw new Error(`B2 FAILED: Pixel (${x}, ${y}) color ${hex} not in palette`);
      }
    }
  }
  console.log('  [PASS] B2: Every pixel color is in palette');
  console.log('  [PASS] B3: Every pixel has alpha 255');
  console.log('  [PASS] B5: No pure white or black');

  // B4: columns 0 and 15 are identical
  for (let y = 0; y < img.height; y++) {
    const col0 = img.rows[y][0];
    const col15 = img.rows[y][15];
    if (col0[0] !== col15[0] || col0[1] !== col15[1] || col0[2] !== col15[2] || col0[3] !== col15[3]) {
      throw new Error(`B4 FAILED: Column 0 and Column 15 differ at row ${y}: col0=[${col0}], col15=[${col15}]`);
    }
  }
  console.log('  [PASS] B4: Columns 0 and 15 are identical');

  // B6: python script run twice leaves file byte-identical
  const pythonBin = getPythonBin();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cuy-trim-baseboard-'));
  try {
    cp.execFileSync(pythonBin, [SCRIPT_PATH, tmpDir], { encoding: 'utf8' });
    const generated1 = fs.readFileSync(path.join(tmpDir, 'world', 'house', 'trim_baseboard.png'));

    cp.execFileSync(pythonBin, [SCRIPT_PATH, tmpDir], { encoding: 'utf8' });
    const generated2 = fs.readFileSync(path.join(tmpDir, 'world', 'house', 'trim_baseboard.png'));

    if (!generated1.equals(generated2)) {
      throw new Error('B6 FAILED: Running python script twice produced different bytes');
    }
    console.log('  [PASS] B6: Python script is byte-identical across runs');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  console.log('ALL BASEBOARD TRIM CHECKS PASSED');
}

try {
  runTests();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
