export interface PrintifyEuProduct {
  id: string;
  blueprintId: number;
  euProviderName: string;
  formatCode: string;
  dimensionsCm: string;
  estimatedPriceEur: number;
  estimatedMarginPct: number;
  shippingDaysEu: string;
}

export interface PrintifyOrderDraft {
  productId: string;
  email: string;
  countryCode: string;
  frameFinish: string;
  frameGrid: string;
  createdAt: number;
}

/**
 * Typed EU Print-on-Demand catalog prepared for Printify API v1 integration
 * (fulfillment centers in EU to eliminate customs duties and delays).
 */
export const PRINTIFY_EU_CATALOG: PrintifyEuProduct[] = [
  {
    id: 'eu-framed-poster-30x40',
    blueprintId: 492,
    euProviderName: 'Printify EU Fine Art Lab (DE/NL)',
    formatCode: '30 × 40 cm',
    dimensionsCm: '30 × 40 cm · Marco roble o negro mate',
    estimatedPriceEur: 49,
    estimatedMarginPct: 48,
    shippingDaysEu: '3–5 días UE',
  },
  {
    id: 'eu-framed-poster-50x70',
    blueprintId: 494,
    euProviderName: 'Printify EU Fine Art Lab (DE/NL)',
    formatCode: '50 × 70 cm',
    dimensionsCm: '50 × 70 cm · Papel algodón 250 g/m²',
    estimatedPriceEur: 69,
    estimatedMarginPct: 45,
    shippingDaysEu: '3–5 días UE',
  },
  {
    id: 'eu-gallery-canvas-40x60',
    blueprintId: 555,
    euProviderName: 'Printify EU Canvas Studio (ES/PL)',
    formatCode: '40 × 60 cm',
    dimensionsCm: '40 × 60 cm · Lienzo bastidor madera 3,8 cm',
    estimatedPriceEur: 59,
    estimatedMarginPct: 46,
    shippingDaysEu: '4–6 días UE',
  },
];

const WAITLIST_KEY = 'polypet-printify-eu-requests';

export function savePrintifyWaitlistRequest(draft: PrintifyOrderDraft): void {
  try {
    const existingRaw = localStorage.getItem(WAITLIST_KEY);
    const existing: PrintifyOrderDraft[] = existingRaw ? JSON.parse(existingRaw) : [];
    existing.push(draft);
    localStorage.setItem(WAITLIST_KEY, JSON.stringify(existing));
  } catch {
    // Ignore storage quota errors
  }
}
