import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Columns2, Eye, Upload } from 'lucide-react';
import { ControlSidebar } from './components/ControlSidebar';
import { ExportModal } from './components/ExportModal';
import { FrameWallPreview } from './components/FrameWallPreview';
import { PbnPaletteBar } from './components/PbnPaletteBar';
import { StudioCanvas } from './components/StudioCanvas';
import { SAMPLE_PORTRAITS, type SamplePortrait } from './data/samples';
import {
  downloadMasterPng300Dpi,
  downloadMasterSvg,
  downloadMultiFramePdf,
  downloadPaintByNumbersPdf,
  downloadPreviewPng,
  downloadStoryPng,
} from './engine/exporters';
import { quantizePaintByNumbers } from './engine/paintByNumbers';
import { labDistanceSq, rgbToLab } from './engine/palettes';
import {
  FRAME_GRID_PRESETS,
  type AspectRatioOption,
  type BrushPolarity,
  type BrushTool,
  type FrameFinish,
  type FrameGridId,
  type LabColor,
  type Locale,
  type PaletteColorEntry,
  type RGB,
  type StudioMode,
  type StudioParams,
  type TriangleData,
  type WorkerRequest,
  type WorkerResponse,
} from './engine/types';
import { detectInitialLocale, MESSAGES } from './i18n/messages';
import { saveProjectToIndexedDB } from './lib/projectStorage';

const BRUSH_GRID_SIZE = 128;
const MAX_WORK_SIDE = 960;

const DEFAULT_PARAMS: StudioParams = {
  density: 950,
  detailIntensity: 62,
  edgeSensitivity: 68,
  aspectRatio: '3:4',
  palette: 'natural',
  showMesh: false,
  pbnColors: 16,
  seed: 4217,
  unifyBackground: false,
  unifyStrength: 65,
  bgTolerance: 34,
  unifyBgTone: 'exterior',
  unifySampleRgb: null,
};

function getTargetAspectRatio(option: AspectRatioOption, natW: number, natH: number): number {
  switch (option) {
    case '1:1':
      return 1;
    case '4:5':
      return 4 / 5;
    case '3:4':
      return 3 / 4;
    case 'a4':
      return natW > natH ? 297 / 210 : 210 / 297;
    case 'original':
    default:
      return natW / Math.max(1, natH);
  }
}

/**
 * Crops the source image centered to the chosen aspect ratio and rescales
 * to an internal working buffer (max side 960px) for fast <150ms recalculation.
 */
function buildCroppedWorkingCanvas(
  img: HTMLImageElement,
  aspectRatio: AspectRatioOption
): { canvas: HTMLCanvasElement; width: number; height: number; pixels: Uint8ClampedArray } {
  const natW = img.naturalWidth || img.width;
  const natH = img.naturalHeight || img.height;
  const targetRatio = getTargetAspectRatio(aspectRatio, natW, natH);
  const srcRatio = natW / Math.max(1, natH);

  let sx = 0;
  let sy = 0;
  let sw = natW;
  let sh = natH;

  if (srcRatio > targetRatio) {
    sw = Math.round(natH * targetRatio);
    sx = Math.round((natW - sw) / 2);
  } else if (srcRatio < targetRatio) {
    sh = Math.round(natW / targetRatio);
    // Keep slightly higher vertical anchor (35% from top) so pet ears & eyes stay centered
    sy = Math.round((natH - sh) * 0.35);
  }

  const scale = Math.min(1, MAX_WORK_SIDE / Math.max(sw, sh));
  const width = Math.max(64, Math.round(sw * scale));
  const height = Math.max(64, Math.round(sh * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return { canvas, width, height, pixels: new Uint8ClampedArray(width * height * 4) };
  }

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  return { canvas, width, height, pixels: imageData.data };
}

function createInitialBrushMap(focalEyes?: { x: number; y: number; r: number }[]): Float32Array {
  const map = new Float32Array(BRUSH_GRID_SIZE * BRUSH_GRID_SIZE);
  if (!focalEyes || focalEyes.length === 0) return map;

  for (const spot of focalEyes) {
    const cx = spot.x * BRUSH_GRID_SIZE;
    const cy = spot.y * BRUSH_GRID_SIZE;
    const rad = spot.r * BRUSH_GRID_SIZE;
    const radSq = rad * rad;

    const minX = Math.max(0, Math.floor(cx - rad));
    const maxX = Math.min(BRUSH_GRID_SIZE - 1, Math.ceil(cx + rad));
    const minY = Math.max(0, Math.floor(cy - rad));
    const maxY = Math.min(BRUSH_GRID_SIZE - 1, Math.ceil(cy + rad));

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const distSq = dx * dx + dy * dy;
        if (distSq < radSq) {
          const falloff = Math.cos((Math.sqrt(distSq) / rad) * (Math.PI / 2));
          const idx = y * BRUSH_GRID_SIZE + x;
          map[idx] = Math.min(1, Math.max(map[idx], falloff * 0.85));
        }
      }
    }
  }

  return map;
}

