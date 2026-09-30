import type { BackgroundAsset } from '../import/media';

export type Format = 'horizontal' | 'square' | 'vertical' | 'four-three' | 'instagram' | 'facebook' | 'facebook-vertical' | 'original';
export type FitMode = 'stretch' | 'crop';
export type LogoPosition = 'top' | 'bottom';
export type LogoPlacement = 'inside' | 'outside';
export type OutputFormat = 'png' | 'jpg' | 'pdf';
export type TimestampPosition = 'tl' | 'tr' | 'bl' | 'br';
export type TimestampBackground = 'none' | 'white' | 'black';

export interface EracisMark {
  variant: string;
  centerX: number;
  centerY: number;
  widthRatio: number;
}

export interface RenderSettings {
  format: Format;
  fitMode: FitMode;
  logoPosition: LogoPosition;
  logoPlacement: LogoPlacement;
  panX: number;
  panY: number;
  timestampEnabled: boolean;
  timestampColor: 'white' | 'black';
  timestampBackground: TimestampBackground;
  timestampPosition: TimestampPosition;
  eracisMark: EracisMark | null;
}

export interface AppState extends RenderSettings {
  baseAsset: BackgroundAsset | null;
  baseImage: HTMLImageElement | null;
  logoImage: HTMLImageElement | null;
  logoDataUrl: string | null;
  eracisMarkImage: HTMLImageElement | null;
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
  logoPlacement: 'inside',
  panX: 0.5,
  panY: 0.5,
  timestampEnabled: false,
  timestampColor: 'white',
  timestampBackground: 'none',
  timestampPosition: 'tl',
  eracisMark: null,
  baseAsset: null,
  baseImage: null,
  logoImage: null,
  logoDataUrl: null,
  eracisMarkImage: null,
  batchAssets: [],
  batchCount: 0,
  baseDate: null,
  outputFormat: 'png',
  includePdfHeader: false,
  cropMode: false,
  busy: false,
});
