'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml'
};

let currentServer = null;

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const rel = decodeURIComponent(req.url.split('?')[0]);
      const file = path.join(ROOT, rel);
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404);
        res.end('not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => {
      currentServer = server;
      server.port = server.address().port;
      server.base = `http://127.0.0.1:${server.port}`;
      resolve(server);
    });
  });
}

async function openHome(browser, opts = {}) {
  const base = opts.base || (currentServer && currentServer.base);
  if (!base) throw new Error('No server running. Call startServer() first.');
  const query = opts.query ? (opts.query.startsWith('?') ? opts.query : '?' + opts.query) : '';
  const page = await browser.newPage({ viewport: { width: 400, height: 620 } });
  page.__errors = [];
  page.on('pageerror', (e) => { page.__errors.push('pageerror: ' + e.message); });
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) {
      page.__errors.push('console: ' + m.text());
    }
  });

  await page.goto(`${base}/web/home/index.html${query}`);
  await page.evaluate(() => document.body.classList.add('webview-mode'));

  await page.waitForFunction(
    () => window.CuyHome && typeof window.CuyHome.listFeatures === 'function' && window.CuyHome.listFeatures().length > 10,
    { timeout: 10000 }
  );

  await page.waitForTimeout(600);
  if (await page.isVisible('#modalBackdrop.active')) {
    await page.click('#modalCloseBtn');
    await page.waitForTimeout(200);
  }

  return page;
}

async function openMore(page) {
  await page.click('#btnMore');
  await page.waitForSelector('#modalBackdrop.active', { timeout: 5000 });
}

async function openFromMore(page, title) {
  await page.waitForSelector('#modalBody button[data-open-feature]', { timeout: 5000 });
  const tile = page.locator('#modalBody button[data-open-feature]', { hasText: title });
  await tile.click();
  await page.waitForTimeout(200);
}

async function modalHtml(page) {
  return await page.$eval('.modal-body', el => el.innerHTML);
}

async function closeModal(page) {
  if (await page.isVisible('#modalCloseBtn')) {
    await page.click('#modalCloseBtn');
  } else {
    await page.keyboard.press('Escape');
  }
  await page.waitForTimeout(200);
}

async function pushState(page) {
  await page.evaluate(() => {
    if (window.bridge && typeof window.bridge.broadcastState === 'function') {
      window.bridge.broadcastState();
    } else if (window.bridge && typeof window.bridge.send === 'function') {
      window.bridge.send({ type: 'noop' });
    }
  });
  await page.waitForTimeout(100);
}

module.exports = {
  startServer,
  openHome,
  openMore,
  openFromMore,
  modalHtml,
  closeModal,
  pushState
};
