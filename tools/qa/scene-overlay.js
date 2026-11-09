'use strict';
const path = require('path');
const fs = require('fs');

if (!process.env.NODE_PATH) {
  process.env.NODE_PATH = path.join(__dirname, 'node_modules');
  require('module').Module._initPaths();
}

const { chromium } = require('playwright');
const ux = require('./lib/ux.js');

const LAYERS = ['walk', 'blockers', 'exits', 'grid', 'crop', 'pig'];
const DEFAULT_LAYERS = ['walk', 'blockers', 'exits'];
const DEFAULT_SCENES = ['garden', 'park', 'farm', 'market', 'room'];
const DEFAULT_OUT_DIR = path.resolve(__dirname, '../../docs/qa/calibration');

const palettePath = path.resolve(__dirname, '../../assets/data/style_palette.json');
let PALETTE = {
  moss3: '#97a569',
  brick2: '#b8604a',
  rose1: '#d98a86',
  flame1: '#ff9f45',
  dusk4: '#b9c9c4',
  linen1: '#d9c096'
};

try {
  const paletteData = JSON.parse(fs.readFileSync(palettePath, 'utf8'));
  if (paletteData && paletteData.ramps) {
    PALETTE = {
      moss3: paletteData.ramps.moss[3],
      brick2: paletteData.ramps.brick[2],
      rose1: paletteData.ramps.rose[1],
      flame1: paletteData.ramps.flame[1],
      dusk4: paletteData.ramps.dusk[4],
      linen1: paletteData.ramps.linen[1]
    };
  }
} catch (e) {}

function getLaunchOptions() {
  if (process.env.CHROMIUM_PATH) {
    return { executablePath: process.env.CHROMIUM_PATH };
  }
  const candidates = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return { executablePath: c };
    }
  }
  return {};
}

