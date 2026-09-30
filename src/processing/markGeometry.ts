import type { EracisMark } from '../state/model';
import type { CompositionLayout } from './compositor';

export interface MarkRectangle { x: number; y: number; width: number; height: number }

export function markBackgroundRectangle(mark: MarkRectangle, shape: 'rectangle' | 'circle'): MarkRectangle {
  const width = shape === 'circle' ? Math.hypot(mark.width * 1.2, mark.height * 1.2) : mark.width * 1.2;
  const height = shape === 'circle' ? width : mark.height * 1.2;
  return {
    x: mark.x + (mark.width - width) / 2,
    y: mark.y + (mark.height - height) / 2,
    width,
    height,
  };
}

export function markRectangle(mark: EracisMark, image: HTMLImageElement, layout: CompositionLayout): MarkRectangle {
  const aspect = image.naturalWidth / image.naturalHeight;
  const centerX = Math.min(1, Math.max(0, mark.centerX)) * layout.width;
  const centerY = layout.photoTop + Math.min(1, Math.max(0, mark.centerY)) * layout.photoHeight;
  const requested = mark.widthRatio * Math.max(layout.width, layout.height);
  const width = Math.max(0, Math.min(
    requested, layout.width, layout.photoHeight * aspect,
    2 * centerX, 2 * (layout.width - centerX),
    2 * (centerY - layout.photoTop) * aspect,
    2 * (layout.photoTop + layout.photoHeight - centerY) * aspect,
  ));
  return { x: centerX - width / 2, y: centerY - width / aspect / 2, width, height: width / aspect };
}

export function initialMark(variant: string): EracisMark {
  return { variant, background: 'none', centerX: 0.5, centerY: 0.5, widthRatio: 0.1 };
}

export function moveMark(mark: EracisMark, image: HTMLImageElement, layout: CompositionLayout, dx: number, dy: number): EracisMark {
  const rect = markRectangle(mark, image, layout);
  const x = Math.min(layout.width - rect.width / 2, Math.max(rect.width / 2, rect.x + rect.width / 2 + dx));
  const y = Math.min(layout.photoTop + layout.photoHeight - rect.height / 2,
    Math.max(layout.photoTop + rect.height / 2, rect.y + rect.height / 2 + dy));
  return { ...mark, centerX: x / layout.width, centerY: (y - layout.photoTop) / layout.photoHeight };
}

export type MarkCorner = 'nw' | 'ne' | 'sw' | 'se';

export function resizeMark(mark: EracisMark, image: HTMLImageElement, layout: CompositionLayout,
  corner: MarkCorner, x: number, y: number): EracisMark {
  const rect = markRectangle(mark, image, layout);
  const left = corner.endsWith('w');
  const top = corner.startsWith('n');
  const anchorX = left ? rect.x + rect.width : rect.x;
  const anchorY = top ? rect.y + rect.height : rect.y;
  const aspect = image.naturalWidth / image.naturalHeight;
  const requested = Math.max(Math.abs(x - anchorX), Math.abs(y - anchorY) * aspect);
  const limitX = left ? anchorX : layout.width - anchorX;
  const limitY = top ? anchorY - layout.photoTop : layout.photoTop + layout.photoHeight - anchorY;
  const minimum = Math.min(12, limitX, limitY * aspect);
  const width = Math.max(minimum, Math.min(requested, limitX, limitY * aspect));
  const centerX = anchorX + (left ? -width / 2 : width / 2);
  const centerY = anchorY + (top ? -width / aspect / 2 : width / aspect / 2);
  return { ...mark, centerX: centerX / layout.width,
    centerY: (centerY - layout.photoTop) / layout.photoHeight,
    widthRatio: width / Math.max(layout.width, layout.height) };
}
