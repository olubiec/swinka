'use strict';
const { chromium } = require('playwright');
const { assertLayout } = require('./layout');

(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 420, height: 640 } });
  let hasErrors = false;

  const testLayout = async (name, html, expectFail, expectedMessagePart = '') => {
    try {
      // In web-smoke, the body doesn't cause page scroll.
      // But in our clean page, any 500px wide div makes documentElement.scrollWidth > 420.
      await page.setContent(`<!DOCTYPE html><html><head><style>
        body { margin: 0; padding: 0; overflow-x: hidden; }
        /* to allow horizontal scroll test to work, we need something that overcomes overflow-x: hidden on body */
      </style></head><body>${html}</body></html>`);
      await assertLayout(page, name);
      if (expectFail) {
        console.error(`FAIL: ${name} should have failed but passed`);
        hasErrors = true;
      } else {
        console.log(`PASS: ${name}`);
      }
    } catch (e) {
      if (!expectFail) {
        console.error(`FAIL: ${name} should have passed but failed: ${e.message}`);
        hasErrors = true;
      } else {
        if (expectedMessagePart && !e.message.includes(expectedMessagePart)) {
          console.error(`FAIL: ${name} failed with wrong message. Expected to contain "${expectedMessagePart}", got: ${e.message}`);
          hasErrors = true;
        } else {
          console.log(`PASS: ${name} (failed as expected)`);
        }
      }
    }
  };

  await testLayout('clean page', '<div>clean</div>', false);

  await testLayout('text wider than window', `
    <div style="position: absolute; left: 400px; width: 100px;">outside x</div>
  `, true, 'outside window (x)');

  await testLayout('clipped label with overflow:hidden', `
    <div style="width: 50px; overflow: hidden; white-space: nowrap;">this is a very long text that gets clipped</div>
  `, true, 'text cut off');

  await testLayout('zero-size button', `
    <button style="width: 0; height: 0; border: none; padding: 0;">x</button>
  `, true, 'button has no size');

  await testLayout('horizontal page scroll', `
    <div style="width: 500px; height: 100px; position: absolute;">wide content</div>
  `, true, 'page scrolls horizontally'); // Wait, absolute positioning might not affect scrollWidth, let's see. Or maybe it does.

  await testLayout('exempt fixture', `
    <div data-allow-clip style="position: absolute;">
      <div style="position: absolute; left: 400px; width: 100px;">outside x but allowed</div>
      <button style="width: 0; height: 0;">exempt btn</button>
      <div style="width: 50px; overflow: hidden; white-space: nowrap;">this is a very long text that gets clipped but allowed</div>
    </div>
  `, false);

  await browser.close();

  if (hasErrors) {
    console.error('LAYOUT SELFTEST FAILED');
    process.exit(1);
  } else {
    console.log('LAYOUT SELFTEST OK');
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
