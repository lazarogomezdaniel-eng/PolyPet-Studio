import React, { useEffect, useState } from 'react';
import {
  Download,
  Eraser,
  Eye,
  Grid2x2,
  Minus,
  PaintBucket,
  Paintbrush,
  Palette,
  Plus,
  RotateCcw,
  Share2,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { ARTISTIC_PALETTES, rgbToHex } from '../engine/palettes';
import {
  FRAME_GRID_PRESETS,
  type AspectRatioOption,
  type BrushPolarity,
  type BrushTool,
  type FrameFinish,
  type FrameGridId,
  type PaletteId,
  type PbnColorCount,
  type StudioMode,
  type StudioParams,
  type UnifyBgTone,
} from '../engine/types';
import type { Messages } from '../i18n/messages';

type InspectorTab = 'brushes' | 'geometry' | 'color' | 'frames';

interface ControlSidebarProps {
  mode: StudioMode;
  params: StudioParams;
  brushTool: BrushTool;
  brushPolarity: BrushPolarity;
  detailBrushRadiusNorm: number;
  bgBrushRadiusNorm: number;
  showBrushMask: boolean;
  canUndo: boolean;
  hasBrushStrokes: boolean;
  hasDetailStrokes: boolean;
  unifyBgActive: boolean;
  pbnShowColorRef: boolean;
  frameGrid: FrameGridId;
  gutterPercent: number;
  frameFinish: FrameFinish;
  t: Messages;
  onParamsChange: (patch: Partial<StudioParams>) => void;
  onBrushToolChange: (tool: BrushTool) => void;
  onBrushPolarityChange: (polarity: BrushPolarity) => void;
  onDetailBrushRadiusChange: (r: number) => void;
  onBgBrushRadiusChange: (r: number) => void;
  onToggleBrushMask: () => void;
  onUndoBrush: () => void;
  onClearBrush: () => void;
  onTogglePbnRef: (showRef: boolean) => void;
  onFrameGridChange: (id: FrameGridId) => void;
  onGutterChange: (pct: number) => void;
  onFrameFinishChange: (finish: FrameFinish) => void;
  onDownloadPreview: () => void;
  onDownloadStory: () => void;
  onOpenExportModal: () => void;
}

const ASPECT_OPTIONS: AspectRatioOption[] = ['original', '1:1', '4:5', '3:4', 'a4'];
const PALETTE_IDS: PaletteId[] = ['natural', 'editorial', 'pastel', 'popart', 'wpap', 'graphite'];
const PBN_COUNTS: PbnColorCount[] = [12, 16, 20];
const FINISH_OPTIONS: FrameFinish[] = ['oak', 'black', 'white', 'frameless'];
const UNIFY_TONE_OPTIONS: UnifyBgTone[] = ['exterior', 'white', 'paper', 'dark'];

export const ControlSidebar: React.FC<ControlSidebarProps> = ({
  mode,
  params,
  brushTool,
  brushPolarity,
  detailBrushRadiusNorm,
  bgBrushRadiusNorm,
  showBrushMask,
  canUndo,
  hasBrushStrokes,
  hasDetailStrokes,
  unifyBgActive,
  pbnShowColorRef,
  frameGrid,
  gutterPercent,
  frameFinish,
  t,
  onParamsChange,
  onBrushToolChange,
  onBrushPolarityChange,
  onDetailBrushRadiusChange,
  onBgBrushRadiusChange,
  onToggleBrushMask,
  onUndoBrush,
  onClearBrush,
  onTogglePbnRef,
  onFrameGridChange,
  onGutterChange,
  onFrameFinishChange,
  onDownloadPreview,
  onDownloadStory,
  onOpenExportModal,
}) => {
  const s = t.studio;
  const [activeTab, setActiveTab] = useState<InspectorTab>('brushes');

  // Keep the active inspector tab synchronized with the selected studio mode
  useEffect(() => {
    if (mode === 'multiframe') {
      setActiveTab('frames');
    } else if (mode === 'pbn') {
      setActiveTab((prev) => (prev === 'frames' || prev === 'color' ? 'geometry' : prev));
    } else {
      setActiveTab((prev) => (prev === 'frames' ? 'brushes' : prev));
    }
  }, [mode]);

  const tabs: { id: InspectorTab; label: string; icon: React.ReactNode }[] =
    mode === 'multiframe'
      ? [
          { id: 'frames', label: s.tabFrames, icon: <Grid2x2 className="w-3.5 h-3.5 shrink-0" /> },
          {
            id: 'geometry',
            label: s.tabGeometry,
            icon: <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />,
          },
          { id: 'color', label: s.tabColor, icon: <Palette className="w-3.5 h-3.5 shrink-0" /> },
        ]
      : mode === 'pbn'
        ? [
            {
              id: 'brushes',
              label: s.tabBrushes,
              icon: <Paintbrush className="w-3.5 h-3.5 shrink-0" />,
            },
            {
              id: 'geometry',
              label: s.tabPbn,
              icon: <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />,
            },
          ]
        : [
            {
              id: 'brushes',
              label: s.tabBrushes,
              icon: <Paintbrush className="w-3.5 h-3.5 shrink-0" />,
            },
            {
              id: 'geometry',
              label: s.tabGeometry,
              icon: <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />,
            },
            { id: 'color', label: s.tabColor, icon: <Palette className="w-3.5 h-3.5 shrink-0" /> },
          ];

  const densityLabelText =
    params.density < 750
      ? s.densityLow
      : params.density < 1450
        ? s.densityMed
        : s.densityHigh;

  const sampledHex = params.unifySampleRgb
    ? rgbToHex(params.unifySampleRgb.r, params.unifySampleRgb.g, params.unifySampleRgb.b)
    : null;

  const renderUnifyToneGrid = () => (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-[#52525B]">{s.bgFillLabel}</label>
      <div className="grid grid-cols-2 gap-1.5">
        {UNIFY_TONE_OPTIONS.map((opt) => {
          const active = params.unifyBgTone === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onParamsChange({ unifyBgTone: opt })}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                active
                  ? 'border-[#2563EB] bg-[#2563EB]/5 text-[#1D4ED8]'
                  : 'border-[#E4E2DC] text-[#3F3F46] hover:border-[#A1A1AA]'
              }`}
            >
              <span
                className="w-3.5 h-3.5 rounded-xs border border-black/15 shrink-0"
                style={
                  opt === 'exterior'
                    ? sampledHex
                      ? { backgroundColor: sampledHex }
                      : {
                          background:
                            'linear-gradient(135deg, #D8D2C7 0%, #94A3B8 50%, #E7E2D8 100%)',
                        }
                    : {
                        backgroundColor:
                          opt === 'white'
                            ? '#FFFFFF'
                            : opt === 'paper'
                              ? '#F3EFE7'
                              : '#1A1A1E',
                      }
                }
              />
              <span className="truncate">{t.unifyTones[opt]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <aside className="flex flex-col bg-white border border-[#E4E2DC] rounded-xl lg:max-h-[calc(100vh-5.75rem)] overflow-hidden">
      {/* PINNED TOP INSPECTOR TABS — Switch between Brushes / Geometry / Color with ZERO scrolling */}
      <div className="px-3.5 pt-3.5 pb-2.5 border-b border-[#E4E2DC] shrink-0 bg-white">
        <div
          className={`grid gap-1 p-1 bg-[#F4F3EE] rounded-lg ${
            tabs.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
          }`}
          role="tablist"
        >
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-white text-[#18181B] shadow-xs'
                    : 'text-[#52525B] hover:text-[#18181B]'
                }`}
              >
                {tab.icon}
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* COMPACT LIVE TOOL PANEL — Fits inside viewport alongside the sticky portrait */}
      <div className="p-4 flex-1 overflow-y-auto space-y-4">
        {/* TAB 1: BRUSHES & SILHOUETTE UNIFY */}
        {activeTab === 'brushes' && mode !== 'multiframe' && (
          <div className="space-y-3.5">
            {/* Compact Header Row: Title + Show Map + Undo + Clear */}
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[#52525B]">
                {s.brushDetail}
              </h3>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={onToggleBrushMask}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border transition-colors whitespace-nowrap cursor-pointer ${
                    showBrushMask
                      ? 'border-[#C2410C] text-[#C2410C] bg-[#C2410C]/5'
                      : 'border-[#E4E2DC] text-[#52525B] hover:text-[#18181B]'
                  }`}
                >
                  <Eye className="w-3 h-3" />
                  <span>{s.showBrushMask}</span>
                </button>
                <button
                  type="button"
                  onClick={onUndoBrush}
                  disabled={!canUndo}
                  title={s.undo}
                  className="p-1.5 rounded-md text-[#52525B] hover:text-[#18181B] hover:bg-[#F4F3EE] disabled:opacity-35 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onClearBrush}
                  disabled={!hasBrushStrokes}
                  title={s.clearStrokes}
                  className="p-1.5 rounded-md text-[#52525B] hover:text-[#18181B] hover:bg-[#F4F3EE] disabled:opacity-35 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 3 Focused Studio Brushes */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-[#F4F3EE] rounded-lg">
              <button
                type="button"
                onClick={() => onBrushToolChange(brushTool === 'detail' ? 'none' : 'detail')}
                className={`flex items-center justify-center gap-1 px-2 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  brushTool === 'detail'
                    ? 'bg-[#C2410C] text-white shadow-xs'
                    : 'text-[#52525B] hover:text-[#18181B]'
                }`}
              >
                <Paintbrush className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{s.brushDetailHint}</span>
              </button>
              <button
                type="button"
                onClick={() => onBrushToolChange(brushTool === 'simplify' ? 'none' : 'simplify')}
                className={`flex items-center justify-center gap-1 px-2 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  brushTool === 'simplify'
                    ? 'bg-[#334155] text-white shadow-xs'
                    : 'text-[#52525B] hover:text-[#18181B]'
                }`}
              >
                <Eraser className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{s.brushSimplify}</span>
              </button>
              <button
                type="button"
                onClick={() => onBrushToolChange(brushTool === 'unifyBg' ? 'none' : 'unifyBg')}
                className={`flex items-center justify-center gap-1 px-2 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  brushTool === 'unifyBg'
                    ? 'bg-[#2563EB] text-white shadow-xs'
                    : 'text-[#52525B] hover:text-[#18181B]'
                }`}
              >
                <PaintBucket className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{s.brushUnifyBg}</span>
              </button>
            </div>

            {/* Compact Pro-Studio Mask Polarity Bar: White (+) / Black (−) Discs + X Swap */}
            {brushTool !== 'none' && (
              <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-[#FAF9F6] border border-[#E4E2DC]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[11px] font-medium text-[#71717A] shrink-0">
                    {s.brushPolarityLabel}
                  </span>
                  <span className="text-[11px] text-[#D4D1C9]" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-[11px] font-semibold text-[#18181B] truncate">
                    {brushPolarity === 'add' ? s.brushPolarityAdd : s.brushPolaritySub}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <div
                    role="radiogroup"
                    aria-label={s.brushPolarityLabel}
                    className="inline-flex items-center gap-1 p-0.5 rounded-full bg-[#ECEAE4] border border-[#DFDDD6]"
                  >
                    <button
                      type="button"
                      role="radio"
                      aria-checked={brushPolarity === 'add'}
                      aria-label={s.brushPolarityAdd}
                      title={`${s.brushPolarityAdd} (X)`}
                      onClick={() => onBrushPolarityChange('add')}
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                        brushPolarity === 'add'
                          ? 'bg-white text-[#18181B] shadow-xs ring-[1.5px] ring-[#18181B]'
                          : 'bg-white/75 text-[#71717A] border border-[#C8C5BC] hover:bg-white hover:text-[#18181B]'
                      }`}
                    >
                      <Plus className="w-3 h-3 stroke-[2.5]" />
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={brushPolarity === 'subtract'}
                      aria-label={s.brushPolaritySub}
                      title={`${s.brushPolaritySub} (X · Alt)`}
                      onClick={() => onBrushPolarityChange('subtract')}
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                        brushPolarity === 'subtract'
                          ? 'bg-[#18181B] text-white shadow-xs ring-[1.5px] ring-[#18181B] ring-offset-1 ring-offset-[#ECEAE4]'
                          : 'bg-[#27272A]/70 text-white/75 hover:bg-[#18181B] hover:text-white'
                      }`}
                    >
                      <Minus className="w-3 h-3 stroke-[2.5]" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      onBrushPolarityChange(brushPolarity === 'add' ? 'subtract' : 'add')
                    }
                    title={s.brushPolarityHint}
                    aria-label={s.brushPolarityHint}
                    className="px-1.5 py-0.5 rounded border border-[#E4E2DC] bg-white hover:border-[#A1A1AA] text-[10px] font-mono text-[#71717A] hover:text-[#18181B] transition-colors cursor-pointer"
                  >
                    X
                  </button>
                </div>
              </div>
            )}

            {/* Contextual Brush Sliders — Always immediately visible with zero scrolling */}
            {brushTool === 'simplify' || brushTool === 'unifyBg' ? (
              <div className="space-y-3 pt-0.5">
                {brushTool === 'unifyBg' && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-xs font-semibold text-[#18181B]">
                        {s.unifyStrengthLabel}
                      </label>
                      <span className="text-xs font-mono tabular-nums text-[#2563EB]">
                        {params.unifyStrength}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={2}
                      value={params.unifyStrength}
                      onChange={(e) =>
                        onParamsChange({ unifyStrength: parseInt(e.target.value, 10) })
                      }
                      className="studio-slider w-full"
                      aria-label={s.unifyStrengthLabel}
                    />
                    <div className="flex items-center justify-between text-[11px] text-[#71717A]">
                      <span>{s.unifyStrengthLow}</span>
                      <span>{s.unifyStrengthHigh}</span>
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-medium text-[#52525B]">{s.otherBrushSize}</label>
                    <span className="text-xs font-mono tabular-nums text-[#18181B]">
                      {Math.round(bgBrushRadiusNorm * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.03}
                    max={0.22}
                    step={0.005}
                    value={bgBrushRadiusNorm}
                    onChange={(e) => onBgBrushRadiusChange(parseFloat(e.target.value))}
                    className="studio-slider w-full"
                    aria-label={s.otherBrushSize}
                  />
                </div>

                {brushTool === 'unifyBg' && (
                  <p className="text-[11px] text-[#71717A] leading-snug">{s.bgHint}</p>
                )}
              </div>
            ) : (
              <div className="space-y-3 pt-0.5">
                {/* Global Triangle Density Bar (affects entire portrait) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-medium text-[#52525B]">
                      {s.densityLabel}{' '}
                      <span className="font-normal text-[#71717A]">· {densityLabelText}</span>
                    </label>
                    <span className="text-xs font-mono tabular-nums text-[#52525B]">
                      {params.density} pts
                    </span>
                  </div>
                  <input
                    type="range"
                    min={250}
                    max={2200}
                    step={50}
                    value={params.density}
                    onChange={(e) =>
                      onParamsChange({ density: parseInt(e.target.value, 10) })
                    }
                    className="studio-slider w-full"
                    aria-label={s.densityLabel}
                  />
                </div>

                {/* LIVE Triangle Fineness Bar strictly for Eyes / Selected Detail Zone */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-semibold text-[#18181B]">
                      {s.detailTrianglesLabel}
                    </label>
                    <span className="text-xs font-mono tabular-nums text-[#C2410C]">
                      {params.detailIntensity}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={2}
                    value={params.detailIntensity}
                    onChange={(e) =>
                      onParamsChange({ detailIntensity: parseInt(e.target.value, 10) })
                    }
                    className="studio-slider w-full"
                    aria-label={s.detailTrianglesLabel}
                  />
                  <div className="flex items-center justify-between text-[11px] text-[#71717A]">
                    <span>{s.detailTrianglesScaleLow}</span>
                    <span>{s.detailTrianglesScaleHigh}</span>
                  </div>
                  {!hasDetailStrokes && (
                    <p className="text-[11px] text-[#C2410C]">{s.detailNoStrokesHint}</p>
                  )}
                </div>

                {/* Dedicated Eyes / Detail Brush Diameter Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-medium text-[#52525B] flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="inline-block rounded-full border border-[#C2410C] bg-[#C2410C]/15 shrink-0 transition-all"
                        style={{
                          width: `${Math.round(8 + (detailBrushRadiusNorm / 0.18) * 9)}px`,
                          height: `${Math.round(8 + (detailBrushRadiusNorm / 0.18) * 9)}px`,
                        }}
                      />
                      <span>{s.detailBrushSize}</span>
                    </label>
                    <span className="text-xs font-mono tabular-nums text-[#52525B]">
                      {Math.round(detailBrushRadiusNorm * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.015}
                    max={0.18}
                    step={0.005}
                    value={detailBrushRadiusNorm}
                    onChange={(e) => {
                      onDetailBrushRadiusChange(parseFloat(e.target.value));
                      if (brushTool !== 'detail') onBrushToolChange('detail');
                    }}
                    className="studio-slider w-full"
                    aria-label={s.detailBrushSize}
                  />
                </div>
              </div>
            )}

            {/* Selective Zone Tone & Optional Soft Auto-Detect */}
            <div className="pt-3 border-t border-[#E4E2DC] space-y-2.5">
              {(unifyBgActive || brushTool === 'unifyBg') && mode !== 'pbn' && renderUnifyToneGrid()}

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <PaintBucket className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
                  <span className="text-xs font-medium text-[#52525B]">{s.bgAutoToggle}</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={params.unifyBackground}
                  onClick={() => onParamsChange({ unifyBackground: !params.unifyBackground })}
                  className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors cursor-pointer ${
                    params.unifyBackground ? 'bg-[#2563EB]' : 'bg-[#D4D1C9]'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform mt-0.5 ${
                      params.unifyBackground ? 'translate-x-4.5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {params.unifyBackground && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <label className="text-[#52525B]">{s.bgToleranceLabel}</label>
                    <span className="font-mono tabular-nums text-[#18181B]">
                      {params.bgTolerance}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={88}
                    step={2}
                    value={params.bgTolerance}
                    onChange={(e) =>
                      onParamsChange({ bgTolerance: parseInt(e.target.value, 10) })
                    }
                    className="studio-slider w-full"
                    aria-label={s.bgToleranceLabel}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: GEOMETRY, ASPECT RATIO & PAINT BY NUMBERS */}
        {activeTab === 'geometry' && (
          <div className="space-y-4">
            {mode === 'pbn' && (
              <div className="space-y-2.5 pb-3.5 border-b border-[#E4E2DC]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#18181B]">{s.pbnColorsLabel}</label>
                  <span className="text-xs font-mono tabular-nums text-[#52525B]">
                    {params.pbnColors}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#F4F3EE] rounded-lg">
                  {PBN_COUNTS.map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => onParamsChange({ pbnColors: count })}
                      className={`py-1.5 rounded-md text-xs font-semibold font-mono tabular-nums transition-colors cursor-pointer ${
                        params.pbnColors === count
                          ? 'bg-white text-[#18181B] shadow-xs'
                          : 'text-[#52525B] hover:text-[#18181B]'
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => onTogglePbnRef(false)}
                    className={`px-2.5 py-2 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap cursor-pointer ${
                      !pbnShowColorRef
                        ? 'border-[#18181B] bg-[#18181B] text-white'
                        : 'border-[#E4E2DC] text-[#52525B] hover:text-[#18181B]'
                    }`}
                  >
                    {s.pbnLineArtToggle}
                  </button>
                  <button
                    type="button"
                    onClick={() => onTogglePbnRef(true)}
                    className={`px-2.5 py-2 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap cursor-pointer ${
                      pbnShowColorRef
                        ? 'border-[#18181B] bg-[#18181B] text-white'
                        : 'border-[#E4E2DC] text-[#52525B] hover:text-[#18181B]'
                    }`}
                  >
                    {s.pbnReferenceToggle}
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-[#18181B]">
                  {s.densityLabel}{' '}
                  <span className="font-normal text-[#71717A]">· {densityLabelText}</span>
                </label>
                <span className="font-mono tabular-nums text-[#18181B]">{params.density} pts</span>
              </div>
              <input
                type="range"
                min={250}
                max={2200}
                step={50}
                value={params.density}
                onChange={(e) => onParamsChange({ density: parseInt(e.target.value, 10) })}
                className="studio-slider w-full"
                aria-label={s.densityLabel}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-medium text-[#52525B]">{s.edgeLabel}</label>
                <span className="font-mono tabular-nums text-[#18181B]">
                  {params.edgeSensitivity}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={2}
                value={params.edgeSensitivity}
                onChange={(e) => onParamsChange({ edgeSensitivity: parseInt(e.target.value, 10) })}
                className="studio-slider w-full"
                aria-label={s.edgeLabel}
              />
            </div>

            {/* Aspect Ratio */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-medium text-[#52525B]">{s.aspectLabel}</label>
              <div className="flex flex-wrap gap-1.5">
                {ASPECT_OPTIONS.map((ar) => (
                  <button
                    key={ar}
                    type="button"
                    onClick={() => onParamsChange({ aspectRatio: ar })}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors whitespace-nowrap cursor-pointer ${
                      params.aspectRatio === ar
                        ? 'border-[#18181B] bg-[#18181B] text-white'
                        : 'border-[#E4E2DC] text-[#52525B] hover:text-[#18181B]'
                    }`}
                  >
                    {t.aspectRatios[ar]}
                  </button>
                ))}
              </div>
            </div>

            {/* Fine Mesh Wireframe Toggle */}
            {mode !== 'pbn' && (
              <label className="flex items-center justify-between pt-2 border-t border-[#E4E2DC] cursor-pointer">
                <span className="text-xs font-medium text-[#3F3F46]">{s.meshLabel}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={params.showMesh}
                  onClick={() => onParamsChange({ showMesh: !params.showMesh })}
                  className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors cursor-pointer ${
                    params.showMesh ? 'bg-[#C2410C]' : 'bg-[#D4D1C9]'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform mt-0.5 ${
                      params.showMesh ? 'translate-x-4.5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </label>
            )}
          </div>
        )}

        {/* TAB 3: COLOR PALETTES & BACKDROP TONE */}
        {activeTab === 'color' && mode !== 'pbn' && (
          <div className="space-y-3.5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#52525B]">
                {s.paletteLabel}
              </label>
              <div className="space-y-1.5">
                {PALETTE_IDS.map((pid) => {
                  const def = ARTISTIC_PALETTES[pid];
                  const active = params.palette === pid;
                  return (
                    <button
                      key={pid}
                      type="button"
                      onClick={() => onParamsChange({ palette: pid })}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                        active
                          ? 'border-[#C2410C] bg-[#C2410C]/5 text-[#9A3412]'
                          : 'border-[#E4E2DC] text-[#3F3F46] hover:border-[#A1A1AA]'
                      }`}
                    >
                      <span className="truncate">{t.palettes[pid]}</span>
                      <span className="flex items-center gap-1 shrink-0 ml-2">
                        {def.swatches.map((hex) => (
                          <span
                            key={hex}
                            className="w-3.5 h-3.5 rounded-xs border border-black/10"
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {unifyBgActive && (
              <div className="pt-3 border-t border-[#E4E2DC]">{renderUnifyToneGrid()}</div>
            )}

            <label className="flex items-center justify-between pt-3 border-t border-[#E4E2DC] cursor-pointer">
              <span className="text-xs font-medium text-[#3F3F46]">{s.meshLabel}</span>
              <button
                type="button"
                role="switch"
                aria-checked={params.showMesh}
                onClick={() => onParamsChange({ showMesh: !params.showMesh })}
                className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors cursor-pointer ${
                  params.showMesh ? 'bg-[#C2410C]' : 'bg-[#D4D1C9]'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform mt-0.5 ${
                    params.showMesh ? 'translate-x-4.5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </label>
          </div>
        )}

        {/* TAB 4: MULTI-FRAME WALL CONTROLS */}
        {activeTab === 'frames' && mode === 'multiframe' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#52525B]">
                {s.multiframeGridLabel}
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {FRAME_GRID_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => onFrameGridChange(preset.id)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border text-left transition-colors whitespace-nowrap cursor-pointer ${
                      frameGrid === preset.id
                        ? 'border-[#C2410C] bg-[#C2410C]/5 text-[#9A3412]'
                        : 'border-[#E4E2DC] text-[#52525B] hover:border-[#A1A1AA] hover:text-[#18181B]'
                    }`}
                  >
                    {t.frameGrids[preset.id]}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-[#18181B]">{s.gutterLabel}</label>
                <span className="text-xs font-mono tabular-nums text-[#52525B]">
                  {gutterPercent.toFixed(1)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={8}
                step={0.5}
                value={gutterPercent}
                onChange={(e) => onGutterChange(parseFloat(e.target.value))}
                className="studio-slider w-full"
                aria-label={s.gutterLabel}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-[#18181B]">{s.frameFinishLabel}</label>
              <div className="grid grid-cols-2 gap-1.5">
                {FINISH_OPTIONS.map((fin) => (
                  <button
                    key={fin}
                    type="button"
                    onClick={() => onFrameFinishChange(fin)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap cursor-pointer ${
                      frameFinish === fin
                        ? 'border-[#18181B] bg-[#18181B] text-white'
                        : 'border-[#E4E2DC] text-[#52525B] hover:text-[#18181B]'
                    }`}
                  >
                    {t.frameFinishes[fin]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PINNED BOTTOM EXPORT ACTIONS — Always reachable without scrolling */}
      <div className="p-3.5 border-t border-[#E4E2DC] bg-[#FAF9F6] shrink-0 space-y-2">
        <button
          type="button"
          onClick={onOpenExportModal}
          className="w-full py-2.5 px-4 rounded-lg bg-[#C2410C] hover:bg-[#9A3412] text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
        >
          <Download className="w-4 h-4 shrink-0" />
          <span>{s.unlockExportBtn}</span>
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onDownloadPreview}
            className="py-1.5 px-2.5 rounded-lg border border-[#E4E2DC] bg-white hover:border-[#A1A1AA] text-xs font-medium text-[#18181B] transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 shrink-0 text-[#52525B]" />
            <span className="truncate">{s.freePreviewBtn}</span>
          </button>
          <button
            type="button"
            onClick={onDownloadStory}
            className="py-1.5 px-2.5 rounded-lg border border-[#E4E2DC] bg-white hover:border-[#A1A1AA] text-xs font-medium text-[#18181B] transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5 shrink-0 text-[#52525B]" />
            <span className="truncate">{s.storyExportBtn}</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
