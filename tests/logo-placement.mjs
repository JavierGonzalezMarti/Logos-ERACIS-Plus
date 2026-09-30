import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const appUrl = process.env.APP_URL || 'http://127.0.0.1:1420/';
const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const browser = await chromium.launch({ executablePath: chromePath, headless: true });
const page = await browser.newPage({ acceptDownloads: true, viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));

async function pixel(x, y) {
  return page.locator('#canvas').evaluate((canvas, point) =>
    Array.from(canvas.getContext('2d').getImageData(point.x, point.y, 1, 1).data).slice(0, 3), { x, y });
}

async function dimensions() {
  return page.locator('#canvas').evaluate((canvas) => [canvas.width, canvas.height]);
}

try {
  await page.goto(appUrl, { waitUntil: 'networkidle' });
  await page.evaluate(() => window.scrollTo(0, 800));
  assert.ok(await page.locator('#page-header-img').evaluate((header) => header.getBoundingClientRect().bottom < 0));

  const files = await page.evaluate(() => {
    const photo = document.createElement('canvas');
    photo.width = 200; photo.height = 100;
    const photoContext = photo.getContext('2d');
    photoContext.fillStyle = '#00ff00'; photoContext.fillRect(0, 0, 200, 100);
    photoContext.fillStyle = '#ff0000'; photoContext.fillRect(0, 0, 48, 100);
    const logo = document.createElement('canvas');
    logo.width = 200; logo.height = 20;
    const logoContext = logo.getContext('2d');
    logoContext.fillStyle = '#0000ff'; logoContext.fillRect(0, 0, 200, 20);
    return { photo: photo.toDataURL('image/png').split(',')[1], logo: logo.toDataURL('image/png').split(',')[1] };
  });
  await page.setInputFiles('#base-input', { name: 'photo.png', mimeType: 'image/png', buffer: Buffer.from(files.photo, 'base64') });
  await page.setInputFiles('#logo-input', { name: 'logo.png', mimeType: 'image/png', buffer: Buffer.from(files.logo, 'base64') });
  await page.waitForSelector('#logo-remove-btn');
  await page.click('#format-square');
  assert.equal(await page.locator('#logo-inside').getAttribute('aria-checked'), 'true');
  assert.deepEqual(await dimensions(), [1080, 1080]);
  assert.deepEqual(await pixel(10, 500), [0, 255, 0]);
  assert.deepEqual(await pixel(10, 1050), [0, 0, 255]);

  await page.click('#logo-outside');
  assert.equal(await page.locator('#logo-outside').getAttribute('aria-checked'), 'true');
  assert.deepEqual(await dimensions(), [1080, 1080]);
  assert.deepEqual(await pixel(10, 500), [255, 0, 0]);
  assert.deepEqual(await pixel(10, 1050), [0, 0, 255]);

  await page.click('#pos-top');
  assert.deepEqual(await pixel(10, 10), [0, 0, 255]);
  assert.deepEqual(await pixel(10, 500), [255, 0, 0]);
  await page.click('#pos-bottom');

  await page.click('#format-facebook-vertical');
  assert.deepEqual(await dimensions(), [1080, 1350]);
  await page.click('#fit-stretch');
  assert.deepEqual(await pixel(10, 500), [255, 0, 0]);
  await page.click('#fit-crop');
  assert.deepEqual(await pixel(10, 500), [0, 255, 0]);
  await page.click('#logo-inside');
  assert.deepEqual(await dimensions(), [1080, 1350]);
  await page.click('#logo-outside');
  await page.click('#pos-top');
  assert.deepEqual(await pixel(10, 10), [0, 0, 255]);
  await page.click('#pos-bottom');

  await page.click('#btn-crop-toggle');
  const beforeCrop = await page.locator('#canvas').evaluate((canvas) => canvas.toDataURL());
  const bounds = await page.locator('#canvas').boundingBox();
  assert.ok(bounds);
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * 0.8, bounds.y + bounds.height / 2, { steps: 6 });
  await page.mouse.up();
  const afterCrop = await page.locator('#canvas').evaluate((canvas) => canvas.toDataURL());
  assert.notEqual(afterCrop, beforeCrop);
  await page.click('#btn-crop-ok');

  const beforeDate = await page.locator('#canvas').evaluate((canvas) => canvas.toDataURL());
  await page.click('#ts-yes');
  await page.click('#ts-pos-br');
  assert.notEqual(await page.locator('#canvas').evaluate((canvas) => canvas.toDataURL()), beforeDate);
  await page.click('#ts-no');

  await page.click('#format-original');
  assert.deepEqual(await dimensions(), [200, 120]);
  assert.deepEqual(await pixel(100, 95), [0, 255, 0]);
  assert.deepEqual(await pixel(100, 110), [0, 0, 255]);
  await page.click('#pos-top');
  assert.deepEqual(await dimensions(), [200, 120]);
  assert.deepEqual(await pixel(100, 10), [0, 0, 255]);
  assert.deepEqual(await pixel(100, 30), [0, 255, 0]);
  await page.click('#logo-inside');
  assert.deepEqual(await dimensions(), [200, 100]);
  assert.deepEqual(await pixel(100, 10), [0, 0, 255]);

  await page.click('#logo-outside');
  await page.click('#pos-bottom');
  await page.click('#out-png');
  const downloadPromise = page.waitForEvent('download');
  await page.click('#download-btn');
  const download = await downloadPromise;
  const bytes = await readFile(await download.path());
  assert.deepEqual([bytes.readUInt32BE(16), bytes.readUInt32BE(20)], [200, 120]);
  assert.deepEqual(errors, []);
  console.log('Faldón dentro/fuera, posiciones, reencuadre, PNG y cabecera desplazable verificados.');
} finally {
  await browser.close();
}
