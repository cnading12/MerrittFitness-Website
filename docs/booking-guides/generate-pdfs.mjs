// Renders the booking-guide HTML files to PDF using headless Chromium
// (Playwright). These are the guides sent to guests who book directly
// (i.e. not through the website and not through Peerspace/Giggster).
//
// Usage:  node docs/booking-guides/generate-pdfs.mjs
//
// Requires Playwright + a Chromium build. On the Claude Code web environment
// Chromium is pre-installed at $PLAYWRIGHT_BROWSERS_PATH; locally you may need
// `npx playwright install chromium`.

import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

const docs = [
  { html: 'onboarding-guide.html', pdf: 'Merritt-Wellness-Onboarding-Guide.pdf' },
  { html: 'marketing-guide.html', pdf: 'Merritt-Wellness-Public-Event-Marketing-Guide.pdf' },
];

const browser = await chromium.launch();
try {
  for (const { html, pdf } of docs) {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(join(here, html)).href, { waitUntil: 'networkidle' });
    await page.pdf({
      path: join(here, pdf),
      format: 'Letter',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });
    await page.close();
    console.log('Wrote', pdf);
  }
} finally {
  await browser.close();
}
