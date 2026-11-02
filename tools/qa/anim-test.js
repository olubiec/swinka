// Home animation test (Chromium): every one of the 60 animations must be playable by PigCanvas for every life stage,
// with the same row/frames/fps/loop as that stage's animations.json, and every frame must hold pixels (peek 0 and 11 are empty by design).
// Usage: node tools/qa/anim-test.js   (CHROMIUM_PATH optional)
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..', '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.wav': 'audio/wav', '.ogg': 'audio/ogg' };

(async () => {
  const server = http.createServer((req, res) => {
    const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 400, height: 620 } });
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  await page.goto(base + '/web/home/index.html');
  await page.waitForTimeout(1000);
  const problems = await page.evaluate(async (b) => {
    const out = [];
    const pc = new window.PigCanvas(document.createElement('canvas'));
    const stages = ['baby', 'junior', 'adult', 'senior', 'legend'];
    for (const stage of stages) {
      const meta = await (await fetch(b + '/assets/sprites/' + stage + '/animations.json')).json();
      pc.stageKey = stage;
      pc.breed = 'smooth';
      for (let i = 0; i < 200 && !window.CuySprites.sheet('smooth', stage, 'tricolor'); i++) await new Promise((r) => setTimeout(r, 25));
      const sheet = window.CuySprites.sheet('smooth', stage, 'tricolor');
      if (!sheet) { out.push(stage + ': sheet not loaded'); continue; }
      const ctx = sheet.getContext('2d');
      const names = Object.keys(meta.animations);
      if (names.length !== 60) out.push(stage + ': ' + names.length + ' animations in json');
      for (const name of names) {
        const m = meta.animations[name];
        pc.playAnim(name, 0);
        if (pc.currentAnim !== name) { out.push(stage + '/' + name + ': falls back to ' + pc.currentAnim); continue; }
        const d = pc.defFor(name);
        if (d.row !== m.row || d.frames !== m.frames || d.fps !== m.fps || d.loop !== m.loop)
          out.push(stage + '/' + name + ': table differs ' + JSON.stringify(d) + ' vs ' + JSON.stringify(m));
        for (let f = 0; f < m.frames; f++) {
          const px = ctx.getImageData(f * 64, m.row * 64, 64, 64).data;
          let any = false;
          for (let i = 3; i < px.length; i += 4) if (px[i] > 0) { any = true; break; }
          if (!any && !(name === 'peek' && (f === 0 || f === 11))) out.push(stage + '/' + name + '[' + f + '] empty');
        }
      }
    }
    return out;
  }, base);
  await browser.close();
  server.close();
  const bad = problems.concat(pageErrors);
  if (bad.length) { console.error('ANIM TEST FAILED\n' + bad.slice(0, 30).join('\n')); process.exit(1); }
  console.log('ANIM TEST OK (60 animations x 5 stages)');
})();
