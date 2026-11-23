import React, { useEffect, useRef } from 'react';
import { renderTrianglesToCanvas } from '../engine/renderer';
import type { FrameFinish, FrameGridPreset, TriangleData } from '../engine/types';

interface FrameWallPreviewProps {
  triangles: TriangleData[];
  workWidth: number;
  workHeight: number;
  grid: FrameGridPreset;
  gutterPercent: number;
  frameFinish: FrameFinish;
  showMesh: boolean;
}

const FRAME_STYLES: Record<
  FrameFinish,
  { borderClass: string; matPadding: string; outerBg: string }
> = {
  oak: {
    borderClass: 'border-[6px] sm:border-[8px] border-[#B68D60] ring-1 ring-inset ring-[#8C6842]/40',
    matPadding: 'p-[5px] sm:p-[7px] bg-[#FAF9F6]',
    outerBg: 'shadow-[0_14px_26px_rgba(24,24,27,0.22)]',
  },
  black: {
    borderClass: 'border-[6px] sm:border-[8px] border-[#1F1F23] ring-1 ring-inset ring-white/10',
    matPadding: 'p-[5px] sm:p-[7px] bg-[#FAF9F6]',
    outerBg: 'shadow-[0_14px_28px_rgba(24,24,27,0.28)]',
  },
  white: {
    borderClass: 'border-[6px] sm:border-[8px] border-[#FFFFFF] ring-1 ring-[#D4D1C9]',
    matPadding: 'p-[4px] sm:p-[6px] bg-[#F5F4F0]',
    outerBg: 'shadow-[0_12px_24px_rgba(24,24,27,0.16)]',
  },
  frameless: {
    borderClass: 'border border-black/5',
    matPadding: 'p-0 bg-transparent',
    outerBg: 'shadow-[0_12px_24px_rgba(24,24,27,0.18)]',
  },
};

export const FrameWallPreview: React.FC<FrameWallPreviewProps> = ({
  triangles,
  workWidth,
  workHeight,
  grid,
  gutterPercent,
  frameFinish,
  showMesh,
}) => {
  const tileCanvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  useEffect(() => {
    if (workWidth <= 0 || workHeight <= 0 || triangles.length === 0) return;

    // Render full source artwork once to an offscreen canvas, then slice with gutter compensation
    const masterScale = Math.min(1, 1100 / Math.max(workWidth, workHeight));
    const masterW = Math.max(20, Math.round(workWidth * masterScale));
    const masterH = Math.max(20, Math.round(workHeight * masterScale));

    const masterCanvas = document.createElement('canvas');
    masterCanvas.width = masterW;
    masterCanvas.height = masterH;
    const masterCtx = masterCanvas.getContext('2d');
    if (!masterCtx) return;

    renderTrianglesToCanvas(masterCtx, masterW, masterH, {
      triangles,
      width: workWidth,
      height: workHeight,
      mode: 'color',
      showMesh,
    });

    const gutterPx = Math.min(masterW, masterH) * (gutterPercent / 100);
    const tileSrcW = (masterW - gutterPx * (grid.cols - 1)) / grid.cols;
    const tileSrcH = (masterH - gutterPx * (grid.rows - 1)) / grid.rows;

    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        const idx = r * grid.cols + c;
        const tileCanvas = tileCanvasRefs.current[idx];
        if (!tileCanvas) continue;

        const outW = Math.max(10, Math.round(tileSrcW));
        const outH = Math.max(10, Math.round(tileSrcH));
        if (tileCanvas.width !== outW || tileCanvas.height !== outH) {
          tileCanvas.width = outW;
          tileCanvas.height = outH;
        }

        const tCtx = tileCanvas.getContext('2d');
        if (!tCtx) continue;
        tCtx.clearRect(0, 0, outW, outH);
        const sx = c * (tileSrcW + gutterPx);
        const sy = r * (tileSrcH + gutterPx);
        tCtx.drawImage(masterCanvas, sx, sy, tileSrcW, tileSrcH, 0, 0, outW, outH);
      }
    }
  }, [triangles, workWidth, workHeight, grid, gutterPercent, showMesh]);

  const finish = FRAME_STYLES[frameFinish];
  const aspect = workWidth > 0 && workHeight > 0 ? workWidth / workHeight : 0.75;
  const gapPx = Math.max(6, Math.round(8 + gutterPercent * 2.8));

  return (
    <div
      className="relative flex flex-col items-center justify-between w-full min-h-[300px] sm:min-h-[380px] lg:min-h-[520px] rounded-xl overflow-hidden px-5 pt-6 pb-0 sm:px-8 sm:pt-8"
      style={{
        background:
          'radial-gradient(ellipse at 50% 18%, #F3EFE8 0%, #E7E1D7 62%, #DDD6CA 100%)',
      }}
    >
      {/* Wall gallery grid */}
      <div className="flex-1 flex items-center justify-center w-full pb-8">
        <div
          className="grid w-full max-w-[500px] transition-all duration-200"
          style={{
            gridTemplateColumns: `repeat(${grid.cols}, minmax(0, 1fr))`,
            gap: `${gapPx}px`,
            maxWidth: aspect > 1.05 ? '560px' : '430px',
          }}
        >
          {Array.from({ length: grid.totalFrames }, (_, idx) => {
            const row = Math.floor(idx / grid.cols) + 1;
            const col = (idx % grid.cols) + 1;
            return (
              <div
                key={`${grid.id}-${idx}`}
                className={`relative rounded-[2px] transition-all duration-200 ${finish.borderClass} ${finish.matPadding} ${finish.outerBg}`}
              >
                <canvas
                  ref={(el) => {
                    tileCanvasRefs.current[idx] = el;
                  }}
                  className="block w-full h-auto"
                />
                {grid.totalFrames > 1 && (
                  <span className="pointer-events-none absolute bottom-1.5 right-1.5 text-[10px] font-mono tabular-nums text-[#18181B]/70 bg-white/80 px-1 py-0.5 rounded-xs">
                    {row}-{col}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Subtle architectural gallery sideboard / molding line for spatial scale */}
      <div className="w-full max-w-[680px] h-10 sm:h-12 bg-[#D3C6B4] border-t-4 border-[#BEA98E] rounded-t-xs shadow-[0_-6px_20px_rgba(24,24,27,0.08)] flex items-center justify-between px-8 opacity-90">
        <div className="w-16 h-1.5 rounded-full bg-[#B49F84]" />
        <div className="w-24 h-1.5 rounded-full bg-[#B49F84]" />
        <div className="w-16 h-1.5 rounded-full bg-[#B49F84]" />
      </div>
    </div>
  );
};
