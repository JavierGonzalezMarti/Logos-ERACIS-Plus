import type { RenderSettings } from '../state/model';
import { formatDate } from '../import/media';
import { markRectangle } from './markGeometry';

export interface Dimensions { width: number; height: number }
export interface SourceWindow {
  sw: number; sh: number; maxSX: number; maxSY: number; visibleHeight: number;
}
export interface CompositionLayout extends Dimensions {
  photoTop: number;
  photoHeight: number;
  logoX: number;
  logoY: number;
  logoWidth: number;
  logoHeight: number;
}

const FIXED_DIMENSIONS: Record<Exclude<RenderSettings['format'], 'original'>, Dimensions> = {
  horizontal: { width: 1920, height: 1080 },
  square: { width: 1080, height: 1080 },
  vertical: { width: 1080, height: 1920 },
  'four-three': { width: 1440, height: 1080 },
  instagram: { width: 1080, height: 1350 },
  facebook: { width: 1200, height: 630 },
  'facebook-vertical': { width: 1080, height: 1350 },
};

export function compositionLayout(
  image: HTMLImageElement | null,
  logo: HTMLImageElement | null,
  settings: RenderSettings,
): CompositionLayout {
  const original = settings.format === 'original' && !!image;
  const base = original
    ? { width: image.naturalWidth, height: image.naturalHeight }
    : FIXED_DIMENSIONS[settings.format === 'original' ? 'four-three' : settings.format];
  const naturalLogoHeight = logo?.width ? Math.round(base.width * logo.height / logo.width) : 0;
  const outside = !!logo && settings.logoPlacement === 'outside';
  const logoHeight = original && outside
    ? naturalLogoHeight
    : Math.min(naturalLogoHeight, outside ? Math.floor(base.height / 2) : base.height);
  const logoWidth = naturalLogoHeight ? base.width * logoHeight / naturalLogoHeight : 0;
  const height = base.height + (original && outside ? logoHeight : 0);
  const photoHeight = outside ? height - logoHeight : base.height;
  const photoTop = outside && settings.logoPosition === 'top' ? logoHeight : 0;
  const logoY = settings.logoPosition === 'top' ? 0 : height - logoHeight;
  return {
    width: base.width, height, photoTop, photoHeight,
    logoX: (base.width - logoWidth) / 2, logoY, logoWidth, logoHeight,
  };
}

export function canvasDimensions(
  image: HTMLImageElement | null,
  logo: HTMLImageElement | null,
  settings: RenderSettings,
): Dimensions {
  const { width, height } = compositionLayout(image, logo, settings);
  return { width, height };
}

export function sourceWindow(
  image: HTMLImageElement,
  layout: CompositionLayout,
): SourceWindow {
  const drawHeight = layout.photoHeight;
  const imageAspect = image.width / image.height;
  const drawAspect = layout.width / drawHeight;
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
  layout: CompositionLayout,
  settings: RenderSettings,
) {
  if (settings.format === 'original') {
    context.drawImage(image, 0, layout.photoTop);
    return;
  }
  if (settings.fitMode === 'stretch') {
    context.drawImage(image, 0, 0, image.width, image.height, 0, layout.photoTop, layout.width, layout.photoHeight);
    return;
  }
  const geometry = sourceWindow(image, layout);
  const sx = geometry.maxSX * Math.min(1, Math.max(0, settings.panX));
  const sy = geometry.maxSY * Math.min(1, Math.max(0, settings.panY));
  context.drawImage(image, sx, sy, geometry.sw, geometry.sh, 0, layout.photoTop, layout.width, layout.photoHeight);
}

function drawLogo(context: CanvasRenderingContext2D, logo: HTMLImageElement, layout: CompositionLayout, outside: boolean) {
  if (outside) {
    context.fillStyle = '#ffffff';
    context.fillRect(0, layout.logoY, layout.width, layout.logoHeight);
  }
  context.drawImage(logo, layout.logoX, layout.logoY, layout.logoWidth, layout.logoHeight);
}

function drawTimestamp(
  context: CanvasRenderingContext2D,
  date: Date,
  layout: CompositionLayout,
  settings: RenderSettings,
) {
  const { width, height } = layout;
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
  const topOffset = settings.logoPlacement === 'inside' && settings.logoPosition === 'top' ? layout.logoHeight : 0;
  const bottomOffset = settings.logoPlacement === 'inside' && settings.logoPosition === 'bottom' ? layout.logoHeight : 0;
  const safeTop = Math.min(height - padding, layout.photoTop + padding + topOffset);
  const safeBottom = Math.max(padding, layout.photoTop + layout.photoHeight - padding - bottomOffset);

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
  markImage: HTMLImageElement | null = null,
): void {
  const layout = compositionLayout(image, logo, settings);
  const { width, height } = layout;
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No se pudo crear el lienzo de imagen.');
  if (image) drawBackground(context, image, layout, settings);
  else {
    context.fillStyle = '#f0f0f0';
    context.fillRect(0, 0, width, height);
  }
  if (logo) drawLogo(context, logo, layout, settings.logoPlacement === 'outside');
  if (image && date && settings.timestampEnabled) drawTimestamp(context, date, layout, settings);
  if (image && settings.eracisMark && markImage) {
    const mark = markRectangle(settings.eracisMark, markImage, layout);
    if (mark.width > 0 && mark.height > 0) context.drawImage(markImage, mark.x, mark.y, mark.width, mark.height);
  }
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
