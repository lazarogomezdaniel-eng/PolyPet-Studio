import type { LabColor, PaletteId, RGB } from './types';

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return (
    '#' +
    [clamp(r), clamp(g), clamp(b)]
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
}

export function hexToRgb(hex: string): RGB {
  const clean = hex.replace('#', '');
  const n = parseInt(clean, 16);
  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255,
  };
}

/**
 * Perceptual RGB (sRGB) to CIE Lab (D65) conversion
 */
export function rgbToLab(r: number, g: number, b: number): LabColor {
  let sr = r / 255;
  let sg = g / 255;
  let sb = b / 255;

  sr = sr > 0.04045 ? Math.pow((sr + 0.055) / 1.055, 2.4) : sr / 12.92;
  sg = sg > 0.04045 ? Math.pow((sg + 0.055) / 1.055, 2.4) : sg / 12.92;
  sb = sb > 0.04045 ? Math.pow((sb + 0.055) / 1.055, 2.4) : sb / 12.92;

  const x = (sr * 0.4124564 + sg * 0.3575761 + sb * 0.1804375) / 0.95047;
  const y = (sr * 0.2126729 + sg * 0.7151522 + sb * 0.072175) / 1.0;
  const z = (sr * 0.0193339 + sg * 0.119192 + sb * 0.9503041) / 1.08883;

  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);

  const fx = f(x);
  const fy = f(y);
  const fz = f(z);

  return {
    L: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

function labToLinearSrgb(L: number, a: number, b: number): [number, number, number] {
  const fy = (L + 16) / 116;
  const fx = a / 500 + fy;
  const fz = fy - b / 200;

  const inv = (t: number) => {
    const t3 = t * t * t;
    return t3 > 0.008856 ? t3 : (t - 16 / 116) / 7.787;
  };

  const x = inv(fx) * 0.95047;
  const y = inv(fy) * 1.0;
  const z = inv(fz) * 1.08883;

  const sr = x * 3.2404542 - y * 1.5371385 - z * 0.4985314;
  const sg = -x * 0.969266 + y * 1.8760108 + z * 0.041556;
  const sb = x * 0.0556434 - y * 0.2040259 + z * 1.0572252;
  return [sr, sg, sb];
}

function linearToByte(u: number): number {
  const clamped = Math.max(0, Math.min(1, u));
  const g = clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(g * 255)));
}

/**
 * CIE Lab (D65) back to sRGB
 */
export function labToRgb(L: number, a: number, b: number): RGB {
  const [sr, sg, sb] = labToLinearSrgb(L, a, b);
  return {
    r: linearToByte(sr),
    g: linearToByte(sg),
    b: linearToByte(sb),
  };
}

/**
 * Gamut-safe CIE LCh -> sRGB conversion.
 * Preserves the EXACT target perceptual Lightness (L*) and Hue (hueDeg) while finding
 * the maximum physically valid sRGB Chroma <= targetChroma via 7-step binary search.
 * This guarantees ZERO muddy gray cancellation AND ZERO luminance distortion so the
 * pet's silhouette, eyes, snout, and 3D lighting stay 100% crisp!
 */
export function lchToRgbGamutSafe(L: number, targetChroma: number, hueDeg: number): RGB {
  const clampedL = Math.max(0, Math.min(100, L));
  const rad = ((hueDeg % 360) * Math.PI) / 180;
  const cosH = Math.cos(rad);
  const sinH = Math.sin(rad);

  const inGamut = (c: number): boolean => {
    const [r, g, b] = labToLinearSrgb(clampedL, c * cosH, c * sinH);
    return r >= -0.001 && r <= 1.001 && g >= -0.001 && g <= 1.001 && b >= -0.001 && b <= 1.001;
  };

  if (targetChroma <= 0.1) {
    return labToRgb(clampedL, 0, 0);
  }

  let lo = 0;
  let hi = targetChroma;

  if (inGamut(hi)) {
    return labToRgb(clampedL, hi * cosH, hi * sinH);
  }

  for (let i = 0; i < 7; i++) {
    const mid = (lo + hi) * 0.5;
    if (inGamut(mid)) lo = mid;
    else hi = mid;
  }

  return labToRgb(clampedL, lo * cosH, lo * sinH);
}

export function labDistanceSq(c1: LabColor, c2: LabColor): number {
  const dL = c1.L - c2.L;
  const da = c1.a - c2.a;
  const db = c1.b - c2.b;
  return dL * dL + da * da + db * db;
}

