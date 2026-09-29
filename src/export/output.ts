import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import type { AppState, OutputFormat } from '../state/model';
import { dateFileName, loadBackgroundImage, photoDate } from '../import/media';
import { logoHeaderDataUrl, renderComposition } from '../processing/compositor';

export interface GeneratedOutput { blob: Blob; filename: string }

function imageCanvas(image: HTMLImageElement, state: AppState, date: Date): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  renderComposition(canvas, image, state.logoImage, date, state);
  return canvas;
}

function canvasBlob(canvas: HTMLCanvasElement, mime: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob(
    (blob) => blob ? resolve(blob) : reject(new Error('No se pudo generar el archivo de imagen.')),
    mime,
    quality,
  ));
}

async function shadowedCanvas(source: HTMLCanvasElement, position: AppState['logoPosition']): Promise<HTMLCanvasElement> {
  const blur = 40;
  const offset = 24;
  const pad = blur + offset + 10;
  const canvas = document.createElement('canvas');
  canvas.width = source.width + pad * 2;
  canvas.height = source.height + pad * 2;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No se pudo crear la sombra del PDF.');
  context.shadowColor = 'rgba(0,0,0,0.25)';
  context.shadowBlur = blur;
  context.shadowOffsetX = offset;
  context.shadowOffsetY = position === 'top' ? -offset : offset;
  context.drawImage(source, pad, pad);
  return canvas;
}

async function makePdf(canvas: HTMLCanvasElement, state: AppState): Promise<Blob> {
  const shaded = await shadowedCanvas(canvas, state.logoPosition);
  const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let contentTop = margin;
  if (state.includePdfHeader && state.logoImage) {
    const headerMaxWidth = pageWidth - 2 * margin;
    const headerAspect = state.logoImage.width / state.logoImage.height;
    let headerWidth = headerMaxWidth;
    let headerHeight = headerWidth / headerAspect;
    if (headerHeight > 120) {
      headerHeight = 120;
      headerWidth = headerHeight * headerAspect;
    }
    doc.addImage(logoHeaderDataUrl(state.logoImage), 'PNG', (pageWidth - headerWidth) / 2, contentTop, headerWidth, headerHeight);
    contentTop += headerHeight + 18;
  }
  const availableHeight = pageHeight - margin - contentTop;
  const maxWidth = pageWidth - 2 * margin;
  const maxHeight = availableHeight > 0 ? availableHeight : pageHeight - 2 * margin;
  const areaTop = availableHeight > 0 ? contentTop : margin;
  let drawWidth = maxWidth;
  let drawHeight = drawWidth * shaded.height / shaded.width;
  if (drawHeight > maxHeight) {
    drawHeight = maxHeight;
    drawWidth = drawHeight * shaded.width / shaded.height;
  }
  doc.addImage(shaded.toDataURL('image/png'), 'PNG', (pageWidth - drawWidth) / 2, areaTop + (maxHeight - drawHeight) / 2, drawWidth, drawHeight);
  return doc.output('blob');
}

async function encode(canvas: HTMLCanvasElement, format: OutputFormat, state: AppState): Promise<Blob> {
  if (format === 'pdf') return makePdf(canvas, state);
  return canvasBlob(canvas, format === 'jpg' ? 'image/jpeg' : 'image/png', format === 'jpg' ? 0.92 : 1);
}

export function uniqueOutputName(base: string, usage: Map<string, number>, extension: string): string {
  const index = (usage.get(base) || 0) + 1;
  usage.set(base, index);
  return `${base}(${index}).${extension}`;
}

export async function generateOutput(state: AppState, onProgress?: (done: number, total: number) => void): Promise<GeneratedOutput> {
  if (!state.baseImage || !state.baseAsset) throw new Error('Carga una imagen o PDF de fondo antes de guardar.');
  const format = state.outputFormat;
  const extension = format;
  if (state.batchAssets.length > 1) {
    const zip = new JSZip();
    const usage = new Map<string, number>();
    for (const [index, asset] of state.batchAssets.entries()) {
      const image = index === 0 ? state.baseImage : await loadBackgroundImage(asset);
      const date = await photoDate(asset.file);
      const canvas = imageCanvas(image, state, date);
      const blob = await encode(canvas, format, state);
      zip.file(uniqueOutputName(dateFileName(date), usage, extension), blob);
      onProgress?.(index + 1, state.batchAssets.length);
      canvas.width = 0;
      canvas.height = 0;
    }
    return {
      blob: await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' }),
      filename: `${dateFileName(state.baseDate || new Date())} (lote de archivos).zip`,
    };
  }
  const canvas = imageCanvas(state.baseImage, state, state.baseDate || new Date());
  const blob = await encode(canvas, format, state);
  canvas.width = 0;
  canvas.height = 0;
  return { blob, filename: `${dateFileName(state.baseDate || new Date())}.${extension}` };
}
