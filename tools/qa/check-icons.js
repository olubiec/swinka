'use strict';
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');

const iconsPath = path.join(ROOT, 'assets', 'icons', 'icons.json');
const iconsRaw = JSON.parse(fs.readFileSync(iconsPath, 'utf8'));
const iconKeys = Object.keys(iconsRaw.icons || iconsRaw);
const validIcons = new Set(iconKeys);

function hasIcon(id) {
  return validIcons.has(id) ||
         validIcons.has(id.replace(/-/g, '_')) ||
         validIcons.has(id.replace(/_/g, '-'));
}

function scanDir(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...scanDir(fullPath));
    } else if (entry.isFile() && /\.(html|js|css)$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

const homeDir = path.join(ROOT, 'web', 'home');
const files = scanDir(homeDir);

const ICON_CLASS_REGEX = /(?<![a-zA-Z0-9_-])icon-([a-zA-Z0-9_-]+)/g;
const missing = new Map();
let scannedCount = 0;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  for (const match of content.matchAll(ICON_CLASS_REGEX)) {
    const id = match[1];
    if (id.endsWith('-') || id.endsWith('_')) continue;
    const after = content.slice(match.index + match[0].length, match.index + match[0].length + 2);
    if (after === '${') continue;

    scannedCount++;
    if (!hasIcon(id)) {
      if (!missing.has(id)) missing.set(id, []);
      missing.get(id).push(path.relative(ROOT, file));
    }
  }
}

if (missing.size > 0) {
  console.error(`Missing ${missing.size} icon(s) in assets/icons/icons.json:`);
  for (const [id, locs] of missing.entries()) {
    console.error(`  - icon-${id} (found in: ${[...new Set(locs)].join(', ')})`);
  }
  process.exit(1);
}

console.log('ICONS OK');
process.exit(0);
