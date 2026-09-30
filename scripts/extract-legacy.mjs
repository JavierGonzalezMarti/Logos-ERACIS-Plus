import { readFileSync, writeFileSync } from 'node:fs';

const source = readFileSync(new URL('../reference/Faldón ERACIS V82.html', import.meta.url), 'utf8');
const css = source.match(/<style>([\s\S]*?)<\/style>/i)?.[1];
const body = source.match(/<body>([\s\S]*?)<\/body>/i)?.[1];
if (!css || !body) throw new Error('No se encontraron el estilo o el cuerpo del HTML original.');

const cleanBody = body
  .replace('<div class="batch-input-group">', '<div class="batch-input-group" id="batch-input-group">')
  .replace('<button id="ts-yes" type="button" class="timestamp-button active-button btn-hover"', '<button id="ts-yes" type="button" class="timestamp-button btn-hover"')
  .replace('<button id="ts-no" type="button" class="timestamp-button btn-hover"', '<button id="ts-no" type="button" class="timestamp-button active-button btn-hover"')
  .replace(
    /([ \t]*<button id="pos-top"[^>]*>[\s\S]*?<\/button>\r?\n[ \t]*<\/div>)/,
    '$1\n        <div class="logo-placement-buttons-group" role="radiogroup" aria-label="Ubicación del faldón respecto a la imagen">\n' +
    '          <button id="logo-inside" type="button" role="radio" aria-checked="true"\n' +
    '            class="logo-placement-button active-button btn-hover">Dentro de la imagen</button>\n' +
    '          <button id="logo-outside" type="button" role="radio" aria-checked="false"\n' +
    '            class="logo-placement-button btn-hover">Fuera de la imagen</button>\n' +
    '        </div>',
  )
  .replace(
    /([ \t]*<\/div>)(\r?\n[ \t]*<\/section>\r?\n\r?\n[ \t]*<!-- Bloque con el lienzo que muestra la previsualización en tiempo real\. -->)/,
    '$1\n        <div class="eracis-mark-section">\n' +
    '          <h3 class="section-title">Marca ERACIS+</h3>\n' +
    '          <div class="eracis-mark-buttons">\n' +
    '            <button id="mark-add" type="button" class="load-btn">Añadir Marca ERACIS+</button>\n' +
    '            <button id="mark-edit" type="button" class="load-btn" hidden>Editar</button>\n' +
    '            <button id="mark-remove" type="button" class="load-btn" hidden>Quitar marca ERACIS+</button>\n' +
    '          </div>\n        </div>$2',
  )
  .replace(
    '          <button id="format-original" type="button" data-format-mode="original"',
    '          <button id="format-instagram" type="button" data-width="1080" data-height="1350"\n' +
    '            class="format-button btn-hover" aria-label="Instagram 4:5, 1080 por 1350 píxeles">Instagram 4:5</button>\n' +
    '          <button id="format-facebook" type="button" data-width="1200" data-height="630"\n' +
    '            class="format-button btn-hover" aria-label="Facebook horizontal, 1200 por 630 píxeles">Facebook horizontal</button>\n' +
    '          <button id="format-facebook-vertical" type="button" data-width="1080" data-height="1350"\n' +
    '            class="format-button btn-hover" aria-label="Post de Facebook Vertical, 1080 por 1350 píxeles">Post de Facebook Vertical</button>\n' +
    '          <button id="format-original" type="button" data-format-mode="original"',
  )
  .replace(
    '        <div class="size-item"><span class="size-icon">🖼️</span><span class="size-label">Formato Original:',
    '        <div class="size-item"><span class="size-icon">📱</span><span class="size-label">Instagram 4:5: <strong>1080 × 1350 px</strong></span></div>\n' +
    '        <div class="size-item"><span class="size-icon">🖥️</span><span class="size-label">Facebook horizontal: <strong>1200 × 630 px</strong></span></div>\n' +
    '        <div class="size-item"><span class="size-icon">📱</span><span class="size-label">Post de Facebook Vertical: <strong>1080 × 1350 px</strong></span></div>\n' +
    '        <div class="size-item"><span class="size-icon">🖼️</span><span class="size-label">Formato Original:',
  )
  .replace(/<script\s+src="https:[^"]+"\s*><\/script>/gi, '')
  .replace(/<script>([\s\S]*?)<\/script>/i, '')
  .replace(
    'src="https://aefam.org/wp-content/uploads/2025/09/equa-baner-digital.png"',
    'src="/src/assets/equa-baner-digital.png"',
  )
  .replace('<p id="version-app-line" aria-label="Versión"></p>', '<p id="version-app-line" aria-label="Versión"></p>\n    <p>Aplicación original de Javier González Martí · <a href="https://creativecommons.org/licenses/by-nc/4.0/" class="external-link">CC BY-NC 4.0</a></p>')
  .replace(/^[ \t]+$/gm, '');

writeFileSync(
  new URL('../index.html', import.meta.url),
  `<!doctype html>\n<html lang="es">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Logos ERACIS Plus</title>\n</head>\n<body>${cleanBody}\n  <script type="module" src="/src/main.ts"></script>\n</body>\n</html>\n`,
);
writeFileSync(
  new URL('../src/styles.css', import.meta.url),
  css.replace(/@import url\('https:\/\/fonts\.googleapis\.com[^']+'\);/, "@import '@fontsource/inter/latin-400.css';\n@import '@fontsource/inter/latin-600.css';\n@import '@fontsource/inter/latin-700.css';")
    .replace(/(\.sizes-list \{\r?\n[ \t]*display: flex;\r?\n[ \t]*flex-direction: row;)/, '$1\n      flex-wrap: wrap;')
    .trimEnd() + '\n',
);
