import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log('Launching browser...');
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1, // 1200x630 is exact OG size
  });
  
  const page = await context.newPage();
  
  // Wait for dark mode explicitly if the site defaults to it
  await page.emulateMedia({ colorScheme: 'dark' });
  
  const targetUrl = 'https://rosetta-alpha.vercel.app';
  console.log(`Navigating to ${targetUrl}...`);
  await page.goto(targetUrl, { waitUntil: 'networkidle' });
  
  console.log('Waiting for animations and data to load (5s)...');
  await page.waitForTimeout(5000);
  
  const ogPath = path.join(__dirname, '../src/app/opengraph-image.png');
  const twPath = path.join(__dirname, '../src/app/twitter-image.png');
  
  console.log(`Saving screenshots to ${ogPath}...`);
  await page.screenshot({ path: ogPath });
  
  console.log(`Saving screenshots to ${twPath}...`);
  await page.screenshot({ path: twPath });
  
  console.log('Done! Verifying files...');
  if (fs.existsSync(ogPath)) {
    console.log(`Success! File size: ${fs.statSync(ogPath).size} bytes`);
  } else {
    console.log('Failed to create file!');
  }
  
  await browser.close();
}

main().catch(console.error);
