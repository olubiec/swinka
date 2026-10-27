'use strict';
function layoutProblems() {
  const out = [], vw = window.innerWidth, vh = window.innerHeight;
  const root = document.querySelector('#modalBackdrop.active, .modal-backdrop.active') || document.body;
  const desc = (e) => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + ' "' + (e.textContent || '').trim().slice(0, 30) + '"';
  const scrollParent = (e) => { for (let p = e.parentElement; p; p = p.parentElement) {
    const o = getComputedStyle(p);
    if (/(auto|scroll)/.test(o.overflowX + o.overflowY) && (p.scrollHeight > p.clientHeight + 1 || p.scrollWidth > p.clientWidth + 1)) return p; } return null; };
  if (document.documentElement.scrollWidth > vw + 1) {
    const isExempt = Array.from(document.querySelectorAll('*')).some(e => e.getBoundingClientRect().right > vw + 1 && e.closest('[data-allow-clip]'));
    const isNormal = Array.from(document.querySelectorAll('*')).some(e => e.getBoundingClientRect().right > vw + 1 && !e.closest('[data-allow-clip]'));
    if (!isExempt || isNormal) out.push('page scrolls horizontally');
  }
  root.querySelectorAll('*').forEach((e) => {
    const r = e.getBoundingClientRect(), s = getComputedStyle(e);
    if (s.visibility === 'hidden' || s.display === 'none' || e.closest('[data-allow-clip]')) return;
    if (e.tagName === 'BUTTON' && (r.width < 4 || r.height < 4)) { out.push('button has no size: ' + desc(e)); return; }
    if (!r.width || !r.height) return;
    if (!scrollParent(e) && (r.right > vw + 1 || r.left < -1)) out.push('outside window (x): ' + desc(e));
    if (!scrollParent(e) && r.bottom > vh + 1) out.push('outside window (y): ' + desc(e));
    if (/hidden|clip/.test(s.overflowX) && s.textOverflow !== 'ellipsis' && e.scrollWidth > e.clientWidth + 1 && (e.textContent || '').trim())
      out.push('text cut off: ' + desc(e));
  });
  return out.slice(0, 10);
}
async function assertLayout(page, label) {
  await page.waitForTimeout(300);
  const problems = await page.evaluate(layoutProblems);
  if (problems && problems.length > 0) throw new Error(`Layout problems in ${label}:\n  ` + problems.join('\n  '));
}
module.exports = { layoutProblems, assertLayout };
