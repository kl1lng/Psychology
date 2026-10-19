// Navigation check with an isolated browser and mocked API; no real account or DB.
const { chromium } = require('../frontend/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const user = { id: 'navigation-fixture', role: 'psychologist', full_name: 'Проверка переходов', email: '', points_balance: 0 };
    await context.addCookies([{ name: 'access_token', value: 'local-test-only', domain: '127.0.0.1', path: '/' }]);
    await context.addInitScript((profile) => localStorage.setItem('user', JSON.stringify(profile)), user);
    await context.route('**/*', (route) => {
      const url = new URL(route.request().url());
      const reply = (json) => route.fulfill({ json, headers: { 'access-control-allow-origin': 'http://127.0.0.1:3000', 'access-control-allow-credentials': 'true', 'access-control-allow-headers': 'Content-Type, Authorization', 'access-control-allow-methods': 'GET, POST, OPTIONS' } });
      if (route.request().method() === 'OPTIONS') return reply({});
      if (url.hostname === '127.0.0.1' && url.port === '3000') return route.continue();
      if (url.pathname.endsWith('/auth/me')) return reply(user);
      if (url.pathname.endsWith('/analytics/dashboard')) return reply({ total_students: 0, total_assessments: 0, waiting_dialogs: 0, critical_count: 0, high_count: 0, risk_distribution: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 } });
      if (url.pathname.includes('/rest/v1/')) return reply([]);
      if (url.pathname.endsWith('/chat/waiting') || url.pathname.endsWith('/class-comparison')) return reply([]);
      if (url.pathname.startsWith('/api/v1/')) return reply({ items: [] });
      return route.abort();
    });
    await context.routeWebSocket('**/*', (socket) => socket.close());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://127.0.0.1:3000/dashboard');
    await page.locator('main h1').waitFor();
    for (let round = 0; round < 2; round++) {
      for (const path of ['/archive', '/qa-moderation', '/chats', '/podcasts/upload', '/dashboard']) {
        const link = page.locator(`a[href="${path}"]`).first();
        await link.hover();
        const started = Date.now();
        await link.click();
        await page.waitForURL(`**${path}`);
        await page.locator('main h1').waitFor();
        console.log(`${round ? 'repeat' : 'first'} ${path}: ${Date.now() - started} ms`);
      }
    }
    if (errors.length) throw new Error(errors.join('\n'));
    console.log('All five local sections navigated without runtime errors; API responses were mocked.');
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
