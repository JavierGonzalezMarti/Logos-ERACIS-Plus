import type { BackgroundAsset } from '../import/media';

export type Format = 'horizontal' | 'square' | 'vertical' | 'four-three' | 'original';
export type FitMode = 'stretch' | 'crop';
export type LogoPosition = 'top' | 'bottom';
export type OutputFormat = 'png' | 'jpg' | 'pdf';
export type TimestampPosition = 'tl' | 'tr' | 'bl' | 'br';
export type TimestampBackground = 'none' | 'white' | 'black';

export interface RenderSettings {
  format: Format;
  fitMode: FitMode;
  logoPosition: LogoPosition;
  panX: number;
  panY: number;
  timestampEnabled: boolean;
  timestampColor: 'white' | 'black';
  timestampBackground: TimestampBackground;
  timestampPosition: TimestampPosition;
}

export interface AppState extends RenderSettings {
  baseAsset: BackgroundAsset | null;
  baseImage: HTMLImageElement | null;
  logoImage: HTMLImageElement | null;
  logoDataUrl: string | null;
  batchAssets: BackgroundAsset[];
  batchCount: number;
  baseDate: Date | null;
  outputFormat: OutputFormat;
  includePdfHeader: boolean;
  cropMode: boolean;
  busy: boolean;
}

export const MAX_BATCH_ITEMS = 50;

export const initialState = (): AppState => ({
  format: 'four-three',
  fitMode: 'crop',
  logoPosition: 'bottom',
  panX: 0.5,
  panY: 0.5,
  timestampEnabled: true,
  timestampColor: 'white',
  timestampBackground: 'none',
  timestampPosition: 'tl',
  baseAsset: null,
  baseImage: null,
  logoImage: null,
  logoDataUrl: null,
  batchAssets: [],
  batchCount: 0,
  baseDate: null,
  outputFormat: 'png',
  includePdfHeader: false,
  cropMode: false,
  busy: false,
});
