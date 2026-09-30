import { describe, expect, it } from 'vitest';
import { compositionLayout, renderComposition, sourceWindow } from '../src/processing/compositor';
import { initialState } from '../src/state/model';

function image(width: number, height: number): HTMLImageElement {
  return { width, height, naturalWidth: width, naturalHeight: height } as HTMLImageElement;
}

function drawing() {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const context = {
    drawImage: (...args: unknown[]) => calls.push({ method: 'drawImage', args }),
    fillRect: (...args: unknown[]) => calls.push({ method: 'fillRect', args }),
    fillText: (...args: unknown[]) => calls.push({ method: 'fillText', args }),
    measureText: () => ({ width: 90, actualBoundingBoxAscent: 18, actualBoundingBoxDescent: 4 }),
    save: () => {}, restore: () => {},
  } as unknown as CanvasRenderingContext2D;
  const canvas = { width: 0, height: 0, getContext: () => context } as unknown as HTMLCanvasElement;
  return { canvas, calls };
}

describe('posición del faldón', () => {
  const photo = image(200, 100);
  const logo = image(200, 20);

  it('mantiene la proporción final de cada formato fijo y no cambia nada sin faldón', () => {
    const formats = [
      ['horizontal', 1920, 1080], ['square', 1080, 1080], ['vertical', 1080, 1920],
      ['four-three', 1440, 1080], ['instagram', 1080, 1350], ['facebook', 1200, 630],
    ] as const;
    for (const [format, width, height] of formats) {
      const inside = { ...initialState(), format };
      const outside = { ...inside, logoPlacement: 'outside' as const };
      expect([compositionLayout(photo, logo, inside).width, compositionLayout(photo, logo, inside).height])
        .toEqual([width, height]);
      expect([compositionLayout(photo, logo, outside).width, compositionLayout(photo, logo, outside).height])
        .toEqual([width, height]);
      expect(compositionLayout(photo, null, outside)).toEqual(compositionLayout(photo, null, inside));
    }
  });

  it('superpone dentro y reserva espacio fuera sin cambiar los tamaños fijos', () => {
    for (const position of ['top', 'bottom'] as const) {
      const inside = { ...initialState(), format: 'square' as const, logoPosition: position };
      const outside = { ...inside, logoPlacement: 'outside' as const };
      const insideLayout = compositionLayout(photo, logo, inside);
      const outsideLayout = compositionLayout(photo, logo, outside);
      expect([insideLayout.width, insideLayout.height, insideLayout.photoTop, insideLayout.photoHeight])
        .toEqual([1080, 1080, 0, 1080]);
      expect([outsideLayout.width, outsideLayout.height, outsideLayout.photoTop, outsideLayout.photoHeight])
        .toEqual([1080, 1080, position === 'top' ? 108 : 0, 972]);
      expect(sourceWindow(photo, insideLayout).sw).toBe(100);
      expect(sourceWindow(photo, outsideLayout).sw).toBeCloseTo(200 * 1080 / 972 / 2);

      const insideDrawing = drawing();
      renderComposition(insideDrawing.canvas, photo, logo, null, inside);
      expect(insideDrawing.calls[0]).toMatchObject({ method: 'drawImage', args: [photo, 50, 0, 100, 100, 0, 0, 1080, 1080] });

      const outsideDrawing = drawing();
      renderComposition(outsideDrawing.canvas, photo, logo, null, outside);
      expect(outsideDrawing.calls[0].method).toBe('drawImage');
      expect(outsideDrawing.calls[0].args.slice(-4)).toEqual([0, outsideLayout.photoTop, 1080, 972]);
      expect(outsideDrawing.calls[1]).toEqual({ method: 'fillRect', args: [0, outsideLayout.logoY, 1080, 108] });
    }
  });

  it('conserva la foto completa en formato original y añade el faldón fuera', () => {
    for (const position of ['top', 'bottom'] as const) {
      const settings = { ...initialState(), format: 'original' as const, logoPlacement: 'outside' as const, logoPosition: position };
      const layout = compositionLayout(photo, logo, settings);
      expect([layout.width, layout.height, layout.photoTop, layout.photoHeight])
        .toEqual([200, 120, position === 'top' ? 20 : 0, 100]);
      const { canvas, calls } = drawing();
      renderComposition(canvas, photo, logo, null, settings);
      expect([canvas.width, canvas.height]).toEqual([200, 120]);
      expect(calls[0]).toEqual({ method: 'drawImage', args: [photo, 0, layout.photoTop] });
      expect(calls[1]).toEqual({ method: 'fillRect', args: [0, layout.logoY, 200, 20] });
    }
  });

  it('coloca la fecha dentro de la foto en ambos modos y posiciones', () => {
    for (const placement of ['inside', 'outside'] as const) {
      for (const position of ['top', 'bottom'] as const) {
        for (const timestampPosition of ['tl', 'tr', 'bl', 'br'] as const) {
          const settings = { ...initialState(), format: 'square' as const, logoPlacement: placement,
            logoPosition: position, timestampPosition, timestampEnabled: true };
          const layout = compositionLayout(photo, logo, settings);
          const { canvas, calls } = drawing();
          renderComposition(canvas, photo, logo, new Date(2026, 8, 30), settings);
          const date = calls.find((call) => call.method === 'fillText');
          expect(date).toBeDefined();
          const y = date!.args[2] as number;
          expect(y).toBeGreaterThanOrEqual(layout.photoTop);
          expect(y).toBeLessThanOrEqual(layout.photoTop + layout.photoHeight);
          if (placement === 'inside' && position === 'top') expect(y).toBeGreaterThan(layout.logoHeight);
          if (placement === 'inside' && position === 'bottom') expect(y).toBeLessThan(layout.logoY);
        }
      }
    }
  });
});
