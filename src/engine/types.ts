export type StudioMode = 'color' | 'pbn' | 'multiframe';

export type BrushTool = 'detail' | 'simplify' | 'unifyBg' | 'none';

export type BrushPolarity = 'add' | 'subtract';

export type AspectRatioOption = 'original' | '1:1' | '4:5' | '3:4' | 'a4';

export type PaletteId = 'natural' | 'editorial' | 'pastel' | 'popart' | 'wpap' | 'graphite';

export type PbnColorCount = 12 | 16 | 20;

export type FrameGridId = '1x1' | '2x1' | '3x1' | '2x2' | '3x2' | '4x3';

export type FrameFinish = 'oak' | 'black' | 'white' | 'frameless';

export type UnifyBgTone = 'exterior' | 'white' | 'paper' | 'dark';

export type Locale = 'es' | 'en' | 'fr';

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface LabColor {
  L: number;
  a: number;
  b: number;
}

export interface PaletteColorEntry {
  index: number; // 1-based for Paint by Numbers
  rgb: RGB;
  hex: string;
  count: number;
}

export interface TriangleData {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  r: number;
  g: number;
  b: number;
  isUnifiedBg?: boolean;
  // Paint by Numbers metadata (populated when mode === 'pbn' or requested)
  pbnIndex?: number; // 1..K
  pbnR?: number;
  pbnG?: number;
  pbnB?: number;
  incenterX?: number;
  incenterY?: number;
  inradius?: number;
  area?: number;
}

export interface StudioParams {
  density: number; // 250 .. 2200
  detailIntensity: number; // 0 .. 100 (controls triangle fineness inside painted eye/detail zones)
  edgeSensitivity: number; // 0 .. 100
  aspectRatio: AspectRatioOption;
  palette: PaletteId;
  showMesh: boolean;
  pbnColors: PbnColorCount;
  seed: number;
  unifyBackground: boolean;
  unifyStrength: number; // 0 .. 100 (subtle -> full unification inside selected zones)
  bgTolerance: number; // 10 .. 88
  unifyBgTone: UnifyBgTone;
  unifySampleRgb: RGB | null;
}

export interface WorkerRequest {
  requestId: number;
  width: number;
  height: number;
  pixels: Uint8ClampedArray;
  brushMap: Float32Array;
  bgMaskMap: Float32Array;
  brushWidth: number;
  brushHeight: number;
  params: StudioParams;
  computePbn: boolean;
  reuseSobel?: boolean;
}

export interface WorkerResponse {
  requestId: number;
  width: number;
  height: number;
  triangles: TriangleData[];
  pbnPalette: PaletteColorEntry[];
  computeTimeMs: number;
}

export interface FrameGridPreset {
  id: FrameGridId;
  cols: number;
  rows: number;
  totalFrames: number;
}

export const FRAME_GRID_PRESETS: FrameGridPreset[] = [
  { id: '1x1', cols: 1, rows: 1, totalFrames: 1 },
  { id: '2x1', cols: 2, rows: 1, totalFrames: 2 },
  { id: '3x1', cols: 3, rows: 1, totalFrames: 3 },
  { id: '2x2', cols: 2, rows: 2, totalFrames: 4 },
  { id: '3x2', cols: 3, rows: 2, totalFrames: 6 },
  { id: '4x3', cols: 4, rows: 3, totalFrames: 12 },
];
