import type { Locale } from '../engine/types';

export type EditionId = 'hd' | 'pbn' | 'bundle';
export type ExportKey = 'svg' | 'png' | 'pbn' | 'mf';

export const EDITION_UNLOCKS: Record<EditionId, ExportKey[]> = {
  hd: ['svg', 'png'],
  pbn: ['pbn'],
  bundle: ['svg', 'png', 'pbn', 'mf'],
};

export const EXPORT_REQUIRED_EDITION: Record<ExportKey, EditionId> = {
  svg: 'hd',
  png: 'hd',
  pbn: 'pbn',
  mf: 'bundle',
};

const STORAGE_KEY = 'polypet_unlocked_editions_v1';

function isEditionId(value: unknown): value is EditionId {
  return value === 'hd' || value === 'pbn' || value === 'bundle';
}

export function loadUnlockedEditions(): EditionId[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return Array.from(new Set(parsed.filter(isEditionId)));
  } catch {
    return [];
  }
}

export function saveUnlockedEditions(editions: EditionId[]): EditionId[] {
  const unique = Array.from(new Set(editions.filter(isEditionId)));
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(unique));
  } catch {
    // Ignore storage quota / private mode restrictions
  }
  return unique;
}

export function getUnlockedExportKeys(editions: EditionId[]): Set<ExportKey> {
  const keys = new Set<ExportKey>();
  for (const tier of editions) {
    for (const key of EDITION_UNLOCKS[tier]) {
      keys.add(key);
    }
  }
  return keys;
}

export interface CheckoutStartResult {
  ok: boolean;
  url?: string;
  code?: string;
  error?: string;
}

export async function startStripeCheckout(
  tier: EditionId,
  locale: Locale
): Promise<CheckoutStartResult> {
  try {
    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier, locale }),
    });
    const data = (await response.json()) as {
      url?: string;
      code?: string;
      error?: string;
    };
    if (!response.ok || !data.url) {
      return {
        ok: false,
        code: data.code,
        error: data.error || 'Unable to start checkout',
      };
    }
    return { ok: true, url: data.url };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Network error',
    };
  }
}

export interface VerifySessionResult {
  verified: boolean;
  paid: boolean;
  tier: EditionId | null;
  unlockedExports: ExportKey[];
  code?: string;
  error?: string;
}

export async function verifyStripeSession(sessionId: string): Promise<VerifySessionResult> {
  try {
    const response = await fetch(
      `/api/verify?session_id=${encodeURIComponent(sessionId)}`,
      { method: 'GET' }
    );
    const data = (await response.json()) as {
      verified?: boolean;
      paid?: boolean;
      tier?: unknown;
      unlockedExports?: unknown;
      code?: string;
      error?: string;
    };
    if (!response.ok) {
      return {
        verified: false,
        paid: false,
        tier: null,
        unlockedExports: [],
        code: data.code,
        error: data.error || 'Verification failed',
      };
    }
    const tier = isEditionId(data.tier) ? data.tier : null;
    const unlockedExports = Array.isArray(data.unlockedExports)
      ? (data.unlockedExports.filter(
          (k): k is ExportKey => k === 'svg' || k === 'png' || k === 'pbn' || k === 'mf'
        ))
      : [];
    return {
      verified: Boolean(data.verified),
      paid: Boolean(data.paid),
      tier,
      unlockedExports,
      error: data.error,
    };
  } catch (err) {
    return {
      verified: false,
      paid: false,
      tier: null,
      unlockedExports: [],
      error: err instanceof Error ? err.message : 'Network error',
    };
  }
}
