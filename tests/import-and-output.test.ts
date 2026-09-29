import { describe, expect, it } from 'vitest';
import { dateFileName, expandBackgroundFiles, photoDate } from '../src/import/media';
import { uniqueOutputName } from '../src/export/output';
import { MAX_BATCH_ITEMS } from '../src/state/model';

describe('lotes y nombres de salida', () => {
  it('cuenta todos los elementos y detiene la preparación en el límite de 50', async () => {
    const files = Array.from({ length: 51 }, (_, index) =>
      new File(['imagen'], `foto-${index + 1}.png`, { type: 'image/png' }));
    const result = await expandBackgroundFiles(files);
    expect(result.totalCount).toBe(51);
    expect(result.assets).toHaveLength(MAX_BATCH_ITEMS);
    expect(result.assets[49].displayName).toBe('foto-50.png');
  });

  it('conserva la fecha del archivo cuando no hay metadatos y evita nombres duplicados', async () => {
    const modified = new Date(2024, 4, 6, 12, 0, 0);
    const file = new File(['imagen'], 'foto.png', { type: 'image/png', lastModified: modified.getTime() });
    expect(dateFileName(await photoDate(file))).toBe('06-05-24');
    const usage = new Map<string, number>();
    expect(uniqueOutputName('06-05-24', usage, 'png')).toBe('06-05-24(1).png');
    expect(uniqueOutputName('06-05-24', usage, 'png')).toBe('06-05-24(2).png');
  });
});
