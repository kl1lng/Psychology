// Verifies development-only local registration for the three public signup roles.
const { chromium } = require('../frontend/node_modules/playwright');

const profiles = [
  { role: 'Психолог', id: 'local-demo-psychologist', userRole: 'psychologist', destination: '**/dashboard' },
  { role: 'Ученик', id: 'local-demo-student', userRole: 'student', destination: '**/tests' },
  { role: 'Учитель', id: 'local-demo-teacher', userRole: 'teacher', destination: '**/teacher/dashboard' },
];

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const profile of profiles) {
      const context = await browser.newContext();
      await context.route('**/*', (route) => {
        const url = new URL(route.request().url());
        if (url.hostname !== '127.0.0.1' || url.port !== '3000') return route.abort();
        return url.pathname.startsWith('/api/v1/') ? route.abort() : route.continue();
      });
      const page = await context.newPage();
      await page.goto('http://127.0.0.1:3000/register');
      await page.getByText(profile.role, { exact: true }).click();
      await page.locator('input').nth(0).fill('Локальный тестовый профиль');
      await page.locator('input').nth(1).fill(`${profile.userRole}@localhost.test`);
      await page.locator('input').nth(2).fill('local-only-password');
      if (profile.userRole === 'teacher') await page.locator('input').nth(3).fill('MIPH2026');
      await page.getByRole('button', { name: 'Зарегистрироваться' }).click();
      await page.waitForURL(profile.destination);
      const user = await page.evaluate(() => JSON.parse(localStorage.getItem('user') || 'null'));
      if (user?.id !== profile.id || user?.role !== profile.userRole) throw new Error(`Wrong local profile for ${profile.userRole}`);
      if (JSON.stringify(user).includes('local-only-password')) throw new Error('Password was stored in local profile');
      await context.close();
      console.log(`Local ${profile.userRole} registration passed; password was not stored.`);
    }
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
