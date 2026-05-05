const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => {
    try {
      console.log('CONSOLE[' + msg.type() + ']:', msg.text());
    } catch (e) {
      console.log('CONSOLE[error]:', String(msg));
    }
  });

  page.on('pageerror', err => console.log('PAGE_ERROR:', err && err.message ? err.message : String(err)));

  page.on('response', async response => {
    try {
      const url = response.url();
      if (url.includes('/create-checkout-session')) {
        let body = '';
        try { body = await response.text(); } catch (e) { body = '<unable to read body>'; }
        console.log('NETWORK_RESPONSE_URL:', url);
        console.log('NETWORK_RESPONSE_STATUS:', response.status());
        console.log('NETWORK_RESPONSE_BODY:', body);
      }
    } catch (e) {
      console.error('response-handler-error', e);
    }
  });

  const base = process.env.URL || 'http://localhost:3000';
  console.log('Opening', base);
  await page.goto(base, { waitUntil: 'networkidle' });

  // Try common selectors for the Start trial button
  const selectors = [
    'text="Start trial"',
    'text=Start trial',
    'button:has-text("Start trial")',
    'a:has-text("Start trial")',
    'button[aria-label="Start trial"]'
  ];

  let clicked = false;
  for (const sel of selectors) {
    try {
      const el = await page.$(sel);
      if (el) {
        await el.scrollIntoViewIfNeeded();
        await el.click({ force: true });
        console.log('CLICKED_SELECTOR:', sel);
        clicked = true;
        break;
      }
    } catch (e) {
      // ignore and try next
    }
  }

  if (!clicked) {
    // fallback: click first visible button
    const btn = await page.$('button');
    if (btn) {
      try {
        await btn.click({ force: true });
        console.log('CLICKED_SELECTOR: fallback button');
        clicked = true;
      } catch (e) {
        console.log('FALLBACK_CLICK_FAILED', String(e));
      }
    }
  }

  try {
    const res = await page.waitForResponse(r => r.url().includes('/create-checkout-session'), { timeout: 8000 });
    const text = await res.text();
    console.log('FINAL_NETWORK_RESPONSE_TEXT:', text);
  } catch (e) {
    console.log('NO_CREATE_CHECKOUT_RESPONSE:', String(e));
  }

  await browser.close();
  process.exit(0);
})();