async function renderOverlay(sceneId, outPath, opts = {}) {
  const ownBrowser = !opts.page;
  let server = null;
  let browser = null;
  let page = opts.page;

  let activeLayers = opts.layers ? opts.layers.slice() : DEFAULT_LAYERS.slice();
  if (opts.grid && !activeLayers.includes('grid')) {
    activeLayers.push('grid');
  }

  try {
    if (!page) {
      server = await ux.startServer();
      browser = await chromium.launch(getLaunchOptions());
      page = await ux.openHome(browser);
    }

    const result = await page.evaluate(async ({ sceneId, layers, palette }) => {
      if (window.CuyScenes && window.CuyScenes.load) {
        await window.CuyScenes.load();
      }
      const lookupId = (sceneId === 'room') ? 'salon' : sceneId;
      const def = (window.CuyScenes && window.CuyScenes.def) ? window.CuyScenes.def(lookupId, 'day') : null;
      if (!def || !def.size) {
        throw new Error('Scene definition not found for: ' + sceneId);
      }

      const [sw, sh] = def.size;
      const canvas = document.createElement('canvas');
      canvas.width = sw * 4;
      canvas.height = sh * 4;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;

      const isRoom = (sceneId === 'room' || sceneId === 'salon' || def.kind === 'room' || !def.bgUrl);
      if (isRoom) {
        ctx.fillStyle = palette.linen1;
        ctx.fillRect(0, 0, sw * 4, sh * 4);
      } else {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Failed to load bg image: ' + def.bgUrl));
          img.src = def.bgUrl;
          if (img.complete && img.naturalWidth > 0) resolve();
        });
        ctx.drawImage(img, 0, 0, sw * 4, sh * 4);
      }

      function drawOutline(x0, y0, x1, y1, color) {
        const X0 = x0 * 4;
        const Y0 = y0 * 4;
        const X1 = x1 * 4;
        const Y1 = y1 * 4;
        const W = X1 - X0;
        const H = Y1 - Y0;

        ctx.fillStyle = color;
        if (W <= 8 || H <= 8) {
          ctx.fillRect(X0, Y0, W, H);
        } else {
          ctx.fillRect(X0, Y0, W, 4);
          ctx.fillRect(X0, Y1 - 4, W, 4);
          ctx.fillRect(X0, Y0 + 4, 4, H - 8);
          ctx.fillRect(X1 - 4, Y0 + 4, 4, H - 8);
        }
      }

      for (const layer of layers) {
        if (layer === 'walk') {
          if (def.walk && Array.isArray(def.walk) && def.walk.length === 4) {
            const [wx0, wy0, wx1, wy1] = def.walk;
            drawOutline(wx0, wy0, wx1, wy1, palette.moss3);
          }
        } else if (layer === 'blockers') {
          if (Array.isArray(def.blockers)) {
            for (const b of def.blockers) {
              if (b && Array.isArray(b.rect) && b.rect.length === 4) {
                const [bx0, by0, bx1, by1] = b.rect;
                drawOutline(bx0, by0, bx1, by1, palette.brick2);
              }
            }
          }
          if (typeof def.behindLine === 'number') {
            ctx.fillStyle = palette.rose1;
            ctx.fillRect(0, def.behindLine * 4, sw * 4, 4);
          }
        } else if (layer === 'exits') {
          if (def.exits && typeof def.exits === 'object') {
            for (const exit of Object.values(def.exits)) {
              if (exit && typeof exit.x === 'number') {
                let ex = Math.round(exit.x - 4);
                if (ex < 0) ex = 0;
                if (ex + 8 > sw) ex = sw - 8;
                ctx.fillStyle = palette.flame1;
                ctx.fillRect(ex * 4, (sh - 8) * 4, 8 * 4, 8 * 4);
              }
            }
          }
        } else if (layer === 'grid') {
          ctx.fillStyle = palette.dusk4;
          for (let x = 0; x < sw; x += 16) {
            const X = x * 4;
            for (let Y = 0; Y < sh * 4; Y += 8) {
              ctx.fillRect(X, Y, 4, 4);
            }
          }
          for (let y = 0; y < sh; y += 16) {
            const Y = y * 4;
            for (let X = 0; X < sw * 4; X += 8) {
              ctx.fillRect(X, Y, 4, 4);
            }
          }
        }
      }

      return {
        dataUrl: canvas.toDataURL('image/png'),
        width: sw * 4,
        height: sh * 4
      };
    }, { sceneId, layers: activeLayers, palette: PALETTE });

    const base64Data = result.dataUrl.replace(/^data:image\/png;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    if (outPath) {
      fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
      fs.writeFileSync(outPath, buffer);
    }

    return {
      outPath: outPath || null,
      buffer,
      width: result.width,
      height: result.height
    };
  } finally {
    if (ownBrowser) {
      if (browser) await browser.close();
      if (server) server.close();
    }
  }
}

function parseCliArgs(argv) {
  const scenes = [];
  let out = null;
  let layers = null;
  let grid = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--out') {
      out = argv[++i];
    } else if (arg.startsWith('--out=')) {
      out = arg.slice(6);
    } else if (arg === '--layers') {
      const val = argv[++i] || '';
      layers = val.split(',').map(s => s.trim()).filter(Boolean);
    } else if (arg.startsWith('--layers=')) {
      layers = arg.slice(9).split(',').map(s => s.trim()).filter(Boolean);
    } else if (arg === '--grid') {
      grid = true;
    } else if (!arg.startsWith('--')) {
      scenes.push(arg);
    }
  }

  return {
    scenes: scenes.length > 0 ? scenes : DEFAULT_SCENES,
    out: out ? path.resolve(process.cwd(), out) : DEFAULT_OUT_DIR,
    layers,
    grid
  };
}

async function main() {
  const args = parseCliArgs(process.argv.slice(2));
  fs.mkdirSync(args.out, { recursive: true });

  const server = await ux.startServer();
  const browser = await chromium.launch(getLaunchOptions());
  try {
    const page = await ux.openHome(browser);
    for (const sceneId of args.scenes) {
      const outPath = path.join(args.out, `${sceneId}.png`);
      await renderOverlay(sceneId, outPath, {
        layers: args.layers,
        grid: args.grid,
        page
      });
      console.log(`Wrote ${outPath}`);
    }
  } finally {
    await browser.close();
    server.close();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Error running scene-overlay:', err);
    process.exit(1);
  });
}

module.exports = {
  renderOverlay,
  LAYERS,
  DEFAULT_LAYERS,
  DEFAULT_SCENES
};