export default function App() {
  const [locale, setLocale] = useState<Locale>(() => detectInitialLocale());
  const t = MESSAGES[locale];

  const [mode, setMode] = useState<StudioMode>('color');
  const [params, setParams] = useState<StudioParams>(DEFAULT_PARAMS);
  const [activeSampleId, setActiveSampleId] = useState<string>(SAMPLE_PORTRAITS[0].id);
  const [imageLabel, setImageLabel] = useState<string>(t.samples.aussie.name);

  // Loaded HTMLImageElement + cropped working buffer
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
  const [sourceCanvas, setSourceCanvas] = useState<HTMLCanvasElement | null>(null);
  const [workWidth, setWorkWidth] = useState<number>(600);
  const [workHeight, setWorkHeight] = useState<number>(800);
  const pixelsRef = useRef<Uint8ClampedArray | null>(null);

  // Manual Detail (+1) / Simplify (-1) brush map + Manual Erase (-1) / Restore (+1) background mask & undo history
  const [brushMap, setBrushMap] = useState<Float32Array>(() =>
    createInitialBrushMap(SAMPLE_PORTRAITS[0].focalEyes)
  );
  const brushMapRef = useRef<Float32Array>(brushMap);
  const [bgMaskMap, setBgMaskMap] = useState<Float32Array>(
    () => new Float32Array(BRUSH_GRID_SIZE * BRUSH_GRID_SIZE)
  );
  const bgMaskMapRef = useRef<Float32Array>(bgMaskMap);
  const eraseSeedLabRef = useRef<LabColor | null>(null);
  const pendingSampleRgbRef = useRef<RGB | null>(null);
  const lastPaintPosRef = useRef<{ x: number; y: number } | null>(null);
  const [brushVersion, setBrushVersion] = useState<number>(0);
  const [undoStack, setUndoStack] = useState<{ brush: Float32Array; bgMask: Float32Array }[]>([]);
  const [brushTool, setBrushTool] = useState<BrushTool>('detail');
  const [brushPolarity, setBrushPolarity] = useState<BrushPolarity>('add');
  const [detailBrushRadiusNorm, setDetailBrushRadiusNorm] = useState<number>(0.055);
  const [bgBrushRadiusNorm, setBgBrushRadiusNorm] = useState<number>(0.1);
  const [showBrushMask, setShowBrushMask] = useState<boolean>(false);

  const activeBrushRadiusNorm =
    brushTool === 'detail' ? detailBrushRadiusNorm : bgBrushRadiusNorm;

  // Photoshop-style "X" shortcut swaps White (Select/Add) <-> Black (Deselect/Subtract)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === 'x' || e.key === 'X') {
        setBrushPolarity((prev) => (prev === 'add' ? 'subtract' : 'add'));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Canvas inspection controls
  const [showOriginal, setShowOriginal] = useState<boolean>(false);
  const [splitCompare, setSplitCompare] = useState<boolean>(false);
  const [splitPos, setSplitPos] = useState<number>(0.5);

  // Paint by Numbers & Multi-Frame UI state
  const [pbnShowColorRef, setPbnShowColorRef] = useState<boolean>(false);
  const [highlightPbnIndex, setHighlightPbnIndex] = useState<number | null>(null);
  const [frameGridId, setFrameGridId] = useState<FrameGridId>('3x1');
  const [gutterPercent, setGutterPercent] = useState<number>(3.0);
  const [frameFinish, setFrameFinish] = useState<FrameFinish>('oak');

  // Worker computed geometry
  const [triangles, setTriangles] = useState<TriangleData[]>([]);
  const [pbnPalette, setPbnPalette] = useState<PaletteColorEntry[]>([]);
  const [isComputing, setIsComputing] = useState<boolean>(false);

  // Export Modal
  const [exportModalOpen, setExportModalOpen] = useState<boolean>(false);

  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef<number>(0);
  const debounceTimerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const studioSectionRef = useRef<HTMLElement | null>(null);

  const activeGridPreset = useMemo(
    () => FRAME_GRID_PRESETS.find((g) => g.id === frameGridId) ?? FRAME_GRID_PRESETS[2],
    [frameGridId]
  );

  const hasManualBgUnify = useMemo(() => {
    for (let i = 0; i < bgMaskMap.length; i++) {
      if (bgMaskMap[i] < -0.04) return true;
    }
    return false;
  }, [bgMaskMap, brushVersion]);

  const unifyBgActive = params.unifyBackground || hasManualBgUnify;

  const hasDetailStrokes = useMemo(() => {
    for (let i = 0; i < brushMap.length; i++) {
      if (brushMap[i] > 0.1) return true;
    }
    return false;
  }, [brushMap, brushVersion]);

  const hasBrushStrokes = useMemo(() => {
    for (let i = 0; i < brushMap.length; i++) {
      if (Math.abs(brushMap[i]) > 0.04 || Math.abs(bgMaskMap[i]) > 0.04) return true;
    }
    return false;
  }, [brushMap, bgMaskMap, brushVersion]);

  // Initialize off-main-thread Web Worker once
  useEffect(() => {
    const worker = new Worker(new URL('./engine/lowpoly.worker.ts', import.meta.url), {
      type: 'module',
    });

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const data = event.data;
      // Ignore stale responses if a newer recalculation was queued
      if (data.requestId !== requestIdRef.current) return;
      setTriangles(data.triangles);
      setPbnPalette(data.pbnPalette);
      setIsComputing(false);
    };

    workerRef.current = worker;
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  // Load sample image helper
  const loadSamplePortrait = useCallback((sample: SamplePortrait, label: string) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setActiveSampleId(sample.id);
      setImageLabel(label);
      setLoadedImage(img);
      const initialMap = createInitialBrushMap(sample.focalEyes);
      const emptyBg = new Float32Array(BRUSH_GRID_SIZE * BRUSH_GRID_SIZE);
      brushMapRef.current = initialMap;
      bgMaskMapRef.current = emptyBg;
      setBrushMap(initialMap);
      setBgMaskMap(emptyBg);
      setParams((prev) => ({ ...prev, unifySampleRgb: null }));
      setUndoStack([]);
      setBrushVersion((v) => v + 1);
      setHighlightPbnIndex(null);
    };
    img.src = sample.src;
  }, []);

  // Load default Australian Shepherd sample immediately on mount
  useEffect(() => {
    loadSamplePortrait(SAMPLE_PORTRAITS[0], MESSAGES[detectInitialLocale()].samples.aussie.name);
  }, [loadSamplePortrait]);

  // Load user-uploaded File
  const handleFileUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!dataUrl) return;
      const img = new Image();
      img.onload = () => {
        setActiveSampleId('custom');
        setImageLabel(file.name.replace(/\.[^/.]+$/, ''));
        setLoadedImage(img);
        const blankMap = new Float32Array(BRUSH_GRID_SIZE * BRUSH_GRID_SIZE);
        const blankBg = new Float32Array(BRUSH_GRID_SIZE * BRUSH_GRID_SIZE);
        brushMapRef.current = blankMap;
        bgMaskMapRef.current = blankBg;
        setBrushMap(blankMap);
        setBgMaskMap(blankBg);
        setParams((prev) => ({ ...prev, unifySampleRgb: null }));
        setUndoStack([]);
        setBrushVersion((v) => v + 1);
        setHighlightPbnIndex(null);
        setSplitCompare(false);
        studioSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, []);

  // Rebuild cropped working pixel buffer when image or aspect ratio changes
  useEffect(() => {
    if (!loadedImage) return;
    const { canvas, width, height, pixels } = buildCroppedWorkingCanvas(
      loadedImage,
      params.aspectRatio
    );
    setSourceCanvas(canvas);
    setWorkWidth(width);
    setWorkHeight(height);
    pixelsRef.current = pixels;
  }, [loadedImage, params.aspectRatio]);

  // Dispatch debounced Web Worker triangulation whenever inputs change
  const scheduleCompute = useCallback(
    (delayMs: number) => {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = window.setTimeout(() => {
        const worker = workerRef.current;
        const pixels = pixelsRef.current;
        if (!worker || !pixels || workWidth <= 0 || workHeight <= 0) return;

        const nextId = requestIdRef.current + 1;
        requestIdRef.current = nextId;
        setIsComputing(true);

        const req: WorkerRequest = {
          requestId: nextId,
          width: workWidth,
          height: workHeight,
          pixels,
          brushMap: new Float32Array(brushMapRef.current),
          bgMaskMap: new Float32Array(bgMaskMapRef.current),
          brushWidth: BRUSH_GRID_SIZE,
          brushHeight: BRUSH_GRID_SIZE,
          params,
          computePbn: mode === 'pbn',
        };

        worker.postMessage(req);
      }, delayMs);
    },
    [workWidth, workHeight, params, mode]
  );

  useEffect(() => {
    if (!sourceCanvas) return;
    scheduleCompute(55);
  }, [sourceCanvas, params, mode, brushVersion, scheduleCompute]);

  // Brush stroke handlers (Pointer Events on StudioCanvas)
  const handleBrushStrokeStart = useCallback(() => {
    eraseSeedLabRef.current = null;
    lastPaintPosRef.current = null;
    setUndoStack((prev) => [
      ...prev.slice(-14),
      {
        brush: new Float32Array(brushMapRef.current),
        bgMask: new Float32Array(bgMaskMapRef.current),
      },
    ]);
  }, []);

  const handleBrushPaint = useCallback(
    (normX: number, normY: number, polarity: BrushPolarity) => {
      if (brushTool === 'none') return;

      const rad = activeBrushRadiusNorm * BRUSH_GRID_SIZE;
      const radSq = rad * rad;

      // Interpolate between previous pointer sample and current sample for smooth continuous strokes
      const prev = lastPaintPosRef.current;
      const distNorm = prev ? Math.hypot(normX - prev.x, normY - prev.y) : 0;
      const stepNorm = Math.max(0.004, activeBrushRadiusNorm * 0.35);
      const steps = prev ? Math.max(1, Math.min(24, Math.ceil(distNorm / stepNorm))) : 1;
      lastPaintPosRef.current = { x: normX, y: normY };

      const stampAt = (sxNorm: number, syNorm: number) => {
        const cx = sxNorm * BRUSH_GRID_SIZE;
        const cy = syNorm * BRUSH_GRID_SIZE;

        const minX = Math.max(0, Math.floor(cx - rad));
        const maxX = Math.min(BRUSH_GRID_SIZE - 1, Math.ceil(cx + rad));
        const minY = Math.max(0, Math.floor(cy - rad));
        const maxY = Math.min(BRUSH_GRID_SIZE - 1, Math.ceil(cy + rad));

        if (brushTool === 'unifyBg') {
          const bgMap = bgMaskMapRef.current;

          if (polarity === 'subtract') {
            // Black mask: smoothly feather/deselect any part of the selected zone back to neutral
            // (or smoothly protect pet edges if Auto detect is enabled)
            for (let y = minY; y <= maxY; y++) {
              for (let x = minX; x <= maxX; x++) {
                const dx = x - cx;
                const dy = y - cy;
                const distSq = dx * dx + dy * dy;
                if (distSq >= radSq) continue;
                const falloff = Math.cos((Math.sqrt(distSq) / rad) * (Math.PI / 2));
                const idx = y * BRUSH_GRID_SIZE + x;
                if (params.unifyBackground) {
                  bgMap[idx] = Math.min(1, bgMap[idx] + falloff * 0.65);
                } else if (bgMap[idx] < 0) {
                  bgMap[idx] = Math.min(0, bgMap[idx] + falloff * 0.68);
                }
              }
            }
            return;
          }

          const pixels = pixelsRef.current;

          // Sample clicked local color at stroke start so the selective brush gently hugs
          // matching exterior tones without spilling harshly into the pet's fur
          if (!eraseSeedLabRef.current && pixels && workWidth > 0 && workHeight > 0) {
            const sx = Math.min(workWidth - 1, Math.max(0, Math.round(sxNorm * workWidth)));
            const sy = Math.min(workHeight - 1, Math.max(0, Math.round(syNorm * workHeight)));
            let sr = 0;
            let sg = 0;
            let sb = 0;
            let sc = 0;
            for (let oy = -2; oy <= 2; oy++) {
              const py = Math.min(workHeight - 1, Math.max(0, sy + oy));
              for (let ox = -2; ox <= 2; ox++) {
                const px = Math.min(workWidth - 1, Math.max(0, sx + ox));
                const off = (py * workWidth + px) * 4;
                sr += pixels[off];
                sg += pixels[off + 1];
                sb += pixels[off + 2];
                sc++;
              }
            }
            const sampledRgb = {
              r: Math.round(sr / sc),
              g: Math.round(sg / sc),
              b: Math.round(sb / sc),
            };
            eraseSeedLabRef.current = rgbToLab(sampledRgb.r, sampledRgb.g, sampledRgb.b);
            pendingSampleRgbRef.current = sampledRgb;
          }

          const seedLab = eraseSeedLabRef.current;
          const innerCoreSq = (rad * 0.3) * (rad * 0.3);

          for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
              const dx = x - cx;
              const dy = y - cy;
              const distSq = dx * dx + dy * dy;
              if (distSq >= radSq) continue;

              const radial = Math.cos((Math.sqrt(distSq) / rad) * (Math.PI / 2));
              let colorSim = 1;

              if (seedLab && pixels && distSq > innerCoreSq) {
                const px = Math.min(workWidth - 1, Math.max(0, Math.floor(((x + 0.5) / BRUSH_GRID_SIZE) * workWidth)));
                const py = Math.min(workHeight - 1, Math.max(0, Math.floor(((y + 0.5) / BRUSH_GRID_SIZE) * workHeight)));
                const off = (py * workWidth + px) * 4;
                const cellLab = rgbToLab(pixels[off], pixels[off + 1], pixels[off + 2]);
                const dLab = Math.sqrt(labDistanceSq(cellLab, seedLab));
                // Smooth feathered color similarity gate (18 -> 1.0, 38 -> 0.0)
                if (dLab >= 38) continue;
                if (dLab > 18) colorSim = (38 - dLab) / 20;
              }

              const idx = y * BRUSH_GRID_SIZE + x;
              bgMap[idx] = Math.max(-1, bgMap[idx] - radial * colorSim * 0.42);
            }
          }
          return;
        }

        const map = brushMapRef.current;

        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x++) {
            const dx = x - cx;
            const dy = y - cy;
            const distSq = dx * dx + dy * dy;
            if (distSq >= radSq) continue;

            const falloff = Math.cos((Math.sqrt(distSq) / rad) * (Math.PI / 2));
            const idx = y * BRUSH_GRID_SIZE + x;

            if (polarity === 'subtract') {
              // Black mask: cleanly deselect part of the active tool's zone back toward neutral (0)
              // without flipping into the opposite effect!
              const eraseAmt = falloff * 0.65;
              if (brushTool === 'detail' && map[idx] > 0) {
                map[idx] = Math.max(0, map[idx] - eraseAmt);
              } else if (brushTool === 'simplify' && map[idx] < 0) {
                map[idx] = Math.min(0, map[idx] + eraseAmt);
              }
            } else {
              // White mask: add / expand the active tool's selection
              const direction = brushTool === 'detail' ? 1 : -1;
              const delta = direction * falloff * 0.42;
              map[idx] = Math.max(-1, Math.min(1, map[idx] + delta));
            }
          }
        }
      };

      for (let s = 1; s <= steps; s++) {
        const u = s / steps;
        const ix = prev ? prev.x + (normX - prev.x) * u : normX;
        const iy = prev ? prev.y + (normY - prev.y) * u : normY;
        stampAt(ix, iy);
      }

      if (brushTool === 'unifyBg') {
        setBgMaskMap(new Float32Array(bgMaskMapRef.current));
      } else {
        setBrushMap(new Float32Array(brushMapRef.current));
      }
    },
    [brushTool, activeBrushRadiusNorm, workWidth, workHeight, params.unifyBackground]
  );

  const handleBrushStrokeEnd = useCallback(() => {
    eraseSeedLabRef.current = null;
    lastPaintPosRef.current = null;
    if (pendingSampleRgbRef.current) {
      const sampled = pendingSampleRgbRef.current;
      pendingSampleRgbRef.current = null;
      setParams((prev) => ({ ...prev, unifySampleRgb: sampled }));
    }
    setBrushVersion((v) => v + 1);
  }, []);

  const handleUndoBrush = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      brushMapRef.current = new Float32Array(last.brush);
      bgMaskMapRef.current = new Float32Array(last.bgMask);
      setBrushMap(new Float32Array(last.brush));
      setBgMaskMap(new Float32Array(last.bgMask));
      setBrushVersion((v) => v + 1);
      return prev.slice(0, -1);
    });
  }, []);

  const handleClearBrush = useCallback(() => {
    setUndoStack((prev) => [
      ...prev.slice(-14),
      {
        brush: new Float32Array(brushMapRef.current),
        bgMask: new Float32Array(bgMaskMapRef.current),
      },
    ]);
    const emptyBrush = new Float32Array(BRUSH_GRID_SIZE * BRUSH_GRID_SIZE);
    const emptyBg = new Float32Array(BRUSH_GRID_SIZE * BRUSH_GRID_SIZE);
    brushMapRef.current = emptyBrush;
    bgMaskMapRef.current = emptyBg;
    setBrushMap(emptyBrush);
    setBgMaskMap(emptyBg);
    setParams((prev) => ({ ...prev, unifySampleRgb: null }));
    setBrushVersion((v) => v + 1);
  }, []);

  const handleParamsChange = useCallback((patch: Partial<StudioParams>) => {
    setParams((prev) => ({ ...prev, ...patch }));
  }, []);

  // Backup active session into IndexedDB before opening export center
  const handleOpenExportModal = useCallback(() => {
    if (sourceCanvas) {
      const dataUrl = sourceCanvas.toDataURL('image/jpeg', 0.85);
      void saveProjectToIndexedDB({
        imageDataUrl: dataUrl,
        imageLabel,
        brushMap: Array.from(brushMapRef.current),
        bgMaskMap: Array.from(bgMaskMapRef.current),
        brushWidth: BRUSH_GRID_SIZE,
        brushHeight: BRUSH_GRID_SIZE,
        params,
        mode,
        frameGrid: frameGridId,
        gutterPercent,
        frameFinish,
        savedAt: Date.now(),
      });
    }
    setExportModalOpen(true);
  }, [sourceCanvas, imageLabel, params, mode, frameGridId, gutterPercent, frameFinish]);

  // Export handlers
  const handleDownloadPreview = useCallback(() => {
    void downloadPreviewPng(triangles, workWidth, workHeight, mode, params.showMesh);
  }, [triangles, workWidth, workHeight, mode, params.showMesh]);

  const handleDownloadStory = useCallback(() => {
    void downloadStoryPng(
      triangles,
      workWidth,
      workHeight,
      mode,
      params.showMesh,
      t.studio.storySignature
    );
  }, [triangles, workWidth, workHeight, mode, params.showMesh, t.studio.storySignature]);

  const handleExportSvg = useCallback(() => {
    downloadMasterSvg(triangles, workWidth, workHeight, mode, params.showMesh);
  }, [triangles, workWidth, workHeight, mode, params.showMesh]);

  const handleExportPng300 = useCallback(async () => {
    await downloadMasterPng300Dpi(triangles, workWidth, workHeight, mode, params.showMesh);
  }, [triangles, workWidth, workHeight, mode, params.showMesh]);

  const handleExportPbnPdf = useCallback(async () => {
    // If user triggers PBN PDF while in Color/Multiframe mode, compute exact CIE Lab K-Means on the spot
    let trisToExport = triangles;
    let paletteToExport = pbnPalette;
    if (paletteToExport.length === 0 && triangles.length > 0) {
      const cloned = triangles.map((tri) => ({ ...tri }));
      const computed = quantizePaintByNumbers(cloned, params.pbnColors, params.seed);
      trisToExport = computed.triangles;
      paletteToExport = computed.palette;
    }
    downloadPaintByNumbersPdf(trisToExport, workWidth, workHeight, paletteToExport, locale);
  }, [triangles, pbnPalette, params.pbnColors, params.seed, workWidth, workHeight, locale]);

  const handleExportMultiFramePdf = useCallback(() => {
    downloadMultiFramePdf(
      triangles,
      workWidth,
      workHeight,
      activeGridPreset,
      gutterPercent,
      params.showMesh,
      locale
    );
  }, [triangles, workWidth, workHeight, activeGridPreset, gutterPercent, params.showMesh, locale]);

  const triggerFileInput = () => fileInputRef.current?.click();

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F7F4] text-[#18181B]">
      {/* Hidden shared file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file);
          e.target.value = '';
        }}
      />

      {/* TOP BAR CONTRACT: Exact 3 zones (Single Brand Wordmark — Clean Nav Links — 1 Primary Action) */}
      <header className="sticky top-0 z-30 bg-[#F8F7F4]/95 backdrop-blur-xs border-b border-[#E4E2DC]">
        <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          <a
            href="#studio"
            className="font-editorial text-xl font-semibold tracking-tight text-[#18181B] whitespace-nowrap shrink-0"
          >
            PolyPet Studio
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#52525B]">
            <a
              href="#studio"
              className="hover:text-[#18181B] transition-colors whitespace-nowrap shrink-0"
            >
              {t.nav.studio}
            </a>
            <a
              href="#formats"
              className="hover:text-[#18181B] transition-colors whitespace-nowrap shrink-0"
            >
              {t.nav.modes}
            </a>
            <a
              href="#pricing"
              className="hover:text-[#18181B] transition-colors whitespace-nowrap shrink-0"
            >
              {t.nav.pricing}
            </a>
          </nav>

          <button
            type="button"
            onClick={triggerFileInput}
            className="px-4 py-2 rounded-lg bg-[#C2410C] hover:bg-[#9A3412] text-white text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Upload className="w-4 h-4 shrink-0" />
            <span>{t.nav.uploadCta}</span>
          </button>
        </div>
      </header>

      <main className="flex-1">
        {/* COMPACT EDITORIAL HEADER + LIVE INTERACTIVE STUDIO */}
        <section
          id="studio"
          ref={studioSectionRef}
          className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8 pt-7 pb-14"
        >
          {/* Compact Editorial Intro */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 pb-6 border-b border-[#E4E2DC]">
            <div className="max-w-2xl">
              <p className="text-xs font-medium text-[#71717A] mb-2">{t.hero.kicker}</p>
              <h1 className="text-3xl sm:text-4xl font-medium tracking-tight text-[#18181B] text-balance leading-[1.12]">
                {t.hero.title}
              </h1>
              <p className="mt-2.5 text-sm sm:text-[15px] text-[#52525B] leading-relaxed max-w-xl">
                {t.hero.subtitle}
              </p>
            </div>

            {/* Instant sample portraits selector */}
            <div className="flex flex-col sm:items-end gap-2 shrink-0">
              <span className="text-xs text-[#71717A]">{t.hero.trySampleLabel}</span>
              <div className="flex items-center gap-2">
                {SAMPLE_PORTRAITS.map((sample) => {
                  const meta = t.samples[sample.id];
                  const active = activeSampleId === sample.id;
                  return (
                    <button
                      key={sample.id}
                      type="button"
                      onClick={() => loadSamplePortrait(sample, meta.name)}
                      className={`group flex items-center gap-2 pr-3 pl-1 py-1 rounded-lg border text-left transition-colors cursor-pointer ${
                        active
                          ? 'border-[#C2410C] bg-white'
                          : 'border-[#E4E2DC] bg-white/70 hover:border-[#A1A1AA]'
                      }`}
                    >
                      <img
                        src={sample.src}
                        alt={meta.name}
                        referrerPolicy="no-referrer"
                        className="w-8 h-10 object-cover rounded-sm bg-[#E4E2DC] shrink-0"
                      />
                      <div className="hidden sm:block leading-tight">
                        <div className="text-xs font-semibold text-[#18181B] whitespace-nowrap">
                          {meta.name}
                        </div>
                        <div className="text-[11px] text-[#71717A] whitespace-nowrap">
                          {meta.tag}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* WORKSPACE TOOLBAR: Mode Tabs + Canvas Compare Controls + ES/EN/FR Switcher */}
          <div className="mt-5 mb-4 flex flex-wrap items-center justify-between gap-3">
            {/* Mode Switcher Tabs */}
            <div
              className="flex items-center gap-1 p-1 bg-[#ECEAE4] rounded-lg"
              role="tablist"
              aria-label="Studio modes"
            >
              {(
                [
                  { id: 'color', label: t.studio.modeColor },
                  { id: 'pbn', label: t.studio.modePbn },
                  { id: 'multiframe', label: t.studio.modeMultiframe },
                ] as { id: StudioMode; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={mode === tab.id}
                  onClick={() => {
                    setMode(tab.id);
                    if (tab.id !== 'color') setSplitCompare(false);
                    if (tab.id !== 'pbn') setHighlightPbnIndex(null);
                  }}
                  className={`px-3.5 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    mode === tab.id
                      ? 'bg-white text-[#18181B] shadow-xs'
                      : 'text-[#52525B] hover:text-[#18181B]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Right Workspace Utilities: Compare Original, Split Curtain, Triangle Count, Language */}
            <div className="flex flex-wrap items-center gap-2">
              {mode !== 'multiframe' && (
                <>
                  <button
                    type="button"
                    onPointerDown={() => setShowOriginal(true)}
                    onPointerUp={() => setShowOriginal(false)}
                    onPointerLeave={() => setShowOriginal(false)}
                    onPointerCancel={() => setShowOriginal(false)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer select-none ${
                      showOriginal
                        ? 'border-[#18181B] bg-[#18181B] text-white'
                        : 'border-[#E4E2DC] bg-white text-[#3F3F46] hover:border-[#A1A1AA]'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5 shrink-0" />
                    <span>{t.studio.holdOriginal}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSplitCompare((prev) => !prev)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                      splitCompare
                        ? 'border-[#C2410C] bg-[#C2410C]/10 text-[#9A3412]'
                        : 'border-[#E4E2DC] bg-white text-[#3F3F46] hover:border-[#A1A1AA]'
                    }`}
                  >
                    <Columns2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{t.studio.splitCompare}</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={triggerFileInput}
                className="px-3 py-1.5 rounded-lg border border-[#E4E2DC] bg-white hover:border-[#A1A1AA] text-xs font-medium text-[#3F3F46] transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 shrink-0" />
                <span>{t.studio.changePhoto}</span>
              </button>

              {/* Subtle Language Switcher (ES / EN / FR) */}
              <div className="flex items-center gap-0.5 p-0.5 bg-[#ECEAE4] rounded-md ml-1">
                {(['es', 'en', 'fr'] as Locale[]).map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => setLocale(loc)}
                    className={`px-2 py-1 rounded-xs text-[11px] font-semibold uppercase transition-colors cursor-pointer ${
                      locale === loc
                        ? 'bg-white text-[#18181B] shadow-2xs'
                        : 'text-[#71717A] hover:text-[#18181B]'
                    }`}
                  >
                    {loc}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* TWO-ZONE STUDIO GRID: Sticky Portrait Stage + Zero-Scroll Tabbed Inspector */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
            <div className="lg:col-span-8 flex flex-col sticky top-16 lg:top-20 z-20 bg-[#F8F7F4] pb-2 lg:pb-0">
              {mode === 'multiframe' ? (
                <FrameWallPreview
                  triangles={triangles}
                  workWidth={workWidth}
                  workHeight={workHeight}
                  grid={activeGridPreset}
                  gutterPercent={gutterPercent}
                  frameFinish={frameFinish}
                  showMesh={params.showMesh}
                />
              ) : (
                <StudioCanvas
                  triangles={triangles}
                  workWidth={workWidth}
                  workHeight={workHeight}
                  sourceCanvas={sourceCanvas}
                  brushMap={brushMap}
                  bgMaskMap={bgMaskMap}
                  brushWidth={BRUSH_GRID_SIZE}
                  brushHeight={BRUSH_GRID_SIZE}
                  brushTool={brushTool}
                  brushPolarity={brushPolarity}
                  brushRadiusNorm={activeBrushRadiusNorm}
                  showBrushMask={showBrushMask}
                  mode={mode}
                  showMesh={params.showMesh}
                  pbnShowColorRef={pbnShowColorRef}
                  highlightPbnIndex={highlightPbnIndex}
                  showOriginal={showOriginal}
                  splitCompare={splitCompare}
                  splitPos={splitPos}
                  onSplitPosChange={setSplitPos}
                  onBrushStrokeStart={handleBrushStrokeStart}
                  onBrushPaint={handleBrushPaint}
                  onBrushStrokeEnd={handleBrushStrokeEnd}
                  onFileDrop={handleFileUpload}
                  dropHintText={t.studio.dropHint}
                />
              )}

              {/* Quiet unboxed metadata line below canvas */}
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-[#71717A]">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[#3F3F46]">{imageLabel}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    {triangles.length.toLocaleString()} {t.studio.trianglesUnit}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    {workWidth} × {workHeight}
                  </span>
                </div>
                {isComputing && <span className="text-[#C2410C]">{t.studio.recalculating}…</span>}
              </div>

              {/* Paint by Numbers Interactive Palette Bar */}
              {mode === 'pbn' && (
                <PbnPaletteBar
                  palette={pbnPalette}
                  highlightIndex={highlightPbnIndex}
                  onSelectHighlight={setHighlightPbnIndex}
                  t={t.studio}
                />
              )}
            </div>

            {/* Right Zero-Scroll Studio Controls Inspector */}
            <div className="lg:col-span-4 lg:sticky lg:top-20">
              <ControlSidebar
                mode={mode}
                params={params}
                brushTool={brushTool}
                brushPolarity={brushPolarity}
                detailBrushRadiusNorm={detailBrushRadiusNorm}
                bgBrushRadiusNorm={bgBrushRadiusNorm}
                showBrushMask={showBrushMask}
                canUndo={undoStack.length > 0}
                hasBrushStrokes={hasBrushStrokes}
                hasDetailStrokes={hasDetailStrokes}
                unifyBgActive={unifyBgActive}
                pbnShowColorRef={pbnShowColorRef}
                frameGrid={frameGridId}
                gutterPercent={gutterPercent}
                frameFinish={frameFinish}
                t={t}
                onParamsChange={handleParamsChange}
                onBrushToolChange={setBrushTool}
                onBrushPolarityChange={setBrushPolarity}
                onDetailBrushRadiusChange={setDetailBrushRadiusNorm}
                onBgBrushRadiusChange={setBgBrushRadiusNorm}
                onToggleBrushMask={() => setShowBrushMask((v) => !v)}
                onUndoBrush={handleUndoBrush}
                onClearBrush={handleClearBrush}
                onTogglePbnRef={setPbnShowColorRef}
                onFrameGridChange={setFrameGridId}
                onGutterChange={setGutterPercent}
                onFrameFinishChange={setFrameFinish}
                onDownloadPreview={handleDownloadPreview}
                onDownloadStory={handleDownloadStory}
                onOpenExportModal={handleOpenExportModal}
              />
            </div>
          </div>
        </section>

        {/* SECTION 2: THREE EDITIONS FROM ONE GEOMETRIC ENGINE */}
        <section id="formats" className="border-t border-[#E4E2DC] bg-white">
          <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
            <div className="max-w-2xl">
              <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-[#18181B] text-balance">
                {t.showcase.heading}
              </h2>
              <p className="mt-3 text-sm sm:text-base text-[#52525B] leading-relaxed">
                {t.showcase.subheading}
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-8">
              {t.showcase.items.map((item, idx) => {
                const targetMode: StudioMode = idx === 0 ? 'color' : idx === 1 ? 'pbn' : 'multiframe';
                return (
                  <div
                    key={item.index}
                    className="flex flex-col justify-between pt-6 border-t border-[#E4E2DC]"
                  >
                    <div>
                      <div className="text-sm font-mono tabular-nums text-[#C2410C] font-medium">
                        {item.index}
                      </div>
                      <h3 className="mt-2 font-editorial text-xl font-medium text-[#18181B]">
                        {item.title}
                      </h3>
                      <p className="mt-2.5 text-sm text-[#52525B] leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                    <div className="mt-6 flex items-center justify-between gap-4">
                      <span className="text-xs text-[#71717A]">{item.detail}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setMode(targetMode);
                          studioSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="text-xs font-semibold text-[#C2410C] hover:text-[#9A3412] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        {t.nav.studio} →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* SECTION 3: TRANSPARENT DIGITAL PRINT EDITIONS */}
        <section id="pricing" className="border-t border-[#E4E2DC] bg-[#F8F7F4]">
          <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
            <div className="max-w-2xl">
              <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-[#18181B] text-balance">
                {t.pricing.heading}
              </h2>
              <p className="mt-3 text-sm sm:text-base text-[#52525B] leading-relaxed">
                {t.pricing.subheading}
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
              {t.pricing.tiers.map((tier) => {
                const featured = tier.id === 'bundle';
                return (
                  <div
                    key={tier.id}
                    className={`flex flex-col justify-between rounded-xl p-6 border bg-white ${
                      featured ? 'border-[#C2410C]' : 'border-[#E4E2DC]'
                    }`}
                  >
                    <div>
                      <div className="flex items-baseline justify-between gap-4">
                        <h3 className="font-editorial text-xl font-medium text-[#18181B]">
                          {tier.name}
                        </h3>
                        <span className="text-2xl font-semibold font-mono tabular-nums text-[#18181B]">
                          {tier.price}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs text-[#71717A]">
                        {t.pricing.oneTime} · {tier.tagline}
                      </p>

                      <ul className="mt-6 space-y-2.5 text-sm text-[#3F3F46]">
                        {tier.features.map((feat) => (
                          <li key={feat} className="flex items-start gap-2.5">
                            <span
                              aria-hidden="true"
                              className="text-[#C2410C] font-semibold leading-5"
                            >
                              —
                            </span>
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      type="button"
                      onClick={handleOpenExportModal}
                      className={`mt-8 w-full py-2.5 px-4 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                        featured
                          ? 'bg-[#C2410C] hover:bg-[#9A3412] text-white'
                          : 'border border-[#E4E2DC] hover:border-[#18181B] text-[#18181B]'
                      }`}
                    >
                      {t.pricing.selectPlan}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      {/* QUIET EDITORIAL FOOTER */}
      <footer className="border-t border-[#E4E2DC] bg-white">
        <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#71717A]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-editorial text-sm font-semibold text-[#18181B]">
              PolyPet Studio
            </span>
            <span aria-hidden="true">·</span>
            <span>{t.footer.tagline}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span>{t.footer.privacy}</span>
            <span aria-hidden="true">·</span>
            <span>{t.footer.copyright}</span>
          </div>
        </div>
      </footer>

      {/* EXPORT & PRINTIFY MODAL */}
      <ExportModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        t={t}
        frameGrid={frameGridId}
        frameFinish={frameFinish}
        hasPbnData={pbnPalette.length > 0}
        onExportSvg={handleExportSvg}
        onExportPng300={handleExportPng300}
        onExportPbnPdf={handleExportPbnPdf}
        onExportMultiFramePdf={handleExportMultiFramePdf}
      />
    </div>
  );
}
