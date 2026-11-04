'use strict';
// Checks that every asset referenced by the data files exists on disk and that every
// icon-<id> class used by the Home page has an icons.json entry and a CSS rule.
// Pure Node.js, no dependencies, no network. Exit 0 = ok (WARN lines allowed), 1 = problems.
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const ASSETS = path.join(ROOT, 'assets');
const WORLD = path.join(ASSETS, 'world');
const HOME_DIR = path.join(ROOT, 'web', 'home');
const STYLE_CSS = path.join(HOME_DIR, 'style.css');
const BRIEF = path.join(ROOT, 'docs', 'DESIGNER_BRIEF.md');
const APP_ICON_DIR = path.join(ASSETS, 'app-icon');
const STAGES = ['baby', 'junior', 'adult', 'senior', 'legend'];

const problems = [];
const warnings = [];

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/');
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

// Ids named in DESIGNER_BRIEF.md lines that talk about glyph fallbacks. Only these may miss their art (WARN).
function loadFallbackText() {
  if (!fs.existsSync(BRIEF)) return '';
  return fs.readFileSync(BRIEF, 'utf8')
    .split(/\r?\n/)
    .filter((line) => /fallback|glyph/i.test(line))
    .join('\n');
}
const FALLBACK_TEXT = loadFallbackText();

