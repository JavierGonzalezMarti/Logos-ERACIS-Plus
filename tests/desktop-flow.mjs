import assert from 'node:assert/strict';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';
import JSZip from 'jszip';
import exifr from 'exifr';
import { jsPDF } from 'jspdf';

const root = resolve(import.meta.dirname, '..');
const outputDir = resolve(root, 'tests/output');
const banner = resolve(root, 'src/assets/equa-baner-digital.png');
const pdf = resolve(outputDir, 'two-pages.pdf');
const heic = resolve(root, 'tests/fixtures/public-sample.heic');
const appUrl = process.env.APP_URL || 'http://127.0.0.1:1420/';
const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
await mkdir(outputDir, { recursive: true });
const inputPdf = new jsPDF();
inputPdf.text('Pagina uno', 25, 25);
inputPdf.addPage();
inputPdf.text('Pagina dos', 25, 25);
await writeFile(pdf, new Uint8Array(inputPdf.output('arraybuffer')));

const browser = await chromium.launch({ executablePath: chromePath, headless: true });
const page = await browser.newPage({ acceptDownloads: true, viewport: { width: 1440, height: 900 } });
const errors = [];
const externalRequests = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('request', (request) => {
  if (/^https?:/.test(request.url())
    && !request.url().startsWith(appUrl)
    && !new URL(request.url()).hostname.endsWith('.kaspersky-labs.com')) {
    externalRequests.push(request.url());
  }
});

async function exportFile(format, name) {
  await page.click(`#out-${format}`);
  const downloadPromise = page.waitForEvent('download');
  await page.click('#download-btn');
  const download = await downloadPromise;
  const path = resolve(outputDir, name);
  await download.saveAs(path);
  const bytes = await readFile(path);
  assert.ok(bytes.length > 100, `${format}: archivo vacío`);
  return bytes;
}

try {
  await page.goto(appUrl, { waitUntil: 'networkidle' });
  assert.equal(await page.locator('#page-header-img').evaluate((image) => image.naturalWidth > 0), true);
  await page.evaluate(() => window.scrollTo(0, 1000));
  assert.equal(await page.locator('#page-header-img').evaluate((image) => Math.round(image.getBoundingClientRect().top)), 0);
  await page.setInputFiles('#base-input', banner);
  await page.waitForFunction(() => !document.querySelector('#download-btn')?.disabled);

  const dimensions = [
    ['horizontal', 1920, 1080], ['square', 1080, 1080],
    ['vertical', 1080, 1920], ['4by3', 1440, 1080],
  ];
  for (const [format, width, height] of dimensions) {
    await page.click(`#format-${format}`);
    assert.deepEqual(await page.locator('#canvas').evaluate((canvas) => [canvas.width, canvas.height]), [width, height]);
  }
  await page.click('#format-original');
  const originalPng = await readFile(banner);
  assert.deepEqual(
    await page.locator('#canvas').evaluate((canvas) => [canvas.width, canvas.height]),
    [originalPng.readUInt32BE(16), originalPng.readUInt32BE(20)],
  );
  await page.click('#format-4by3');

  const png = await exportFile('png', 'single.png');
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  assert.equal(png.readUInt32BE(16), 1440);
  assert.equal(png.readUInt32BE(20), 1080);
  const jpg = await exportFile('jpg', 'single.jpg');
  assert.equal(jpg.subarray(0, 2).toString('hex'), 'ffd8');
  const pdfBytes = await exportFile('pdf', 'single.pdf');
  assert.equal(pdfBytes.subarray(0, 4).toString(), '%PDF');

  await page.setInputFiles('#logo-input', banner);
  await page.waitForSelector('#logo-remove-btn');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('#logo-remove-btn');
  await page.click('#logo-remove-btn');
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await page.locator('#logo-remove-btn').count(), 0);

  await page.setInputFiles('#base-input', pdf);
  await page.waitForFunction(() => document.querySelector('#base-drop')?.getAttribute('aria-label')?.includes('página 1 de 2'));
  await page.setInputFiles('#batch-input', [pdf, banner]);
  await page.waitForFunction(() => document.querySelector('#imagenes-cargadas')?.textContent?.includes('3 elementos'));
  const zipBytes = await exportFile('png', 'batch.zip');
  const zip = await JSZip.loadAsync(zipBytes);
  const entries = Object.values(zip.files).filter((entry) => !entry.dir);
  assert.equal(entries.length, 3);
  for (const entry of entries) {
    assert.ok(entry.name.endsWith('.png'));
    assert.ok((await entry.async('uint8array')).length > 100);
  }

  await page.setInputFiles('#batch-input', Array.from({ length: 51 }, () => banner));
  await page.waitForFunction(() => document.querySelector('#imagenes-cargadas')?.textContent?.includes('51 elementos'));
  assert.equal(await page.locator('#download-btn').isDisabled(), true);

  const heicAvailable = await stat(heic).then(() => true, () => false);
  if (heicAvailable) {
    await page.reload({ waitUntil: 'networkidle' });
    await page.setInputFiles('#base-input', heic);
    await page.waitForFunction(() => document.querySelector('#app-status')?.textContent?.includes('public-sample.heic cargado.'));
    assert.equal(await page.locator('#download-btn').isEnabled(), true);
  }

  const privateDir = resolve(root, 'tests/private-fixtures');
  const privateJpeg = (await readdir(privateDir).catch(() => [])).find((name) => /\.jpe?g$/i.test(name));
  if (privateJpeg) {
    const photo = resolve(privateDir, privateJpeg);
    const metadata = await exifr.parse(await readFile(photo));
    assert.ok(metadata?.DateTimeOriginal instanceof Date);
    await page.reload({ waitUntil: 'networkidle' });
    await page.click('#format-original');
    await page.setInputFiles('#base-input', photo);
    await page.waitForFunction(() => !document.querySelector('#download-btn')?.disabled);
    if (metadata.Orientation === 'Rotate 90 CW' && metadata.ExifImageWidth && metadata.ExifImageHeight) {
      assert.deepEqual(
        await page.locator('#canvas').evaluate((canvas) => [canvas.width, canvas.height]),
        [metadata.ExifImageHeight, metadata.ExifImageWidth],
      );
    }
    const expectedDate = `${String(metadata.DateTimeOriginal.getDate()).padStart(2, '0')}-${String(metadata.DateTimeOriginal.getMonth() + 1).padStart(2, '0')}-${String(metadata.DateTimeOriginal.getFullYear()).slice(-2)}`;
    const downloadPromise = page.waitForEvent('download');
    await page.click('#download-btn');
    const download = await downloadPromise;
    assert.equal(download.suggestedFilename(), `${expectedDate}.png`);
    await download.saveAs(resolve(outputDir, 'iphone-photo.png'));
  }

  assert.deepEqual(errors, []);
  assert.deepEqual(externalRequests, []);
  console.log(`Flujo verificado: cabecera fija, cinco formatos, PNG/JPG/PDF, lote ZIP, límite 50 y PDF${heicAvailable ? ', HEIC' : ''}${privateJpeg ? ', EXIF de iPhone' : ''}.`);
} finally {
  await browser.close();
}
