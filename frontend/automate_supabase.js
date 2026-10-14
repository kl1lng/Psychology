const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function run() {
  console.log('🚀 Starting visible Playwright browser with video recording...');

  const recordingsDir = path.join(__dirname, 'recordings');
  if (!fs.existsSync(recordingsDir)) {
    fs.mkdirSync(recordingsDir, { recursive: true });
  }

  // Launch visible Chromium browser window on user's desktop
  const browser = await chromium.launch({
    headless: false,
    slowMo: 500,
  });

  const context = await browser.newContext({
    recordVideo: { dir: recordingsDir, size: { width: 1280, height: 800 } },
    viewport: { width: 1280, height: 800 },
  });

  const page = await context.newPage();

  console.log('🌐 Navigating to https://supabase.com/dashboard...');
  await page.goto('https://supabase.com/dashboard', { waitUntil: 'domcontentloaded' });

  console.log('⌛ Waiting for dashboard or login screen...');
  await page.waitForTimeout(3000);

  // Check if on login page
  const currentUrl = page.url();
  if (currentUrl.includes('login') || currentUrl.includes('sign-in')) {
    console.log('🔒 Please sign in to Supabase in the opened browser window.');
    console.log('Waiting up to 120 seconds for user to sign in...');
    await page.waitForURL('**/dashboard/**', { timeout: 120000 }).catch(() => {});
  }

  console.log('✨ On Dashboard page!');
  await page.waitForTimeout(2000);

  // Read SQL migration file
  const sqlPath = path.join(__dirname, '..', 'backend', 'migrations', 'init.sql');
  let sqlContent = '';
  if (fs.existsSync(sqlPath)) {
    sqlContent = fs.readFileSync(sqlPath, 'utf8');
  }

  console.log('📋 SQL migration file loaded.');

  // Keep browser open for user interaction and automation
  console.log('🎥 Video recording is active in folder: ', recordingsDir);
  console.log('Press Ctrl+C in terminal when finished.');

  // Keep process alive for 5 minutes so user can complete or watch
  await new Promise((resolve) => setTimeout(resolve, 300000));

  await context.close();
  await browser.close();
}

run().catch((err) => {
  console.error('Error in automation script:', err);
});
