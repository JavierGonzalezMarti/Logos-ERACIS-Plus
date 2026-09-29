import { readFileSync, writeFileSync } from 'node:fs';

const source = readFileSync(new URL('../reference/Faldón ERACIS V82.html', import.meta.url), 'utf8');
const css = source.match(/<style>([\s\S]*?)<\/style>/i)?.[1];
const body = source.match(/<body>([\s\S]*?)<\/body>/i)?.[1];
if (!css || !body) throw new Error('No se encontraron el estilo o el cuerpo del HTML original.');

const cleanBody = body
  .replace('<div class="batch-input-group">', '<div class="batch-input-group" id="batch-input-group">')
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
  css.replace(/@import url\('https:\/\/fonts\.googleapis\.com[^']+'\);/, "@import '@fontsource/inter/latin-400.css';\n@import '@fontsource/inter/latin-600.css';\n@import '@fontsource/inter/latin-700.css';").trimEnd() + '\n',
);