function isDocumentedFallback(id) {
  if (!id) return false;
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^\\w])${escaped}([^\\w]|$)`).test(FALLBACK_TEXT);
}

// Records a referenced file. `owner` is the data id that references it (for the fallback rule).
function checkFile(from, base, relPath, owner) {
  if (typeof relPath !== 'string' || relPath === '') {
    problems.push(`${rel(from)}: empty file reference for ${owner || '?'}`);
    return;
  }
  const abs = path.join(base, relPath);
  if (fs.existsSync(abs)) return;
  const text = `${rel(from)}: missing ${rel(abs)} (referenced by ${owner || '?'})`;
  if (isDocumentedFallback(owner)) {
    warnings.push(`WARN ${text} - documented glyph fallback`);
  } else {
    problems.push(text);
  }
}

// Icon ids in icons.json use snake_case; CSS classes use kebab-case (icon-bell-pepper = bell_pepper).
function iconIdFromClass(cls) {
  return cls.replace(/-/g, '_');
}

function checkWorldAtlas() {
  const file = path.join(WORLD, 'atlas.json');
  const atlas = readJson(file);
  for (const [id, entry] of Object.entries(atlas.items || {})) {
    checkFile(file, WORLD, entry.file, id);
    if (entry.file_x2) checkFile(file, WORLD, entry.file_x2, id);
  }
  return atlas;
}

function checkTiles() {
  const file = path.join(WORLD, 'tiles.json');
  const tiles = readJson(file);
  for (const group of ['bg', 'tiles', 'market']) {
    for (const [id, entry] of Object.entries(tiles[group] || {})) {
      checkFile(file, WORLD, entry.file, id);
    }
  }
}

// Every placeable item needs an atlas sprite, or a documented glyph fallback (see DESIGNER_BRIEF).
function checkItemSprite(from, atlas, id) {
  if (atlas.items && atlas.items[id]) return;
  if (isDocumentedFallback(id)) {
    warnings.push(`WARN ${rel(from)}: ${id} has no atlas entry - documented glyph fallback`);
    return;
  }
  problems.push(`${rel(from)}: ${id} has no atlas entry and is not a documented glyph fallback`);
}

function checkWorldItems(atlas) {
  const file = path.join(ASSETS, 'data', 'world_items.json');
  const data = readJson(file);
  for (const item of data.items || []) {
    checkItemSprite(file, atlas, item.id);
  }
}

// Crops are drawn as icons (icons.json), so a crop is covered by an atlas entry or an icon id.
function checkFarm(atlas, icons) {
  const file = path.join(ASSETS, 'data', 'farm.json');
  const data = readJson(file);
  for (const crop of data.crops || []) {
    if (icons.has(crop.item)) continue;
    checkItemSprite(file, atlas, crop.item);
  }
}

function checkItemsFarm(icons) {
  const file = path.join(ASSETS, 'data', 'items_farm.json');
  const data = readJson(file);
  for (const item of data.items || []) {
    if (!item.icon) continue;
    if (!icons.has(iconIdFromClass(item.icon))) {
      problems.push(`${rel(file)}: icon "${item.icon}" of ${item.id} is not in assets/icons/icons.json`);
    }
  }
}

function checkPigs() {
  const file = path.join(ASSETS, 'data', 'pigs_named.json');
  const data = readJson(file);
  for (const pig of data.pigs || []) {
    for (const stage of STAGES) {
      checkFile(file, path.join(ASSETS, 'sprites', 'pigs'), path.join(pig.id, stage, 'spritesheet.png'), pig.id);
    }
    checkFile(file, path.join(ASSETS, 'sprites', 'portraits'), `${pig.id}.png`, pig.id);
  }
}

function checkUi() {
  const file = path.join(ASSETS, 'ui', 'ui.json');
  const data = readJson(file);
  for (const [id, entry] of Object.entries(data.items || {})) {
    checkFile(file, ASSETS, entry.file, id);
  }
}

function checkProps() {
  const file = path.join(ASSETS, 'props', 'props.json');
  const data = readJson(file);
  for (const [id, entry] of Object.entries(data.items || {})) {
    checkFile(file, ASSETS, entry.file, id);
    if (entry.file_x2) checkFile(file, ASSETS, entry.file_x2, id);
  }
}

function checkLights() {
  const file = path.join(ASSETS, 'data', 'lights.json');
  const data = readJson(file);
  for (const [id, src] of Object.entries(data.sources || {})) {
    for (const key of ['file', 'on_file', 'mask']) {
      if (src[key]) checkFile(file, WORLD, src[key], id);
    }
  }
  if (data.dust && data.dust.file) checkFile(file, WORLD, data.dust.file, 'dust');
}

function checkAppIcon() {
  if (!fs.existsSync(APP_ICON_DIR)) {
    problems.push(`${rel(APP_ICON_DIR)}: missing app icon folder`);
    return;
  }
  const files = fs.readdirSync(APP_ICON_DIR, { withFileTypes: true }).filter((e) => e.isFile());
  if (files.length === 0) problems.push(`${rel(APP_ICON_DIR)}: no app icon files`);
}

function scanHomeFiles(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) scanHomeFiles(full, out);
    else if (/\.(css|js|html)$/.test(entry.name)) out.push(full);
  }
  return out;
}

// Finds static icon-<id> class names. The lookbehind skips pixel-icon and --icon-count;
// the lookahead skips dynamic prefixes such as 'icon-badge-' + name or `icon-stage-${x}`.
const ICON_CLASS = /(?<![\w-])icon-([a-z0-9]+(?:-[a-z0-9]+)*)(?![\w$-])/g;

function checkIconClasses(icons) {
  const css = fs.readFileSync(STYLE_CSS, 'utf8');
  const used = new Map();
  for (const file of scanHomeFiles(HOME_DIR, [])) {
    const text = fs.readFileSync(file, 'utf8');
    let match;
    ICON_CLASS.lastIndex = 0;
    while ((match = ICON_CLASS.exec(text)) !== null) {
      if (!used.has(match[1])) used.set(match[1], rel(file));
    }
  }
  for (const [cls, file] of used) {
    if (!icons.has(iconIdFromClass(cls))) {
      problems.push(`${file}: icon-${cls} has no entry in assets/icons/icons.json`);
    }
    const ruleRe = new RegExp(`\\.icon-${cls.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w-])`);
    if (!ruleRe.test(css)) {
      problems.push(`${rel(STYLE_CSS)}: no CSS rule for .icon-${cls} (used in ${file})`);
    }
  }
}

// --x2 mode: the game must not read _x2 world files. Code (not data) is scanned for `file_x2`
// and `_x2.png`; data files (atlas.json, props.json) may keep their file_x2 keys.
const X2_SCAN_DIRS = ['web', 'src'];
const X2_CODE_EXT = /\.(js|cs|html|css)$/;
const X2_PATTERN = /file_x2|_x2\.png/;

function scanX2Files(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'bin' || entry.name === 'obj') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) scanX2Files(full, out);
    else if (X2_CODE_EXT.test(entry.name)) out.push(full);
  }
  return out;
}

function runX2() {
  const hits = [];
  for (const dir of X2_SCAN_DIRS) {
    const base = path.join(ROOT, dir);
    if (!fs.existsSync(base)) continue;
    for (const file of scanX2Files(base, [])) {
      const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
      lines.forEach((text, i) => {
        if (X2_PATTERN.test(text)) hits.push(`${rel(file)}:${i + 1}: ${text.trim()}`);
      });
    }
  }
  for (const line of hits) console.log(`X2 ${line}`);
  if (hits.length > 0) {
    console.log(`X2 FAIL: ${hits.length} code reference(s) to _x2 files`);
    process.exit(1);
  }
  console.log('X2 OK');
  process.exit(0);
}

function main() {
  const iconsJson = readJson(path.join(ASSETS, 'icons', 'icons.json'));
  const icons = new Set(Object.keys(iconsJson.icons || {}));

  const atlas = checkWorldAtlas();
  checkTiles();
  checkWorldItems(atlas);
  checkFarm(atlas, icons);
  checkItemsFarm(icons);
  checkPigs();
  checkUi();
  checkProps();
  checkLights();
  checkAppIcon();
  checkIconClasses(icons);

  for (const line of warnings) console.log(line);
  if (problems.length > 0) {
    for (const line of problems) console.log(`ERROR ${line}`);
    process.exit(1);
  }
  console.log('ASSETS OK');
  process.exit(0);
}

if (process.argv.includes('--x2')) runX2();
else main();
