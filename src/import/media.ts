import exifr from 'exifr';
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { MAX_BATCH_ITEMS } from '../state/model';

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export type BackgroundAsset =
  | { kind: 'image'; file: File; displayName: string }
  | { kind: 'pdf'; file: File; document: PDFDocumentProxy; pageNumber: number; displayName: string };

const IMAGE_EXTENSIONS = /\.(avif|bmp|gif|heic|heif|jpe?g|png|webp)$/i;
const HEIC_EXTENSIONS = /\.(heic|heif)$/i;

export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/') || IMAGE_EXTENSIONS.test(file.name);
}

export function isSupportedBackgroundFile(file: File): boolean {
  return isImageFile(file) || isPdfFile(file);
}

export function safeBaseName(filename: string): string {
  return filename.replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]+/g, '-').trim();
}

const pad2 = (value: number) => String(value).padStart(2, '0');

export function formatDate(date: Date): string {
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
}

export function dateFileName(date: Date): string {
  return `${pad2(date.getDate())}-${pad2(date.getMonth() + 1)}-${String(date.getFullYear()).slice(-2)}`;
}

export async function photoDate(file: File): Promise<Date> {
  try {
    // Leer el original antes de convertir HEIC: la conversión no conserva EXIF.
    const metadata = await exifr.parse(file, ['DateTimeOriginal', 'CreateDate']);
    const value = metadata?.DateTimeOriginal || metadata?.CreateDate;
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  } catch {
    // Algunos formatos no tienen EXIF. Se utiliza la fecha del archivo.
  }
  return new Date(file.lastModified || Date.now());
}

export async function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string'
      ? resolve(reader.result)
      : reject(new Error('No se pudo leer la imagen.'));
    reader.onerror = () => reject(reader.error || new Error('No se pudo leer la imagen.'));
    reader.readAsDataURL(file);
  });
}

export async function imageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('No se pudo convertir el archivo en imagen.'));
    image.src = url;
  });
}

export async function imageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  try {
    return await imageFromUrl(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function imageFromFile(file: File): Promise<HTMLImageElement> {
  if (HEIC_EXTENSIONS.test(file.name) || /image\/hei[cf]/i.test(file.type)) {
    try {
      const { default: heic2any } = await import('heic2any');
      const converted = await heic2any({ blob: file, toType: 'image/png' });
      return imageFromBlob(Array.isArray(converted) ? converted[0] : converted);
    } catch {
      throw new Error(`No se pudo convertir el archivo HEIC/HEIF: ${file.name}`);
    }
  }
  return imageFromBlob(file);
}

export async function openPdfFile(file: File): Promise<PDFDocumentProxy> {
  return getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
}

export async function firstBackgroundAsset(file: File): Promise<BackgroundAsset> {
  if (isImageFile(file)) return { kind: 'image', file, displayName: file.name };
  if (isPdfFile(file)) {
    const document = await openPdfFile(file);
    return {
      kind: 'pdf', file, document, pageNumber: 1,
      displayName: document.numPages > 1 ? `${file.name} · página 1 de ${document.numPages}` : file.name,
    };
  }
  throw new Error('Selecciona una imagen o un PDF válido.');
}

export async function expandBackgroundFiles(files: File[]): Promise<{
  assets: BackgroundAsset[]; totalCount: number; errors: string[];
}> {
  const assets: BackgroundAsset[] = [];
  const errors: string[] = [];
  let totalCount = 0;
  for (const file of files) {
    if (isImageFile(file)) {
      totalCount += 1;
      if (assets.length < MAX_BATCH_ITEMS) assets.push({ kind: 'image', file, displayName: file.name });
    } else if (isPdfFile(file)) {
      try {
        const document = await openPdfFile(file);
        totalCount += document.numPages;
        const remaining = MAX_BATCH_ITEMS - assets.length;
        for (let pageNumber = 1; pageNumber <= Math.min(document.numPages, remaining); pageNumber += 1) {
          assets.push({
            kind: 'pdf', file, document, pageNumber,
            displayName: `${file.name} · página ${pageNumber}`,
          });
        }
      } catch {
        errors.push(`${file.name}: no se pudo abrir el PDF.`);
      }
    } else {
      errors.push(`${file.name}: formato no compatible.`);
    }
  }
  return { assets, totalCount, errors };
}

export async function loadBackgroundImage(asset: BackgroundAsset): Promise<HTMLImageElement> {
  if (asset.kind === 'image') return imageFromFile(asset.file);
  const page = await asset.document.getPage(asset.pageNumber);
  try {
    const unitViewport = page.getViewport({ scale: 1 });
    const scale = Math.min(2, 3000 / Math.max(1, unitViewport.width, unitViewport.height));
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.ceil(viewport.width));
    canvas.height = Math.max(1, Math.ceil(viewport.height));
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('No se pudo crear el lienzo para el PDF.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: context, viewport }).promise;
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
      (result) => result ? resolve(result) : reject(new Error('No se pudo rasterizar el PDF.')),
      'image/png',
    ));
    return imageFromBlob(blob);
  } finally {
    page.cleanup();
  }
}

export function thumbnailDataUrl(image: HTMLImageElement): string {
  const ratio = Math.min(1, 420 / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * ratio));
  canvas.height = Math.max(1, Math.round(image.height * ratio));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No se pudo crear la miniatura.');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.86);
}