export interface PaletteDefinition {
  id: PaletteId;
  swatches: string[]; // preview swatches shown in UI
}

export const ARTISTIC_PALETTES: Record<PaletteId, PaletteDefinition> = {
  natural: {
    id: 'natural',
    swatches: ['#2C241E', '#8A5A3B', '#D4A87E', '#EAE3D8'],
  },
  editorial: {
    id: 'editorial',
    swatches: ['#1F1815', '#B04622', '#DB9B5E', '#F4ECE1'],
  },
  pastel: {
    id: 'pastel',
    swatches: ['#505A78', '#E08E9B', '#F0CF95', '#8EC7B8'],
  },
  popart: {
    id: 'popart',
    swatches: ['#1842D6', '#E5258C', '#FF7B00', '#FFD200'],
  },
  wpap: {
    id: 'wpap',
    swatches: ['#231B82', '#00B4D8', '#F72585', '#FFD60A'],
  },
  graphite: {
    id: 'graphite',
    swatches: ['#101012', '#494950', '#9797A0', '#F1F1F4'],
  },
};

export interface PaletteToneContext {
  minL: number;
  maxL: number;
  avgWarmth: number;
}

function lerpHue(h1: number, h2: number, u: number): number {
  const diff = ((h2 - h1 + 540) % 360) - 180;
  return (h1 + diff * u + 360) % 360;
}

function sampleHueStops(stops: [number, number][], t: number): number {
  const c = Math.max(0, Math.min(1, t));
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, h0] = stops[i];
    const [t1, h1] = stops[i + 1];
    if (c >= t0 && c <= t1) {
      const u = (c - t0) / Math.max(1e-5, t1 - t0);
      return lerpHue(h0, h1, u);
    }
  }
  return stops[stops.length - 1][1];
}

// Pure tone-based hue ramps in CIE LCh degrees:
// 0/360=crimson-pink, 45=tangerine, 85=golden yellow, 155=mint, 210=cyan, 265=cobalt blue, 315=violet
const POPART_WARM_HUES: [number, number][] = [
  [0.0, 38],  // Rich burnt tangerine shadow
  [0.32, 54], // Vibrant Pop tangerine orange
  [0.62, 72], // Vivid golden amber
  [0.85, 86], // Electric sunburst yellow
  [1.0, 92],  // Luminous warm lemon highlight
];

const POPART_COOL_HUES: [number, number][] = [
  [0.0, 282], // Deep electric indigo
  [0.18, 272], // Rich royal cobalt blue
  [0.42, 260], // Electric cobalt / ultramarine blue
  [0.66, 236], // Vivid cerulean / sky blue
  [0.86, 212], // Electric cyan-azure
  [1.0, 200],  // Crisp ice-cyan highlight
];

const POPART_SHADOW_MAGENTA_HUES: [number, number][] = [
  [0.0, 304], // Electric royal violet
  [0.4, 326], // Vivid purple-magenta
  [0.72, 348], // Hot pop pink-magenta
  [1.0, 356],  // Bright coral-pink highlight
];

function smoothstep(edge0: number, edge1: number, x: number): number {
  const u = Math.max(0, Math.min(1, (x - edge0) / Math.max(1e-5, edge1 - edge0)));
  return u * u * (3 - 2 * u);
}

/**
 * Pure tone-driven, form-preserving CIE LCh translucent paint glaze.
 *
 * Key guarantees:
 * 1. STRICTLY MONOTONIC LIGHTNESS: A single smooth lightness curve L(L0) is used for ALL
 *    triangles regardless of hue branch — so shadows, highlights, eyes, snout, and 3D form
 *    can NEVER invert or break with false luminance cliffs!
 * 2. ZERO SPATIAL ZONES: Independent of (x, y) coordinates; identical original tones always
 *    map to identical palette colors anywhere on the pet.
 * 3. CONTINUOUS POLAR HUE ARC (Cobalt -> Violet -> Magenta -> Tangerine -> Yellow):
 *    Eliminates harsh binary if/else boundaries without passing through muddy gray.
 * 4. TRANSLUCENT GLAZE OVER ORIGINAL: Blends the painted LCh glaze over the original RGB
 *    using `opacityNorm` (0..1, default 0.72) like translucent studio paint over an underpainting,
 *    preserving subtle fur texture and photographic volume.
 */
