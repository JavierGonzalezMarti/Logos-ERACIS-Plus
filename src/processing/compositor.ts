import type { RenderSettings } from '../state/model';
import { formatDate } from '../import/media';

export interface Dimensions { width: number; height: number }
export interface SourceWindow {
  sw: number; sh: number; maxSX: number; maxSY: number; visibleHeight: number;
}

const FIXED_DIMENSIONS: Record<Exclude<RenderSettings['format'], 'original'>, Dimensions> = {
  horizontal: { width: 1920, height: 1080 },
  square: { width: 1080, height: 1080 },
  vertical: { width: 1080, height: 1920 },
  'four-three': { width: 1440, height: 1080 },
  instagram: { width: 1080, height: 1350 },
  facebook: { width: 1200, height: 630 },
};

export function canvasDimensions(image: HTMLImageElement | null, format: RenderSettings['format']): Dimensions {
  if (format === 'original' && image) return { width: image.naturalWidth, height: image.naturalHeight };
  return FIXED_DIMENSIONS[format === 'original' ? 'four-three' : format];
}

export function visibleArea(width: number, height: number, logo: HTMLImageElement | null, position: RenderSettings['logoPosition']) {
  if (!logo) return { top: 0, height };
  const logoHeight = Math.min(height, Math.max(0, width * logo.height / logo.width));
  return {
    top: position === 'top' ? logoHeight : 0,
    height: Math.max(0, height - logoHeight),
  };
}

export function sourceWindow(
  image: HTMLImageElement,
  canvasWidth: number,
  canvasHeight: number,
  logo: HTMLImageElement | null,
  position: RenderSettings['logoPosition'],
): SourceWindow {
  const area = visibleArea(canvasWidth, canvasHeight, logo, position);
  const drawHeight = area.height > 0 ? area.height : canvasHeight;
  const imageAspect = image.width / image.height;
  const drawAspect = canvasWidth / drawHeight;
  if (imageAspect > drawAspect) {
    const sh = image.height;
    const sw = image.height * drawAspect;
    return { sw, sh, maxSX: Math.max(0, image.width - sw), maxSY: 0, visibleHeight: drawHeight };
  }
  const sw = image.width;
  const sh = image.width / drawAspect;
  return { sw, sh, maxSX: 0, maxSY: Math.max(0, image.height - sh), visibleHeight: drawHeight };
}

function drawBackground(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
  logo: HTMLImageElement | null,
  settings: RenderSettings,
) {
  if (settings.format === 'original') {
    context.drawImage(image, 0, 0, image.width, image.height, 0, 0, width, height);
    return;
  }
  const area = visibleArea(width, height, logo, settings.logoPosition);
  const drawHeight = area.height > 0 ? area.height : height;
  if (settings.fitMode === 'stretch') {
    context.drawImage(image, 0, 0, image.width, image.height, 0, area.top, width, drawHeight);
    return;
  }
  const geometry = sourceWindow(image, width, height, logo, settings.logoPosition);
  const sx = geometry.maxSX * Math.min(1, Math.max(0, settings.panX));
  const sy = geometry.maxSY * Math.min(1, Math.max(0, settings.panY));
  context.drawImage(image, sx, sy, geometry.sw, geometry.sh, 0, area.top, width, drawHeight);
}

function drawLogo(context: CanvasRenderingContext2D, logo: HTMLImageElement, width: number, height: number, position: RenderSettings['logoPosition']) {
  const logoHeight = width * logo.height / logo.width;
  const y = position === 'top' ? 0 : height - logoHeight;
  context.drawImage(logo, 0, y, width, logoHeight);
}

function drawTimestamp(
  context: CanvasRenderingContext2D,
  date: Date,
  width: number,
  height: number,
  logo: HTMLImageElement | null,
  settings: RenderSettings,
) {
  const text = formatDate(date);
  const padding = Math.max(8, Math.round(height * 0.015));
  const fontSize = Math.max(16, Math.round(height * 0.025));
  const bgPaddingX = Math.max(6, Math.round(fontSize * 0.35));
  const bgPaddingY = Math.max(4, Math.round(fontSize * 0.3));
  context.save();
  context.font = `700 ${fontSize}px Inter, Arial, sans-serif`;
  const textColor = settings.timestampColor === 'black' ? '#000000' : '#ffffff';
  const shadowColor = settings.timestampColor === 'black' ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.6)';
  const metrics = context.measureText(text);
  const textHeight = Math.max(fontSize, (metrics.actualBoundingBoxAscent ?? 0) + (metrics.actualBoundingBoxDescent ?? 0));
  const logoHeight = logo ? width * logo.height / logo.width : 0;
  const topOffset = logo && settings.logoPosition === 'top' ? logoHeight : 0;
  const bottomOffset = logo && settings.logoPosition === 'bottom' ? logoHeight : 0;
  const safeTop = Math.min(height - padding, padding + topOffset);
  const safeBottom = Math.max(padding, height - padding - bottomOffset);

  const right = settings.timestampPosition.endsWith('r');
  const top = settings.timestampPosition.startsWith('t');
  const x = right ? width - padding : padding;
  const y = top ? safeTop : safeBottom;
  context.textAlign = right ? 'right' : 'left';
  context.textBaseline = top ? 'top' : 'bottom';
  const rectX = right ? x - metrics.width - bgPaddingX : x - bgPaddingX;
  const rectY = top ? y - bgPaddingY : y - textHeight - bgPaddingY;

  if (settings.timestampBackground !== 'none') {
    context.shadowColor = 'transparent';
    context.shadowBlur = 0;
    context.fillStyle = settings.timestampBackground === 'white' ? '#ffffff' : '#000000';
    context.fillRect(rectX, rectY, metrics.width + 2 * bgPaddingX, textHeight + 2 * bgPaddingY);
  }
  context.shadowColor = shadowColor;
  context.shadowBlur = Math.max(2, Math.round(fontSize * 0.25));
  context.fillStyle = textColor;
  context.fillText(text, x, y);
  context.restore();
}

export function renderComposition(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement | null,
  logo: HTMLImageElement | null,
  date: Date | null,
  settings: RenderSettings,
): void {
  const { width, height } = canvasDimensions(image, settings.format);
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No se pudo crear el lienzo de imagen.');
  if (image) drawBackground(context, image, width, height, logo, settings);
  else {
    context.fillStyle = '#f0f0f0';
    context.fillRect(0, 0, width, height);
  }
  if (logo) drawLogo(context, logo, width, height, settings.logoPosition);
  if (image && date && settings.timestampEnabled) drawTimestamp(context, date, width, height, logo, settings);
}

export function logoHeaderDataUrl(logo: HTMLImageElement): string {
  const canvas = document.createElement('canvas');
  canvas.width = logo.width;
  canvas.height = logo.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No se pudo preparar el faldón para PDF.');
  context.drawImage(logo, 0, 0);
  return canvas.toDataURL('image/png');
}
