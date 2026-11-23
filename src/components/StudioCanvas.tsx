import React, { useEffect, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { renderTrianglesToCanvas } from '../engine/renderer';
import type {
  BrushPolarity,
  BrushTool,
  StudioMode,
  TriangleData,
} from '../engine/types';

interface StudioCanvasProps {
  triangles: TriangleData[];
  workWidth: number;
  workHeight: number;
  sourceCanvas: HTMLCanvasElement | null;
  brushMap: Float32Array;
  bgMaskMap: Float32Array;
  brushWidth: number;
  brushHeight: number;
  brushTool: BrushTool;
  brushPolarity: BrushPolarity;
  brushRadiusNorm: number; // normalized 0.03 .. 0.16
  showBrushMask: boolean;
  mode: StudioMode;
  showMesh: boolean;
  pbnShowColorRef: boolean;
  highlightPbnIndex: number | null;
  showOriginal: boolean;
  splitCompare: boolean;
  splitPos: number; // 0..1
  onSplitPosChange: (pos: number) => void;
  onBrushStrokeStart: () => void;
  onBrushPaint: (normX: number, normY: number, polarity: BrushPolarity) => void;
  onBrushStrokeEnd: () => void;
  onFileDrop: (file: File) => void;
  dropHintText: string;
}

export const StudioCanvas: React.FC<StudioCanvasProps> = ({
  triangles,
  workWidth,
  workHeight,
  sourceCanvas,
  brushMap,
  bgMaskMap,
  brushWidth,
  brushHeight,
  brushTool,
  brushPolarity,
  brushRadiusNorm,
  showBrushMask,
  mode,
  showMesh,
  pbnShowColorRef,
  highlightPbnIndex,
  showOriginal,
  splitCompare,
  splitPos,
  onSplitPosChange,
  onBrushStrokeStart,
  onBrushPaint,
  onBrushStrokeEnd,
  onFileDrop,
  dropHintText,
}) => {
  const artCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isPainting, setIsPainting] = useState(false);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [altHeld, setAltHeld] = useState(false);

  // Track Alt key so holding Alt temporarily swaps White (+) <-> Black (−) like Photoshop
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Alt') setAltHeld(true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt') setAltHeld(false);
    };
    const onBlur = () => setAltHeld(false);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  const resolvePolarity = (altKey: boolean): BrushPolarity => {
    if (!altKey) return brushPolarity;
    return brushPolarity === 'add' ? 'subtract' : 'add';
  };

  // Render geometric artwork (or original photo / split curtain)
  useEffect(() => {
    const canvas = artCanvasRef.current;
    if (!canvas || workWidth <= 0 || workHeight <= 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const displayMax = 900;
    const scale = Math.min(1, displayMax / Math.max(workWidth, workHeight));
    const cssW = Math.round(workWidth * scale);
    const cssH = Math.round(workHeight * scale);

    const targetW = Math.round(cssW * dpr);
    const targetH = Math.round(cssH * dpr);

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (showOriginal && sourceCanvas) {
      ctx.clearRect(0, 0, targetW, targetH);
      ctx.drawImage(sourceCanvas, 0, 0, targetW, targetH);
      return;
    }

    renderTrianglesToCanvas(ctx, targetW, targetH, {
      triangles,
      width: workWidth,
      height: workHeight,
      mode,
      showMesh,
      pbnShowColorRef,
      highlightPbnIndex,
    });

    if (splitCompare && sourceCanvas) {
      const splitX = Math.round(targetW * splitPos);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, splitX, targetH);
      ctx.clip();
      ctx.drawImage(sourceCanvas, 0, 0, targetW, targetH);
      ctx.restore();

      // Clean vertical hairline divider
      ctx.save();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = Math.max(2, 2 * dpr);
      ctx.beginPath();
      ctx.moveTo(splitX, 0);
      ctx.lineTo(splitX, targetH);
      ctx.stroke();
      ctx.restore();
    }
  }, [
    triangles,
    workWidth,
    workHeight,
    sourceCanvas,
    mode,
    showMesh,
    pbnShowColorRef,
    highlightPbnIndex,
    showOriginal,
    splitCompare,
    splitPos,
  ]);

  const effectivePolarity = resolvePolarity(altHeld);
  const isSubtracting = effectivePolarity === 'subtract';
  const showMaskOverlay =
    isPainting || showBrushMask || (isSubtracting && cursorPos !== null && !splitCompare && !showOriginal && brushTool !== 'none');

  // Render translucent brush density map overlay while painting, hovering in subtract mode, or when Show Map is enabled
  useEffect(() => {
    const overlay = overlayCanvasRef.current;
    if (!overlay || brushWidth <= 0 || brushHeight <= 0) return;

    if (overlay.width !== brushWidth || overlay.height !== brushHeight) {
      overlay.width = brushWidth;
      overlay.height = brushHeight;
    }

    const ctx = overlay.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, brushWidth, brushHeight);

    if (!showMaskOverlay) return;

    const imgData = ctx.createImageData(brushWidth, brushHeight);
    const data = imgData.data;
    const isBgTool = brushTool === 'unifyBg';

    for (let i = 0; i < brushMap.length; i++) {
      const p = i * 4;
      const bgVal = bgMaskMap[i] ?? 0;

      if ((isBgTool || showBrushMask) && Math.abs(bgVal) > 0.04) {
        if (bgVal < 0) {
          // Selected subtle unification zone: smooth feathered studio blue overlay
          data[p] = 37;
          data[p + 1] = 99;
          data[p + 2] = 235;
          data[p + 3] = Math.round(Math.min(1, -bgVal) * (isPainting ? 120 : 88));
        } else {
          // Protected pet silhouette region: crisp teal overlay
          data[p] = 13;
          data[p + 1] = 148;
          data[p + 2] = 136;
          data[p + 3] = Math.round(Math.min(1, bgVal) * (isPainting ? 120 : 88));
        }
        continue;
      }

      const v = brushMap[i];
      if (Math.abs(v) < 0.04) continue;
      if (v > 0) {
        // Detail brush: warm terracotta highlight
        data[p] = 194;
        data[p + 1] = 65;
        data[p + 2] = 12;
        data[p + 3] = Math.round(Math.min(1, v) * (isPainting ? 105 : 80));
      } else {
        // Simplify brush: cool slate highlight
        data[p] = 71;
        data[p + 1] = 85;
        data[p + 2] = 105;
        data[p + 3] = Math.round(Math.min(1, -v) * (isPainting ? 105 : 80));
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }, [brushMap, bgMaskMap, brushWidth, brushHeight, brushTool, isPainting, showMaskOverlay]);

  const getNormalizedCoords = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return null;
    const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const ny = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    return { nx, ny, px: e.clientX - rect.left, py: e.clientY - rect.top, rectW: rect.width };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const coords = getNormalizedCoords(e);
    if (!coords) return;

    if (splitCompare) {
      e.currentTarget.setPointerCapture(e.pointerId);
      setIsDraggingSplit(true);
      onSplitPosChange(coords.nx);
      return;
    }

    if (brushTool === 'none' || showOriginal) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    setIsPainting(true);
    onBrushStrokeStart();
    onBrushPaint(coords.nx, coords.ny, resolvePolarity(e.altKey));
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const coords = getNormalizedCoords(e);
    if (!coords) return;

    setCursorPos({ x: coords.px, y: coords.py });

    if (isDraggingSplit && splitCompare) {
      onSplitPosChange(coords.nx);
      return;
    }

    if (isPainting && brushTool !== 'none') {
      onBrushPaint(coords.nx, coords.ny, resolvePolarity(e.altKey));
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingSplit) {
      setIsDraggingSplit(false);
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      return;
    }

    if (isPainting) {
      setIsPainting(false);
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      onBrushStrokeEnd();
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onFileDrop(file);
    }
  };

  const aspectRatioStyle =
    workWidth > 0 && workHeight > 0 ? `${workWidth} / ${workHeight}` : '3 / 4';

  const cursorSizePx = containerRef.current
    ? Math.max(18, brushRadiusNorm * 2 * Math.min(containerRef.current.clientWidth, containerRef.current.clientHeight))
    : 48;

  const canPaint = !splitCompare && !showOriginal && brushTool !== 'none';

  const cursorBorderColor = isSubtracting
    ? '#18181B'
    : brushTool === 'detail'
      ? '#C2410C'
      : brushTool === 'unifyBg'
        ? '#2563EB'
        : '#475569';

  const cursorBgColor = isSubtracting
    ? 'rgba(24, 24, 27, 0.14)'
    : brushTool === 'detail'
      ? 'rgba(194, 65, 12, 0.12)'
      : brushTool === 'unifyBg'
        ? 'rgba(37, 99, 235, 0.14)'
        : 'rgba(71, 85, 105, 0.12)';

  return (
    <div
      className="relative flex items-center justify-center w-full h-full min-h-[240px] sm:min-h-[340px] lg:min-h-[520px] bg-[#EFECE6] rounded-xl p-3 sm:p-5 select-none overflow-hidden"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div
        ref={containerRef}
        style={{ aspectRatio: aspectRatioStyle }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={() => setCursorPos(null)}
        className={`relative max-w-full max-h-[40vh] sm:max-h-[52vh] lg:max-h-[calc(100vh-13.5rem)] w-auto h-auto shadow-[0_14px_40px_rgba(24,24,27,0.12)] rounded-sm overflow-hidden bg-white touch-none ${
          splitCompare
            ? 'cursor-ew-resize'
            : canPaint
              ? 'cursor-none'
              : 'cursor-default'
        }`}
      >
        <canvas
          ref={artCanvasRef}
          className="block w-full h-full"
        />

        {/* Brush density visual overlay */}
        <canvas
          ref={overlayCanvasRef}
          className="pointer-events-none absolute inset-0 w-full h-full transition-opacity duration-150"
          style={{
            opacity: showMaskOverlay ? 1 : 0,
            imageRendering: 'auto',
          }}
        />

        {/* Interactive Split Curtain Handle */}
        {splitCompare && (
          <div
            className="pointer-events-none absolute top-0 bottom-0 flex items-center"
            style={{ left: `${splitPos * 100}%`, transform: 'translateX(-50%)' }}
          >
            <div className="w-8 h-8 rounded-full bg-white text-[#18181B] shadow-md border border-[#E4E2DC] flex items-center justify-center text-xs font-semibold">
              ↔
            </div>
          </div>
        )}

        {/* Crisp brush preview ring on desktop hover (Solid + for White/Add, Dashed − for Black/Subtract) */}
        {canPaint && cursorPos && (
          <div
            className={`pointer-events-none absolute rounded-full border-2 flex items-center justify-center transition-transform duration-75 ${
              isSubtracting ? 'border-dashed' : 'border-solid'
            }`}
            style={{
              width: `${cursorSizePx}px`,
              height: `${cursorSizePx}px`,
              left: `${cursorPos.x}px`,
              top: `${cursorPos.y}px`,
              transform: 'translate(-50%, -50%)',
              borderColor: cursorBorderColor,
              backgroundColor: cursorBgColor,
              boxShadow: isSubtracting
                ? '0 0 0 1px rgba(255,255,255,0.9)'
                : '0 0 0 1px rgba(255,255,255,0.65)',
            }}
          >
            <span
              className="w-4 h-4 rounded-full flex items-center justify-center text-[11px] font-bold leading-none shadow-2xs"
              style={{
                backgroundColor: isSubtracting ? '#18181B' : '#FFFFFF',
                color: isSubtracting ? '#FFFFFF' : cursorBorderColor,
              }}
            >
              {isSubtracting ? '−' : '+'}
            </span>
          </div>
        )}
      </div>

      {/* Drag & drop overlay */}
      {isDragOver && (
        <div className="pointer-events-none absolute inset-3 rounded-lg border-2 border-dashed border-[#C2410C] bg-[#F8F7F4]/90 flex flex-col items-center justify-center gap-2 text-[#18181B]">
          <Upload className="w-6 h-6 text-[#C2410C]" />
          <p className="text-sm font-medium">{dropHintText}</p>
        </div>
      )}
    </div>
  );
};
