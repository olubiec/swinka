Wykonaj to zadanie zgodnie z AGENTS.md (przeczytaj AGENTS.md najpierw). Jedno zadanie = jeden PR; tytuł PR = "<ID>: <tytuł>". Nie zadawaj pytań i nie zatrzymuj się. Jeśli coś jest niejasne, wybierz najprostsze rozwiązanie zgodne z plikiem zadania i AGENTS.md, a decyzję opisz w PR-ze w sekcji „Decisions”. Jeśli test nie przechodzi, znajdź przyczynę w kodzie i napraw ją w zakresie „Change”; nie zmieniaj asercji.

# W1-03: Layout checker for the Home smoke test (own module + self-test)
Goal: a dependency-free function that reports clipped, overflowing or empty-button layouts of the 420x640 Home window, with a test that proves it works.
Depends on: nothing (wave start).
Change: new `tools/qa/lib/layout.js`, new `tools/qa/lib/layout.selftest.js`, `.github/workflows/ci.yml` (one new step)
Do not touch: `tools/qa/web-smoke.js` (W2-02 owns it), `tools/qa/package.json` (no new dependency), everything else.
Steps:
1. `layout.js` exports `layoutProblems()` to be run with `page.evaluate` (a plain function, no imports, under 40 lines) and `async function assertLayout(page, label)` that waits 300 ms, calls it and throws an `Error` listing the problems. Reference body:
   ```js
   function layoutProblems() {
     const out = [], vw = window.innerWidth, vh = window.innerHeight;
     const root = document.querySelector('#modalBackdrop.active, .modal-backdrop.active') || document.body;
     const desc = (e) => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + ' "' + (e.textContent || '').trim().slice(0, 30) + '"';
     const scrollParent = (e) => { for (let p = e.parentElement; p; p = p.parentElement) {
       const o = getComputedStyle(p);
       if (/(auto|scroll)/.test(o.overflowX + o.overflowY) && (p.scrollHeight > p.clientHeight + 1 || p.scrollWidth > p.clientWidth + 1)) return p; } return null; };
     if (document.documentElement.scrollWidth > vw + 1) out.push('page scrolls horizontally');
     root.querySelectorAll('*').forEach((e) => {
       const r = e.getBoundingClientRect(), s = getComputedStyle(e);
       if (!r.width || !r.height || s.visibility === 'hidden' || s.display === 'none' || e.closest('[data-allow-clip]')) return;
       if (!scrollParent(e) && (r.right > vw + 1 || r.left < -1)) out.push('outside window (x): ' + desc(e));
       if (!scrollParent(e) && r.bottom > vh + 1) out.push('outside window (y): ' + desc(e));
       if (/hidden|clip/.test(s.overflowX) && s.textOverflow !== 'ellipsis' && e.scrollWidth > e.clientWidth + 1 && (e.textContent || '').trim())
         out.push('text cut off: ' + desc(e));
       if (e.tagName === 'BUTTON' && (r.width < 4 || r.height < 4)) out.push('button has no size: ' + desc(e));
     });
     return out.slice(0, 10);
   }
   ```
   Elements with the attribute `data-allow-clip` are exempt. Improve the function if the self-test needs it; do not weaken it.
2. `layout.selftest.js` (Playwright, viewport 420x640, `page.setContent`): one clean page must return no problems; four broken fixtures must each be reported (text wider than the window, a clipped label with `overflow:hidden`, a zero-size button, horizontal page scroll); a fixture with `data-allow-clip` must pass. Print `LAYOUT SELFTEST OK`, exit code 1 otherwise.
3. CI: in the `web` job add a step `node tools/qa/lib/layout.selftest.js` after the Playwright install and before the smoke test.
Verify: `npm --prefix tools/qa ci && npx --prefix tools/qa playwright install --with-deps chromium && node tools/qa/lib/layout.selftest.js` prints `LAYOUT SELFTEST OK`; `node tools/qa/web-smoke.js` still passes (it does not use the module yet; W2-02 does).
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Change".
PR: what was done, decisions and why, how to check by hand; screenshot if the change is visual.
