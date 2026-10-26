'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(__dirname, 'out');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.ico': 'image/x-icon', '.svg': 'image/svg+xml' };

function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const rel = decodeURIComponent(req.url.split('?')[0]);
      const file = path.join(ROOT, rel);
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404); res.end('not found'); return;
      }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 420, height: 640 } });

  await page.goto(base + '/web/home/index.html');
  await page.evaluate(() => document.body.classList.add('webview-mode'));
  await page.waitForTimeout(1200);

  await page.evaluate(() => window.CuyHome.openFeature('calendar'));
  await page.waitForTimeout(1000); // wait for load and animations

  // Tab 1: Today
  await page.evaluate(() => document.querySelector('.fc-tab[data-tab="today"]').click());
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, 'calendar_tab1_today.png') });

  // Tab 2: Month
  await page.evaluate(() => document.querySelector('.fc-tab[data-tab="month"]').click());
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, 'calendar_tab2_month.png') });

  // Tab 3: Weight
  await page.evaluate(() => document.querySelector('.fc-tab[data-tab="weight"]').click());
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, 'calendar_tab3_weight.png') });

  // Tab 4: Settings
  await page.evaluate(() => document.querySelector('.fc-tab[data-tab="settings"]').click());
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, 'calendar_tab4_settings.png') });

  console.log("Screenshots captured!");
  await browser.close();
  server.close();
})().catch(console.error);
