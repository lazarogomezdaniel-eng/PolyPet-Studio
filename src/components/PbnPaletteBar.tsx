import React from 'react';
import type { PaletteColorEntry } from '../engine/types';
import type { Messages } from '../i18n/messages';

interface PbnPaletteBarProps {
  palette: PaletteColorEntry[];
  highlightIndex: number | null;
  onSelectHighlight: (index: number | null) => void;
  t: Messages['studio'];
}

export const PbnPaletteBar: React.FC<PbnPaletteBarProps> = ({
  palette,
  highlightIndex,
  onSelectHighlight,
  t,
}) => {
  if (palette.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t border-[#E4E2DC]">
      <div className="flex items-center justify-between gap-4 mb-3">
        <p className="text-xs text-[#52525B]">{t.pbnLegendHint}</p>
        {highlightIndex !== null && (
          <button
            type="button"
            onClick={() => onSelectHighlight(null)}
            className="text-xs font-medium text-[#C2410C] hover:text-[#9A3412] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {t.pbnClearHighlight}
          </button>
        )}
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
        {palette.map((entry) => {
          const isSelected = highlightIndex === entry.index;
          const lum = 0.2126 * entry.rgb.r + 0.7152 * entry.rgb.g + 0.7152 * entry.rgb.b;
          const textColor = lum > 145 ? '#18181B' : '#FFFFFF';

          return (
            <button
              key={entry.index}
              type="button"
              onClick={() => onSelectHighlight(isSelected ? null : entry.index)}
              className={`group flex flex-col items-center p-1.5 rounded-lg border transition-all cursor-pointer ${
                isSelected
                  ? 'border-[#C2410C] bg-[#C2410C]/5 ring-1 ring-[#C2410C]'
                  : 'border-[#E4E2DC] bg-white hover:border-[#A1A1AA]'
              }`}
              title={`${entry.index} · ${entry.hex} (${entry.count})`}
            >
              <div
                className="w-full h-7 rounded-sm flex items-center justify-center text-xs font-semibold font-mono tabular-nums border border-black/10"
                style={{ backgroundColor: entry.hex, color: textColor }}
              >
                {entry.index}
              </div>
              <span className="mt-1 text-[10px] font-mono tabular-nums text-[#52525B]">
                {entry.hex}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
