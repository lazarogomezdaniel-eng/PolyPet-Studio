import React, { useState } from 'react';
import { Check, Download, FileText, Frame, Image as ImageIcon, Layers, ShieldCheck, X } from 'lucide-react';
import { PRINTIFY_EU_CATALOG, savePrintifyWaitlistRequest } from '../lib/printify';
import type { FrameFinish, FrameGridId } from '../engine/types';
import type { Messages } from '../i18n/messages';

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  t: Messages;
  frameGrid: FrameGridId;
  frameFinish: FrameFinish;
  hasPbnData: boolean;
  onExportSvg: () => void;
  onExportPng300: () => Promise<void>;
  onExportPbnPdf: () => Promise<void>;
  onExportMultiFramePdf: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  open,
  onClose,
  t,
  frameGrid,
  frameFinish,
  onExportSvg,
  onExportPng300,
  onExportPbnPdf,
  onExportMultiFramePdf,
}) => {
  const [activeTab, setActiveTab] = useState<'digital' | 'printify'>('digital');
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [selectedPrintId, setSelectedPrintId] = useState(PRINTIFY_EU_CATALOG[0].id);
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState('ES');
  const [submitted, setSubmitted] = useState(false);

  if (!open) return null;

  const m = t.modal;

  const runAction = async (key: string, fn: () => void | Promise<void>) => {
    setBusyKey(key);
    try {
      await Promise.resolve(fn());
    } finally {
      setTimeout(() => setBusyKey(null), 350);
    }
  };

  const handlePrintSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    savePrintifyWaitlistRequest({
      productId: selectedPrintId,
      email: email.trim(),
      countryCode: country,
      frameFinish,
      frameGrid,
      createdAt: Date.now(),
    });
    setSubmitted(true);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl border border-[#E4E2DC] shadow-2xl p-6 sm:p-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-5 border-b border-[#E4E2DC]">
          <div>
            <h2 id="export-modal-title" className="text-2xl font-medium text-[#18181B]">
              {m.title}
            </h2>
            <p className="mt-1 text-sm text-[#52525B]">{m.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={m.close}
            className="p-2 rounded-lg text-[#52525B] hover:text-[#18181B] hover:bg-[#F4F3EE] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-[#F4F3EE] rounded-lg mt-5">
          <button
            type="button"
            onClick={() => setActiveTab('digital')}
            className={`flex-1 py-2 px-3 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'digital'
                ? 'bg-white text-[#18181B] shadow-xs'
                : 'text-[#52525B] hover:text-[#18181B]'
            }`}
          >
            {m.tabDigital}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('printify')}
            className={`flex-1 py-2 px-3 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'printify'
                ? 'bg-white text-[#18181B] shadow-xs'
                : 'text-[#52525B] hover:text-[#18181B]'
            }`}
          >
            {m.tabPrintify}
          </button>
        </div>

        {activeTab === 'digital' ? (
          <div className="mt-6 space-y-6">
            {/* Pricing overview strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {t.pricing.tiers.map((tier) => (
                <div
                  key={tier.id}
                  className={`p-3.5 rounded-xl border ${
                    tier.id === 'bundle'
                      ? 'border-[#C2410C]/40 bg-[#C2410C]/[0.03]'
                      : 'border-[#E4E2DC] bg-[#FAF9F6]'
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-semibold text-[#18181B]">{tier.name}</span>
                    <span className="text-base font-semibold font-mono tabular-nums text-[#C2410C]">
                      {tier.price}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#52525B] leading-snug">{tier.tagline}</p>
                </div>
              ))}
            </div>

            {/* Instant Master Downloads */}
            <div className="space-y-3 pt-4 border-t border-[#E4E2DC]">
              <div>
                <h3 className="text-sm font-semibold text-[#18181B]">{m.instantExportsHeading}</h3>
                <p className="mt-1 text-xs text-[#52525B] leading-relaxed">{m.instantExportsNote}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  disabled={busyKey !== null}
                  onClick={() => runAction('svg', onExportSvg)}
                  className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-[#E4E2DC] hover:border-[#C2410C] hover:bg-[#C2410C]/[0.03] text-left transition-colors cursor-pointer disabled:opacity-50"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Layers className="w-4 h-4 text-[#C2410C] shrink-0" />
                    <span className="text-xs font-semibold text-[#18181B] truncate">
                      {busyKey === 'svg' ? m.generating : m.downloadSvg}
                    </span>
                  </div>
                  <Download className="w-4 h-4 text-[#71717A] shrink-0" />
                </button>

                <button
                  type="button"
                  disabled={busyKey !== null}
                  onClick={() => runAction('png', onExportPng300)}
                  className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-[#E4E2DC] hover:border-[#C2410C] hover:bg-[#C2410C]/[0.03] text-left transition-colors cursor-pointer disabled:opacity-50"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <ImageIcon className="w-4 h-4 text-[#C2410C] shrink-0" />
                    <span className="text-xs font-semibold text-[#18181B] truncate">
                      {busyKey === 'png' ? m.generating : m.downloadPng300}
                    </span>
                  </div>
                  <Download className="w-4 h-4 text-[#71717A] shrink-0" />
                </button>

                <button
                  type="button"
                  disabled={busyKey !== null}
                  onClick={() => runAction('pbn', onExportPbnPdf)}
                  className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-[#E4E2DC] hover:border-[#C2410C] hover:bg-[#C2410C]/[0.03] text-left transition-colors cursor-pointer disabled:opacity-50"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="w-4 h-4 text-[#C2410C] shrink-0" />
                    <span className="text-xs font-semibold text-[#18181B] truncate">
                      {busyKey === 'pbn' ? m.generating : m.downloadPbnPdf}
                    </span>
                  </div>
                  <Download className="w-4 h-4 text-[#71717A] shrink-0" />
                </button>

                <button
                  type="button"
                  disabled={busyKey !== null}
                  onClick={() => runAction('mf', onExportMultiFramePdf)}
                  className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-[#E4E2DC] hover:border-[#C2410C] hover:bg-[#C2410C]/[0.03] text-left transition-colors cursor-pointer disabled:opacity-50"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Frame className="w-4 h-4 text-[#C2410C] shrink-0" />
                    <span className="text-xs font-semibold text-[#18181B] truncate">
                      {busyKey === 'mf' ? m.generating : m.downloadMultiFramePdf}
                    </span>
                  </div>
                  <Download className="w-4 h-4 text-[#71717A] shrink-0" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            <div>
              <h3 className="text-base font-semibold text-[#18181B]">{m.printifyTitle}</h3>
              <p className="mt-1 text-xs sm:text-sm text-[#52525B] leading-relaxed">
                {m.printifyDesc}
              </p>
            </div>

            <div className="space-y-2">
              {PRINTIFY_EU_CATALOG.map((item) => {
                const selected = selectedPrintId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedPrintId(item.id)}
                    className={`w-full flex items-center justify-between gap-4 p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
                      selected
                        ? 'border-[#C2410C] bg-[#C2410C]/[0.03]'
                        : 'border-[#E4E2DC] hover:border-[#A1A1AA]'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-semibold text-[#18181B]">{item.formatCode}</div>
                      <div className="text-xs text-[#52525B] mt-0.5">
                        {item.dimensionsCm} · {item.shippingDaysEu}
                      </div>
                    </div>
                    <div className="text-sm font-semibold font-mono tabular-nums text-[#18181B] shrink-0">
                      {item.estimatedPriceEur} €
                    </div>
                  </button>
                );
              })}
            </div>

            {submitted ? (
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/70 flex items-start gap-3">
                <Check className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-emerald-950">{m.requestSentTitle}</p>
                  <p className="mt-0.5 text-xs text-emerald-800">{m.requestSentDesc}</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handlePrintSubmit} className="space-y-3 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={m.emailPlaceholder}
                    className="sm:col-span-2 px-3.5 py-2.5 rounded-lg border border-[#E4E2DC] text-sm text-[#18181B] focus:outline-none focus:border-[#C2410C]"
                  />
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    aria-label={m.countryLabel}
                    className="px-3 py-2.5 rounded-lg border border-[#E4E2DC] text-sm text-[#18181B] bg-white focus:outline-none focus:border-[#C2410C]"
                  >
                    <option value="ES">España</option>
                    <option value="FR">France</option>
                    <option value="DE">Deutschland</option>
                    <option value="IT">Italia</option>
                    <option value="PT">Portugal</option>
                    <option value="NL">Nederland</option>
                    <option value="BE">Belgique</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-lg bg-[#C2410C] hover:bg-[#9A3412] text-white text-sm font-semibold transition-colors cursor-pointer"
                >
                  {m.requestPrintBtn}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Privacy note */}
        <div className="mt-6 pt-4 border-t border-[#E4E2DC] flex items-center gap-2 text-xs text-[#71717A]">
          <ShieldCheck className="w-4 h-4 text-[#52525B] shrink-0" />
          <span>{m.privacyNote}</span>
        </div>
      </div>
    </div>
  );
};
