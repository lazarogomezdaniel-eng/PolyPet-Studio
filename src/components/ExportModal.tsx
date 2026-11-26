import React, { useMemo, useState } from 'react';
import {
  Check,
  Download,
  FileText,
  Frame,
  Image as ImageIcon,
  Layers,
  Loader2,
  Lock,
  ShieldCheck,
  X,
} from 'lucide-react';
import { PRINTIFY_EU_CATALOG, savePrintifyWaitlistRequest } from '../lib/printify';
import {
  EDITION_UNLOCKS,
  EXPORT_REQUIRED_EDITION,
  getUnlockedExportKeys,
  type EditionId,
  type ExportKey,
} from '../lib/checkout';
import type { FrameFinish, FrameGridId } from '../engine/types';
import type { Messages } from '../i18n/messages';

export type CheckoutUiStatus =
  | 'idle'
  | 'verifying'
  | 'verified'
  | 'cancelled'
  | 'error'
  | 'not_configured';

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  t: Messages;
  frameGrid: FrameGridId;
  frameFinish: FrameFinish;
  hasPbnData: boolean;
  unlockedEditions: EditionId[];
  checkoutStatus: CheckoutUiStatus;
  checkoutError?: string | null;
  checkoutBusyTier: EditionId | null;
  onStartCheckout: (tier: EditionId) => void;
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
  unlockedEditions,
  checkoutStatus,
  checkoutError,
  checkoutBusyTier,
  onStartCheckout,
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

  const unlockedKeys = useMemo(
    () => getUnlockedExportKeys(unlockedEditions),
    [unlockedEditions]
  );

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

  const tierNameById = Object.fromEntries(
    t.pricing.tiers.map((tier) => [tier.id, tier.name])
  ) as Record<EditionId, string>;

  const masterExports: {
    key: ExportKey;
    label: string;
    icon: React.ReactNode;
    onRun: () => void | Promise<void>;
  }[] = [
    {
      key: 'svg',
      label: m.downloadSvg,
      icon: <Layers className="w-4 h-4 text-[#C2410C] shrink-0" />,
      onRun: onExportSvg,
    },
    {
      key: 'png',
      label: m.downloadPng300,
      icon: <ImageIcon className="w-4 h-4 text-[#C2410C] shrink-0" />,
      onRun: onExportPng300,
    },
    {
      key: 'pbn',
      label: m.downloadPbnPdf,
      icon: <FileText className="w-4 h-4 text-[#C2410C] shrink-0" />,
      onRun: onExportPbnPdf,
    },
    {
      key: 'mf',
      label: m.downloadMultiFramePdf,
      icon: <Frame className="w-4 h-4 text-[#C2410C] shrink-0" />,
      onRun: onExportMultiFramePdf,
    },
  ];

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
            {/* Checkout verification / status banners */}
            {checkoutStatus === 'verifying' && (
              <div className="p-3.5 rounded-xl border border-[#E4E2DC] bg-[#FAF9F6] flex items-center gap-3 text-xs sm:text-sm text-[#18181B]">
                <Loader2 className="w-4 h-4 text-[#C2410C] animate-spin shrink-0" />
                <span>{m.verifyingPayment}</span>
              </div>
            )}
            {checkoutStatus === 'verified' && (
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/80 flex items-start gap-3">
                <Check className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-emerald-950">{m.paymentVerifiedTitle}</p>
                  <p className="mt-0.5 text-xs text-emerald-800">{m.paymentVerifiedDesc}</p>
                </div>
              </div>
            )}
            {checkoutStatus === 'cancelled' && (
              <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/70 text-xs sm:text-sm text-amber-950">
                {m.paymentCancelledNotice}
              </div>
            )}
            {checkoutStatus === 'not_configured' && (
              <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/70 text-xs sm:text-sm text-amber-950">
                {m.stripeNotConfiguredNotice}
              </div>
            )}
            {checkoutStatus === 'error' && (
              <div className="p-3.5 rounded-xl border border-red-200 bg-red-50/70 text-xs sm:text-sm text-red-900">
                {checkoutError || m.paymentErrorNotice}
              </div>
            )}

            {/* Pricing editions with Stripe Checkout */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {t.pricing.tiers.map((tier) => {
                const isTierUnlocked = EDITION_UNLOCKS[tier.id].every((k) =>
                  unlockedKeys.has(k)
                );
                const isBusy = checkoutBusyTier === tier.id;
                return (
                  <div
                    key={tier.id}
                    className={`p-3.5 rounded-xl border flex flex-col justify-between gap-3 ${
                      tier.id === 'bundle'
                        ? 'border-[#C2410C]/40 bg-[#C2410C]/[0.03]'
                        : 'border-[#E4E2DC] bg-[#FAF9F6]'
                    }`}
                  >
                    <div>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-xs font-semibold text-[#18181B]">{tier.name}</span>
                        <span className="text-base font-semibold font-mono tabular-nums text-[#C2410C] shrink-0 whitespace-nowrap">
                          {tier.price}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[#52525B] leading-snug">{tier.tagline}</p>
                    </div>

                    {isTierUnlocked ? (
                      <div className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-100/80 text-emerald-900 text-xs font-semibold">
                        <Check className="w-3.5 h-3.5" />
                        <span>{m.unlockedBadge}</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={checkoutBusyTier !== null}
                        onClick={() => onStartCheckout(tier.id)}
                        className={`w-full py-2 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 ${
                          tier.id === 'bundle'
                            ? 'bg-[#C2410C] hover:bg-[#9A3412] text-white'
                            : 'bg-white border border-[#E4E2DC] hover:border-[#18181B] text-[#18181B]'
                        }`}
                      >
                        {isBusy ? m.redirectingCheckout : `${m.unlockCta} · ${tier.price}`}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Master Downloads */}
            <div className="space-y-3 pt-4 border-t border-[#E4E2DC]">
              <div>
                <h3 className="text-sm font-semibold text-[#18181B]">{m.instantExportsHeading}</h3>
                <p className="mt-1 text-xs text-[#52525B] leading-relaxed">{m.instantExportsNote}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {masterExports.map((item) => {
                  const isUnlocked = unlockedKeys.has(item.key);
                  const requiredTier = EXPORT_REQUIRED_EDITION[item.key];
                  const isGenerating = busyKey === item.key;

                  return (
                    <button
                      key={item.key}
                      type="button"
                      disabled={busyKey !== null || checkoutBusyTier !== null}
                      onClick={() =>
                        isUnlocked
                          ? runAction(item.key, item.onRun)
                          : onStartCheckout(requiredTier)
                      }
                      className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-left transition-colors cursor-pointer disabled:opacity-50 ${
                        isUnlocked
                          ? 'border-[#E4E2DC] hover:border-[#C2410C] hover:bg-[#C2410C]/[0.03]'
                          : 'border-[#E4E2DC] bg-[#FAF9F6]/70 hover:border-[#18181B]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {item.icon}
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-[#18181B] truncate">
                            {isGenerating ? m.generating : item.label}
                          </div>
                          {!isUnlocked && (
                            <div className="text-[11px] text-[#71717A] truncate">
                              {m.lockedExportHint} {tierNameById[requiredTier]}
                            </div>
                          )}
                        </div>
                      </div>
                      {isUnlocked ? (
                        <Download className="w-4 h-4 text-[#71717A] shrink-0" />
                      ) : (
                        <Lock className="w-4 h-4 text-[#71717A] shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              <p className="text-[11px] text-[#71717A] pt-1">{m.freePreviewNote}</p>
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
