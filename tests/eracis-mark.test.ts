import { describe, expect, it } from 'vitest';
import { compositionLayout, renderComposition } from '../src/processing/compositor';
import { initialMark, markRectangle, moveMark, resizeMark } from '../src/processing/markGeometry';
import { initialState } from '../src/state/model';

const image = (width: number, height: number) => ({ width, height, naturalWidth: width, naturalHeight: height }) as HTMLImageElement;
const photo = image(200, 100);
const horizontal = image(1000, 250);
const vertical = image(250, 1000);

describe('Marca ERACIS+', () => {
  it('empieza centrada al 10 % del lado mayor y conserva su ancho al cambiar variante', () => {
    const settings = initialState();
    const layout = compositionLayout(photo, null, settings);
    const mark = initialMark('horizontal');
    expect(markRectangle(mark, horizontal, layout)).toEqual({ x: 648, y: 522, width: 144, height: 36 });
    const changed = markRectangle({ ...mark, variant: 'vertical' }, vertical, layout);
    expect(changed.width).toBe(144);
    expect(changed.x + changed.width / 2).toBe(720);
    expect(changed.y + changed.height / 2).toBe(540);
  });

  it('mantiene la marca dentro de la foto con faldón exterior arriba y abajo', () => {
    for (const logoPosition of ['top', 'bottom'] as const) {
      const settings = { ...initialState(), logoPlacement: 'outside' as const, logoPosition };
      const layout = compositionLayout(photo, image(100, 20), settings);
      const mark = moveMark(initialMark('horizontal'), horizontal, layout, 10000, 10000);
      const rect = markRectangle(mark, horizontal, layout);
      expect(rect.x + rect.width).toBeLessThanOrEqual(layout.width);
      expect(rect.y).toBeGreaterThanOrEqual(layout.photoTop);
      expect(rect.y + rect.height).toBeLessThanOrEqual(layout.photoTop + layout.photoHeight);
      const resized = resizeMark(mark, horizontal, layout, 'nw', -10000, -10000);
      const large = markRectangle(resized, horizontal, layout);
      expect(large.x).toBeGreaterThanOrEqual(0);
      expect(large.y).toBeGreaterThanOrEqual(layout.photoTop);
    }
  });

  it('escala proporcionalmente desde las cuatro esquinas', () => {
    const layout = compositionLayout(photo, null, initialState());
    const initial = initialMark('horizontal');
    const rectangle = markRectangle(initial, horizontal, layout);
    for (const corner of ['nw', 'ne', 'sw', 'se'] as const) {
      const pointX = corner.endsWith('w') ? rectangle.x - 30 : rectangle.x + rectangle.width + 30;
      const pointY = corner.startsWith('n') ? rectangle.y - 8 : rectangle.y + rectangle.height + 8;
      const updated = resizeMark(initial, horizontal, layout, corner, pointX, pointY);
      const next = markRectangle(updated, horizontal, layout);
      expect(next.width).toBeGreaterThan(rectangle.width);
      expect(next.width / next.height).toBeCloseTo(4);
      expect(next.x).toBeGreaterThanOrEqual(0);
      expect(next.y).toBeGreaterThanOrEqual(layout.photoTop);
      expect(next.x + next.width).toBeLessThanOrEqual(layout.width);
      expect(next.y + next.height).toBeLessThanOrEqual(layout.photoTop + layout.photoHeight);
    }
  });

  it('dibuja la marca por encima de fecha y faldón en vista previa y exportación', () => {
    const settings = { ...initialState(), eracisMark: initialMark('horizontal'), timestampEnabled: true };
    const calls: string[] = [];
    const context = {
      drawImage: (value: HTMLImageElement) => calls.push(value === horizontal ? 'mark' : 'other'),
      fillRect: () => {}, fillText: () => calls.push('date'),
      measureText: () => ({ width: 100, actualBoundingBoxAscent: 12, actualBoundingBoxDescent: 4 }),
      save: () => {}, restore: () => {},
    } as unknown as CanvasRenderingContext2D;
    const canvas = { width: 0, height: 0, getContext: () => context } as unknown as HTMLCanvasElement;
    renderComposition(canvas, photo, image(100, 20), new Date(2026, 8, 30), settings, horizontal);
    expect(calls.at(-1)).toBe('mark');
    expect(calls).toContain('date');
    expect([canvas.width, canvas.height]).toEqual([1440, 1080]);
  });
});
