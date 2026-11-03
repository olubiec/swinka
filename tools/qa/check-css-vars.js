'use strict';
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const HOME_DIR = path.join(ROOT, 'web', 'home');
const STYLE_CSS = path.join(HOME_DIR, 'style.css');

// Known legacy / feature variables not yet migrated into style.css
const KNOWN_EXCEPTIONS = new Set([
  '--c-leaf-light',
  '--c-hay-bright',
  '--c-shadow',
  '--c-leaf-bright',
]);

function stripComments(content, isJs = false) {
  let clean = content.replace(/\/\*[\s\S]*?\*\//g, '');
  if (isJs) {
    clean = clean.replace(/\/\/.*$/gm, '');
  }
  return clean;
}

function findDefinedVarsInCss(content) {
  const clean = stripComments(content, false);
  const defs = new Set();
  const defRegex = /(--[a-zA-Z0-9_-]+)\s*:/g;
  let match;
  while ((match = defRegex.exec(clean)) !== null) {
    defs.add(match[1]);
  }
  return defs;
}

function findLocalDefs(content, isJs) {
  const clean = stripComments(content, isJs);
  const defs = new Set();
  if (isJs) {
    const jsPropRegex = /setProperty\(\s*['"`](--[a-zA-Z0-9_-]+)['"`]/g;
    let match;
    while ((match = jsPropRegex.exec(clean)) !== null) {
      defs.add(match[1]);
    }
  } else {
    const cssDefRegex = /(--[a-zA-Z0-9_-]+)\s*:/g;
    let match;
    while ((match = cssDefRegex.exec(clean)) !== null) {
      defs.add(match[1]);
    }
  }
  return defs;
}

function findUsages(content, isJs) {
  const clean = stripComments(content, isJs);
  const usages = [];
  const varRegex = /var\(\s*(--[a-zA-Z0-9_-]+)/g;
  let match;
  while ((match = varRegex.exec(clean)) !== null) {
    usages.push(match[1]);
  }
  return usages;
}

function scanFiles(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...scanFiles(fullPath));
    } else if (entry.isFile() && /\.(css|js)$/.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

function main() {
  if (!fs.existsSync(STYLE_CSS)) {
    console.error(`Error: style.css not found at ${STYLE_CSS}`);
    process.exit(1);
  }

  const styleContent = fs.readFileSync(STYLE_CSS, 'utf8');
  const styleDefs = findDefinedVarsInCss(styleContent);

  const files = scanFiles(HOME_DIR);
  const unknownUsages = [];

  for (const filePath of files) {
    const isJs = filePath.endsWith('.js');
    const content = fs.readFileSync(filePath, 'utf8');
    const localDefs = findLocalDefs(content, isJs);
    const usages = findUsages(content, isJs);

    for (const varName of usages) {
      if (!styleDefs.has(varName) && !localDefs.has(varName) && !KNOWN_EXCEPTIONS.has(varName)) {
        unknownUsages.push({
          file: path.relative(ROOT, filePath).replace(/\\/g, '/'),
          varName,
        });
      }
    }
  }

  if (unknownUsages.length > 0) {
    console.error(`Found ${unknownUsages.length} unknown CSS variable usage(s):`);
    for (const item of unknownUsages) {
      console.error(`  ${item.file}: ${item.varName}`);
    }
    process.exit(1);
  }

  console.log('CSS VARS OK');
  process.exit(0);
}

main();
