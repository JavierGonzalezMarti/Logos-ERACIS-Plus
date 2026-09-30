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
  assert.ok(await page.locator('#page-header-img').evaluate((image) => image.getBoundingClientRect().bottom < 0));
  await page.setInputFiles('#base-input', banner);
  await page.waitForFunction(() => !document.querySelector('#download-btn')?.disabled);

  const dimensions = [
    ['horizontal', 1920, 1080], ['square', 1080, 1080],
    ['vertical', 1080, 1920], ['4by3', 1440, 1080],
    ['instagram', 1080, 1350], ['facebook', 1200, 630], ['facebook-vertical', 1080, 1350],
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
  await page.setInputFiles('#logo-input', banner);
  await page.waitForSelector('#logo-remove-btn');
  for (const format of ['square', 'horizontal', 'vertical', 'original']) {
    await page.click(`#format-${format}`);
    for (const placement of ['inside', 'outside']) {
      await page.click(`#logo-${placement}`);
      const preview = await page.locator('#canvas').evaluate((canvas) => ({
        width: canvas.width, height: canvas.height, pixels: canvas.toDataURL(),
      }));
      await page.click('#mark-add');
      await page.waitForSelector('.mark-dialog[open]');
      const editor = await page.evaluate(() => {
        const canvas = document.querySelector('.mark-background');
        const stage = document.querySelector('.mark-stage');
        const container = document.querySelector('.mark-stage-container');
        const canvasRect = canvas.getBoundingClientRect();
        const stageRect = stage.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        return {
          width: canvas.width, height: canvas.height, pixels: canvas.toDataURL(),
          canvasWidth: canvasRect.width, canvasHeight: canvasRect.height,
          stageWidth: stageRect.width, stageHeight: stageRect.height,
          withinContainer: stageRect.left >= containerRect.left && stageRect.right <= containerRect.right
            && stageRect.top >= containerRect.top && stageRect.bottom <= containerRect.bottom,
        };
      });
      assert.deepEqual([editor.width, editor.height], [preview.width, preview.height]);
      assert.equal(editor.pixels, preview.pixels, `${format}/${placement}: composición distinta`);
      assert.ok(Math.abs(editor.canvasWidth - editor.stageWidth) < 1, `${format}/${placement}: ancho del lienzo`);
      assert.ok(Math.abs(editor.canvasHeight - editor.stageHeight) < 1, `${format}/${placement}: alto del lienzo`);
      assert.ok(Math.abs(editor.canvasWidth / editor.canvasHeight - preview.width / preview.height) < 0.001,
        `${format}/${placement}: proporción alterada`);
      assert.equal(editor.withinContainer, true, `${format}/${placement}: lienzo fuera de la ventana`);
      await page.locator('.mark-cancel').click();
    }
  }
  await page.click('#format-square');
  await page.click('#logo-outside');
  await page.click('#pos-top');
  await page.click('#mark-add');
  await page.locator('.mark-variant[data-variant="horizontal"]').click();
  await page.locator('.mark-background-options [data-background="circle"]').click();
  assert.equal(await page.locator('.mark-white-shape').evaluate((node) => getComputedStyle(node).borderRadius), '50%');
  const photoBounds = await page.evaluate(() => {
    const stage = document.querySelector('.mark-stage').getBoundingClientRect();
    const canvas = document.querySelector('.mark-background');
    const logo = document.querySelector('#logo-drop .thumbnail');
    const logoHeight = Math.min(Math.round(canvas.width * logo.naturalHeight / logo.naturalWidth),
      Math.floor(canvas.height / 2));
    return { left: stage.left, right: stage.right,
      top: stage.top + logoHeight * stage.height / canvas.height, bottom: stage.bottom };
  });
  for (const [x, y] of [[-100, -100], [1540, 1000]]) {
    const box = await page.locator('.mark-box').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(x, y);
    await page.mouse.up();
    const moved = await page.locator('.mark-box').boundingBox();
    assert.ok(moved.x >= photoBounds.left - 2 && moved.x + moved.width <= photoBounds.right + 2);
    assert.ok(moved.y >= photoBounds.top - 2 && moved.y + moved.height <= photoBounds.bottom + 2);
  }
  await page.locator('.mark-cancel').click();
  await page.click('#pos-bottom');
  await page.click('#logo-inside');
  await page.click('#format-facebook-vertical');

  assert.equal(await page.locator('#mark-add').isEnabled(), true);
  await page.click('#mark-add');
  await page.waitForSelector('.mark-dialog[open]');
  assert.equal(await page.locator('.mark-variant').count(), 8);
  assert.equal(await page.locator('.mark-accept').isDisabled(), true);
  assert.equal(await page.locator('.mark-background-options [data-background="rectangle"]').isDisabled(), true);
  await page.locator('.mark-variant[data-variant="horizontal"]').click();
  assert.equal(await page.locator('.mark-background-options [data-background="none"]').getAttribute('aria-pressed'), 'true');
  await page.locator('.mark-background-options [data-background="rectangle"]').click();
  const backgroundSize = await page.evaluate(() => {
    const logo = document.querySelector('.mark-box').getBoundingClientRect();
    const white = document.querySelector('.mark-white-shape').getBoundingClientRect();
    return [white.width / logo.width, white.height / logo.height];
  });
  assert.ok(backgroundSize.every((ratio) => Math.abs(ratio - 1.2) < 0.02));
  const originalBox = await page.locator('.mark-box').boundingBox();
  assert.ok(originalBox?.width > 0);
  await page.mouse.move(originalBox.x + originalBox.width / 2, originalBox.y + originalBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(originalBox.x + originalBox.width / 2 + 35, originalBox.y + originalBox.height / 2 + 20);
  await page.mouse.up();
  const movedBox = await page.locator('.mark-box').boundingBox();
  assert.ok(movedBox.x > originalBox.x);
  await page.locator('.mark-variant[data-variant="vertical"]').click();
  assert.equal(await page.locator('.mark-background-options [data-background="rectangle"]').getAttribute('aria-pressed'), 'true');
  const changedBox = await page.locator('.mark-box').boundingBox();
  assert.ok(Math.abs(changedBox.width - movedBox.width) < 2);
  assert.ok(Math.abs(changedBox.x + changedBox.width / 2 - movedBox.x - movedBox.width / 2) < 2);
  const handle = await page.locator('.mark-handle.se').boundingBox();
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(handle.x + handle.width / 2 + 20, handle.y + handle.height / 2 + 30);
  await page.mouse.up();
  assert.ok((await page.locator('.mark-box').boundingBox()).width > changedBox.width);
  await page.screenshot({ path: resolve(outputDir, 'mark-editor.png') });
  await page.locator('.mark-cancel').click();
  assert.equal(await page.locator('#mark-add').isVisible(), true);
  await page.click('#mark-add');
  await page.locator('.mark-variant[data-variant="horizontal"]').click();
  await page.locator('.mark-background-options [data-background="rectangle"]').click();
  const beforeMark = await page.locator('#canvas').evaluate((canvas) => canvas.toDataURL());
  await page.locator('.mark-accept').click();
  assert.equal(await page.locator('#mark-edit').isVisible(), true);
  assert.notEqual(await page.locator('#canvas').evaluate((canvas) => canvas.toDataURL()), beforeMark);
  await page.click('#mark-edit');
  await page.locator('.mark-variant[data-variant="vertical-lema"]').click();
  await page.locator('.mark-background-options [data-background="circle"]').click();
  await page.locator('.mark-cancel').click();
  assert.equal(await page.locator('#mark-edit').isVisible(), true);
  await page.click('#mark-edit');
  assert.equal(await page.locator('.mark-background-options [data-background="rectangle"]').getAttribute('aria-pressed'), 'true');
  await page.locator('.mark-cancel').click();

  const png = await exportFile('png', 'single.png');
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  assert.equal(png.readUInt32BE(16), 1080);
  assert.equal(png.readUInt32BE(20), 1350);
  const jpg = await exportFile('jpg', 'single.jpg');
  assert.equal(jpg.subarray(0, 2).toString('hex'), 'ffd8');
  assert.deepEqual(await page.evaluate(async (base64) => {
    const image = new Image();
    image.src = `data:image/jpeg;base64,${base64}`;
    await image.decode();
    return [image.naturalWidth, image.naturalHeight];
  }, jpg.toString('base64')), [1080, 1350]);
  const pdfBytes = await exportFile('pdf', 'single.pdf');
  assert.equal(pdfBytes.subarray(0, 4).toString(), '%PDF');
  const rectanglePreview = await page.locator('#canvas').evaluate((canvas) => canvas.toDataURL());
  await page.click('#mark-edit');
  await page.locator('.mark-background-options [data-background="circle"]').click();
  await page.locator('.mark-accept').click();
  assert.notEqual(await page.locator('#canvas').evaluate((canvas) => canvas.toDataURL()), rectanglePreview);
  const circlePng = await exportFile('png', 'circle.png');
  assert.notDeepEqual(circlePng, png);
  await page.click('#mark-remove');
  assert.equal(await page.locator('#mark-add').isVisible(), true);
  assert.equal(await page.locator('#canvas').evaluate((canvas) => canvas.toDataURL()), beforeMark);

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
  await page.click('#format-facebook-vertical');
  await page.click('#mark-add');
  await page.locator('.mark-variant[data-variant="horizontal-denominacion"]').click();
  await page.locator('.mark-background-options [data-background="circle"]').click();
  await page.locator('.mark-accept').click();
  const zipBytes = await exportFile('png', 'batch.zip');
  const zip = await JSZip.loadAsync(zipBytes);
  const entries = Object.values(zip.files).filter((entry) => !entry.dir);
  assert.equal(entries.length, 3);
  for (const entry of entries) {
    assert.ok(entry.name.endsWith('.png'));
    const image = await entry.async('uint8array');
    assert.ok(image.length > 100);
    assert.deepEqual([Buffer.from(image).readUInt32BE(16), Buffer.from(image).readUInt32BE(20)], [1080, 1350]);
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
  console.log(`Flujo verificado: cabecera, ocho formatos, Marca ERACIS+, PNG/JPG/PDF, lote ZIP, límite 50 y PDF${heicAvailable ? ', HEIC' : ''}${privateJpeg ? ', EXIF de iPhone' : ''}.`);
} finally {
  await browser.close();
}
