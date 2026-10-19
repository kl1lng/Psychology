// Local, isolated browser verification. All external requests are blocked.
const { chromium } = require('../frontend/node_modules/playwright');
const fs = require('node:fs');
const path = require('node:path');
const output = path.resolve(__dirname, '../output/pdf');
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ acceptDownloads: true });
    const errors = [];
    const network = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('**/*', (route) => {
      const url = new URL(route.request().url());
      if (url.hostname === '127.0.0.1' && url.port === '3000') return route.continue();
      if (['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol)) network.push(url.origin);
      return route.abort();
    });
    await page.goto('http://127.0.0.1:3000/login');
    await page.getByRole('button', { name: 'Демо: посмотреть отчёты опросов' }).click();
    await page.getByRole('heading', { name: 'Мониторинг психологических методик' }).waitFor();
    await page.evaluate(() => {
      setInterval(() => {
        const root = document.querySelector('.pdf-report-root');
        if (!root) return;
        window.__reportSnapshot = Array.from(root.querySelectorAll('.report-page')).map((page) => ({
          numbers: page.classList.contains('answers-page') ? Array.from(page.querySelectorAll('tbody tr')).map((row) => Number(row.firstElementChild.textContent)) : [],
          headers: Array.from(page.querySelectorAll('th')).map((cell) => cell.textContent),
          overflow: page.querySelector('.report-content').lastElementChild.getBoundingClientRect().bottom > page.querySelector('footer').getBoundingClientRect().top - 10,
        }));
      }, 50);
    });
    for (const id of ['eysenck', 'phillips', 'klimov', 'luskanova']) {
      await page.getByRole('combobox').first().selectOption(id);
      const rows = page.locator('table').first().locator('tbody tr');
      if (await rows.count() !== 4) throw new Error(`Unexpected rows for ${id}`);
      for (let example = 0; example < 3; example++) {
        const individual = page.waitForEvent('download');
        await page.getByRole('button', { name: 'Индивидуальное заключение (PDF)', exact: true }).nth(example).click();
        const download = await individual;
        if (example === 0) await download.saveAs(path.join(output, `${id}-individual.pdf`));
        const snapshot = await page.evaluate(() => window.__reportSnapshot);
        const numbers = snapshot.flatMap((page) => page.numbers);
        const expected = { eysenck: 57, phillips: 58, klimov: 20, luskanova: 10 }[id];
        if (numbers.length !== expected || numbers.some((number, index) => number !== index + 1)) throw new Error(`Missing or duplicated answers for ${id}/${example}`);
        if (snapshot.some((page) => page.overflow || page.headers.some((header) => /Балл/.test(header)))) throw new Error(`Overflow or score column for ${id}/${example}`);
      }
      const summary = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Сводный протокол класса (PDF)' }).click();
      await (await summary).saveAs(path.join(output, `${id}-class.pdf`));
      console.log(`${id}: individual and class PDFs saved`);
    }
    // Stress only the detached export template; these generated rows never enter application state.
    await page.evaluate(() => {
      const body = document.querySelector('[style*="-9999px"] table tbody');
      const sample = body.firstElementChild.cloneNode(true);
      body.replaceChildren();
      for (let index = 0; index < 100; index++) {
        const row = sample.cloneNode(true);
        row.firstElementChild.textContent = String(index + 1);
        body.appendChild(row);
      }
    });
    const stress = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Сводный протокол класса (PDF)' }).click();
    const stressFile = await stress;
    const pdf = fs.readFileSync(await stressFile.path()).toString('latin1');
    const pageCount = (pdf.match(/\/Type \/Page\b/g) || []).length;
    if (pageCount < 3) throw new Error('100-row summary did not paginate');
    console.log(`100-row summary: ${pageCount} pages, no export failure.`);
    if (errors.length) throw new Error(errors.join('\n'));
    if (network.length) throw new Error(`Demo attempted external/API requests: ${network.join(', ')}`);
    console.log('No page errors; no API/external requests in demo.');
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