export function mapColorToPalette(
  r: number,
  g: number,
  b: number,
  paletteId: PaletteId,
  ctx?: PaletteToneContext,
  _normX = 0.5,
  _normY = 0.5,
  opacityPercent = 72
): RGB {
  if (paletteId === 'natural') {
    return { r, g, b };
  }

  const alpha = Math.max(0, Math.min(1, opacityPercent / 100));
  if (alpha <= 0.005) {
    return { r, g, b };
  }

  const origLab = rgbToLab(r, g, b);
  const origC = Math.hypot(origLab.a, origLab.b);
  const origHue360 = ((Math.atan2(origLab.b, origLab.a) * 180) / Math.PI + 360) % 360;

  const minL = ctx ? ctx.minL : 2;
  const maxL = ctx ? ctx.maxL : 98;
  const spanL = Math.max(18, maxL - minL);

  // Portrait-anchored normalized tonal value t in [0..1]
  const t = Math.max(0, Math.min(1, (origLab.L - minL) / spanL));

  // Single strictly monotonic sculptural lightness shared by EVERY triangle (zero form breaks!)
  const sculpturalT =
    t < 0.5 ? 0.5 * Math.pow(t * 2, 1.08) : 1 - 0.5 * Math.pow((1 - t) * 2, 1.08);
  const baseL = Math.max(2, Math.min(98, origLab.L * 0.8 + sculpturalT * 96 * 0.2));

  const glazeBlend = (paint: RGB, glazeAlpha: number): RGB => ({
    r: Math.round(r * (1 - glazeAlpha) + paint.r * glazeAlpha),
    g: Math.round(g * (1 - glazeAlpha) + paint.g * glazeAlpha),
    b: Math.round(b * (1 - glazeAlpha) + paint.b * glazeAlpha),
  });

  if (paletteId === 'graphite') {
    const paint = lchToRgbGamutSafe(baseL, 1.6, 78);
    return glazeBlend(paint, alpha);
  }

  // Smooth continuous tone descriptors purely from the original pixel's Lab (ZERO if/else cliffs!)
  const rawWarmth = origLab.a * 0.55 + origLab.b * 0.9;
  const refWarmth = ctx ? ctx.avgWarmth : 6;

  // 0 for black/gray/white/cool fur -> smoothly rises to 1 for warm tan/brown/gold markings
  const warmWeight =
    smoothstep(4, 18, origLab.b) *
    smoothstep(5, 17, origC) *
    smoothstep(Math.max(4, refWarmth - 1), Math.max(14, refWarmth + 9), rawWarmth);

  // 0 -> 1 for rosy/pink areas (tongue, pink nose/ear)
  const rosyWeight =
    smoothstep(9, 20, origLab.a) *
    smoothstep(0.45, 0.9, origLab.a / Math.max(1, Math.abs(origLab.b))) *
    smoothstep(14, 28, origLab.L);

  // Helper: monotonic forward hue interpolation along Cobalt(255) -> Violet(305) -> Magenta(345) -> Orange(50) -> Yellow(84)
  // Always travels through Violet/Magenta (NEVER through green or muddy gray!)
  const arcHueCoolToWarm = (coolH: number, warmH: number, w: number): number => {
    const target = warmH < coolH ? warmH + 360 : warmH;
    return (coolH + (target - coolH) * w) % 360;
  };

  // --- POP-ART WARHOL (Translucent Cobalt/Cyan -> Violet/Magenta -> Tangerine/Yellow glaze) ---
  if (paletteId === 'popart') {
    // Strictly monotonic gentle shadow lift: keeps pupils pitch-black (L=0->0), lifts dark fur
    // smoothly so cobalt/violet reads clearly without EVER inverting a single shadow or highlight!
    const uL = baseL / 100;
    const popL = Math.max(
      2,
      Math.min(98, baseL + 13 * Math.sin(Math.PI * uL) * Math.pow(1 - uL, 1.25))
    );

    const coolHue = sampleHueStops(POPART_COOL_HUES, t);
    const warmHue = sampleHueStops(POPART_WARM_HUES, t);

    // Smooth polar transition from Cobalt/Cyan -> Violet/Magenta -> Tangerine/Yellow by original tone!
    let hue = arcHueCoolToWarm(coolHue, warmHue, warmWeight);
    // Subtle violet/magenta facet shift on mid-dark shadow tones (purely smooth on original a* & t)
    const shadowVioletCue =
      (1 - warmWeight) *
      smoothstep(0.1, 0.22, t) *
      (1 - smoothstep(0.28, 0.44, t)) *
      smoothstep(0.5, 4.5, origLab.a + 1.2);
    hue = lerpHue(hue, 318, shadowVioletCue * 0.72);
    hue = lerpHue(hue, 348, rosyWeight);

    // Preserve razor-sharp dark pupils/nostrils and crisp white catchlights
    const highlightFade = popL > 89 ? (100 - popL) / 11 : 1;
    const shadowTaper = popL < 14 ? 0.35 + (popL / 14) * 0.65 : 1;
    const paint = lchToRgbGamutSafe(popL, 118 * highlightFade * shadowTaper, hue);

    return glazeBlend(paint, alpha);
  }

  // --- POP-ART ARCOÍRIS / WPAP (Vibrant tonal steps glazed smoothly over original 3D form) ---
  if (paletteId === 'wpap') {
    const uL = baseL / 100;
    const wpapL = Math.max(
      2,
      Math.min(98, baseL + 12 * Math.sin(Math.PI * uL) * Math.pow(1 - uL, 1.2))
    );

    // Pure tone-value WPAP palette (cool/neutral ladder + warm ladder smoothly blended along polar arc)
    const WPAP_COOL_STOPS: [number, number][] = [
      [0.0, 282],  // Deep Indigo
      [0.2, 322],  // Royal Violet-Magenta
      [0.4, 260],  // Electric Cobalt
      [0.6, 210],  // Electric Cyan
      [0.78, 162], // Vivid Mint-Turquoise
      [0.92, 92],  // Sunburst Yellow highlight
      [1.0, 192],  // Crisp Aqua highlight
    ];
    const WPAP_WARM_STOPS: [number, number][] = [
      [0.0, 346],  // Hot Crimson-Magenta shadow
      [0.32, 34],  // Vivid Vermilion-Orange
      [0.62, 64],  // Electric Tangerine-Amber
      [0.88, 90],  // Sunburst Yellow
      [1.0, 96],   // Luminous Lemon
    ];

    const coolHue = sampleHueStops(WPAP_COOL_STOPS, t);
    const warmHue = sampleHueStops(WPAP_WARM_STOPS, t);
    let hue = arcHueCoolToWarm(coolHue, warmHue, warmWeight);
    hue = lerpHue(hue, 350, rosyWeight);

    const highlightFade = wpapL > 90 ? (100 - wpapL) / 10 : 1;
    const shadowTaper = wpapL < 14 ? 0.35 + (wpapL / 14) * 0.65 : 1;
    const paint = lchToRgbGamutSafe(wpapL, 122 * highlightFade * shadowTaper, hue);

    return glazeBlend(paint, alpha);
  }

  // --- CÁLIDO EDITORIAL (Fine-art warm terracotta, cognac & stone glaze over original form) ---
  if (paletteId === 'editorial') {
    const warmHue = lerpHue(36, 68, sculpturalT);
    const coolHue = lerpHue(215, 82, sculpturalT);
    const targetHue = lerpHue(coolHue, warmHue, warmWeight);
    const blendedHue = origC > 5 ? lerpHue(targetHue, origHue360, 0.32) : targetHue;
    const bell = Math.sin(Math.min(1, Math.max(0, sculpturalT)) * Math.PI);
    const targetChroma = (6 + bell * 16) * (1 - warmWeight) + (12 + bell * 44) * warmWeight;
    const paint = lchToRgbGamutSafe(baseL, targetChroma, blendedHue);

    return glazeBlend(paint, alpha);
  }

  // --- PASTEL SUAVE (Luminous Scandinavian / gallery pastel glaze over original form) ---
  const pastelL = 16 + baseL * 0.82;
  const warmPastel = sampleHueStops(
    [
      [0.0, 342], // Soft plum-berry
      [0.42, 24], // Dusty coral-blush
      [0.78, 68], // Buttercream apricot
      [1.0, 84],
    ],
    sculpturalT
  );
  const coolPastel = sampleHueStops(
    [
      [0.0, 268], // Soft slate-periwinkle
      [0.48, 210], // Powder sky blue
      [0.8, 166], // Soft eucalyptus mint
      [1.0, 148],
    ],
    sculpturalT
  );
  let pastelHue = arcHueCoolToWarm(coolPastel, warmPastel, warmWeight);
  pastelHue = lerpHue(pastelHue, 352, rosyWeight);
  const pastelBell = Math.sin(Math.min(1, Math.max(0, sculpturalT)) * Math.PI);
  const paint = lchToRgbGamutSafe(pastelL, 16 + pastelBell * 28, pastelHue);

  return glazeBlend(paint, alpha);
}
