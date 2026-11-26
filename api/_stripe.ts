import type { IncomingMessage, ServerResponse } from 'node:http';
import Stripe from 'stripe';

export type EditionId = 'hd' | 'pbn' | 'bundle';
export type ExportKey = 'svg' | 'png' | 'pbn' | 'mf';
export type CheckoutLocale = 'es' | 'en' | 'fr';

export interface EditionSpec {
  id: EditionId;
  amountCents: number;
  currency: 'eur';
  unlocks: ExportKey[];
  titles: Record<CheckoutLocale, { name: string; description: string }>;
}

export const EDITION_CATALOG: Record<EditionId, EditionSpec> = {
  hd: {
    id: 'hd',
    amountCents: 900,
    currency: 'eur',
    unlocks: ['svg', 'png'],
    titles: {
      es: {
        name: 'PolyPet Studio — Retrato HD (Pago único)',
        description: 'Archivo vectorial SVG puro + PNG 300 DPI sin marca de agua.',
      },
      en: {
        name: 'PolyPet Studio — HD Portrait (One-time)',
        description: 'Pure vector SVG + 300 DPI watermark-free PNG.',
      },
      fr: {
        name: 'PolyPet Studio — Portrait HD (Paiement unique)',
        description: 'Fichier vectoriel SVG pur + PNG 300 DPI sans filigrane.',
      },
    },
  },
  pbn: {
    id: 'pbn',
    amountCents: 1200,
    currency: 'eur',
    unlocks: ['pbn'],
    titles: {
      es: {
        name: 'PolyPet Studio — Kit Pintar por Números (Pago único)',
        description: 'PDF vectorial A4 de 3 páginas listo para imprimir y pintar.',
      },
      en: {
        name: 'PolyPet Studio — Paint by Numbers Kit (One-time)',
        description: 'Print-ready 3-page A4 vector PDF with numbered canvas & HEX table.',
      },
      fr: {
        name: 'PolyPet Studio — Kit Peinture par Numéros (Paiement unique)',
        description: 'PDF vectoriel A4 de 3 pages prêt à imprimer et peindre.',
      },
    },
  },
  bundle: {
    id: 'bundle',
    amountCents: 1900,
    currency: 'eur',
    unlocks: ['svg', 'png', 'pbn', 'mf'],
    titles: {
      es: {
        name: 'PolyPet Studio — Pack Estudio Completo (Pago único)',
        description: 'Retrato HD (SVG + PNG 300 DPI), Kit Pintar por Números y Pack Multimarco PDF.',
      },
      en: {
        name: 'PolyPet Studio — Complete Studio Pack (One-time)',
        description: 'HD Portrait (SVG + 300 DPI PNG), Paint by Numbers PDF & Multi-Frame PDF.',
      },
      fr: {
        name: 'PolyPet Studio — Pack Studio Complet (Paiement unique)',
        description: 'Portrait HD (SVG + PNG 300 DPI), Kit Peinture par Numéros & PDF Multi-cadres.',
      },
    },
  },
};

export function isValidEditionId(value: unknown): value is EditionId {
  return value === 'hd' || value === 'pbn' || value === 'bundle';
}

export function normalizeCheckoutLocale(value: unknown): CheckoutLocale {
  if (value === 'en' || value === 'fr' || value === 'es') {
    return value;
  }
  return 'es';
}

export function getStripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key || key === 'sk_test_replace_me') {
    return null;
  }
  return new Stripe(key);
}

export function resolveAppOrigin(req: IncomingMessage): string {
  const envUrl = process.env.APP_URL?.trim();
  if (envUrl && /^https?:\/\//i.test(envUrl) && envUrl !== 'MY_APP_URL') {
    return envUrl.replace(/\/+$/, '');
  }

  const originHeader = req.headers.origin;
  if (typeof originHeader === 'string' && /^https?:\/\//i.test(originHeader)) {
    return originHeader.replace(/\/+$/, '');
  }

  const forwardedProto = req.headers['x-forwarded-proto'];
  const proto =
    typeof forwardedProto === 'string'
      ? forwardedProto.split(',')[0].trim()
      : 'http';
  const forwardedHost = req.headers['x-forwarded-host'];
  const host =
    typeof forwardedHost === 'string'
      ? forwardedHost.split(',')[0].trim()
      : req.headers.host || 'localhost:3000';

  return `${proto}://${host}`;
}

export function sendJson(res: ServerResponse, statusCode: number, payload: unknown): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

export async function readJsonBody<T = Record<string, unknown>>(req: IncomingMessage): Promise<T> {
  const preParsed = (req as IncomingMessage & { body?: unknown }).body;
  if (preParsed && typeof preParsed === 'object') {
    return preParsed as T;
  }
  if (typeof preParsed === 'string' && preParsed.trim()) {
    return JSON.parse(preParsed) as T;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {} as T;
  return JSON.parse(raw) as T;
}
