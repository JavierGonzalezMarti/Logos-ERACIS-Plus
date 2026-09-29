import { isTauri } from '@tauri-apps/api/core';
import { BaseDirectory, exists, readFile, remove, writeFile } from '@tauri-apps/plugin-fs';
import { fileToDataUrl, imageFromBlob, imageFromUrl } from '../import/media';

const LOGO_FILE = 'logo.png';
const WEB_KEY = 'eracis-logo-data';

export interface SavedLogo { image: HTMLImageElement; dataUrl: string }

function imagePng(image: HTMLImageElement): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No se pudo guardar el faldón.');
  context.drawImage(image, 0, 0);
  return new Promise((resolve, reject) => canvas.toBlob(
    (blob) => blob ? resolve(blob) : reject(new Error('No se pudo guardar el faldón.')),
    'image/png',
  ));
}

export async function rememberLogo(image: HTMLImageElement): Promise<string> {
  const blob = await imagePng(image);
  const dataUrl = await fileToDataUrl(blob);
  if (isTauri()) {
    await writeFile(LOGO_FILE, new Uint8Array(await blob.arrayBuffer()), { baseDir: BaseDirectory.AppLocalData });
  } else {
    localStorage.setItem(WEB_KEY, dataUrl);
  }
  return dataUrl;
}

export async function restoreLogo(): Promise<SavedLogo | null> {
  try {
    if (isTauri()) {
      if (!await exists(LOGO_FILE, { baseDir: BaseDirectory.AppLocalData })) return null;
      const bytes = await readFile(LOGO_FILE, { baseDir: BaseDirectory.AppLocalData });
      const blob = new Blob([bytes], { type: 'image/png' });
      return { image: await imageFromBlob(blob), dataUrl: await fileToDataUrl(blob) };
    }
    const dataUrl = localStorage.getItem(WEB_KEY);
    return dataUrl ? { image: await imageFromUrl(dataUrl), dataUrl } : null;
  } catch (error) {
    console.warn('No se pudo restaurar el faldón.', error);
    return null;
  }
}

export async function forgetLogo(): Promise<void> {
  if (isTauri()) {
    if (await exists(LOGO_FILE, { baseDir: BaseDirectory.AppLocalData })) {
      await remove(LOGO_FILE, { baseDir: BaseDirectory.AppLocalData });
    }
  } else {
    localStorage.removeItem(WEB_KEY);
  }
}
