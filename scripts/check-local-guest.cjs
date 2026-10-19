// Exercises anonymous login and a complete questionnaire without a backend or external requests.
const { chromium } = require('../frontend/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const context = await browser.newContext();
    await context.route('**/*', (route) => {
      const url = new URL(route.request().url());
      if (url.hostname !== '127.0.0.1' || url.port !== '3000') return route.abort();
      return url.pathname.startsWith('/api/v1/') ? route.abort() : route.continue();
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto('http://127.0.0.1:3000/login');
    await page.getByRole('button', { name: 'Войти анонимно' }).click();
    await page.waitForURL('**/tests');
    await page.getByText(/Локальный режим: тесты и результаты сохраняются только в этом браузере/).waitFor();
    await page.getByRole('link', { name: /Опросник Айзенка/ }).click();
    await page.getByText('Вопрос 1 из 57').waitFor();

    for (let index = 0; index < 57; index++) {
      await page.locator('div.animate-slide-up button').first().click();
      if (index < 56) await page.getByRole('button', { name: 'Далее' }).click();
    }
    await page.getByRole('button', { name: 'Завершить тест' }).click();
    await page.getByRole('heading', { name: 'Тестирование успешно завершено!' }).waitFor();

    const saved = await page.evaluate(() => ({
      user: JSON.parse(localStorage.getItem('user') || 'null'),
      mode: localStorage.getItem('demo_mode'),
      results: JSON.parse(localStorage.getItem('aisezim_local_assessment_results') || '[]'),
    }));
    if (saved.user?.id !== 'local-demo-guest' || saved.mode !== 'student') throw new Error('Local guest session was not stored');
    if (saved.results.length !== 1 || saved.results[0].question_responses.length !== 57) throw new Error('Completed result was not stored locally');
    if (errors.length) throw new Error(errors.join('\n'));
    console.log('Anonymous local login, 57-question survey, scoring, and browser-only result storage passed with API blocked.');
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
