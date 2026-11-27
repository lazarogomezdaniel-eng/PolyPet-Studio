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

/**
 * Applies pure tone-driven, gamut-safe CIE LCh colorization strictly from each triangle's
 * ORIGINAL color & luminance (L*, C*, warmth/hue) — ZERO spatial (x, y) zone striping!
 * Two triangles anywhere on the portrait with the same original tone always receive the
 * same artistic palette color, keeping eyes, markings, fur volume, and silhouette 100% faithful.
 */
export function mapColorToPalette(
  r: number,
  g: number,
  b: number,
  paletteId: PaletteId,
  ctx?: PaletteToneContext,
  _normX = 0.5,
  _normY = 0.5
): RGB {
  if (paletteId === 'natural') {
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

  // Sculptural photographic tone curve preserves deep pupils/nose & bright catchlights
  const sculpturalT =
    t < 0.5 ? 0.5 * Math.pow(t * 2, 1.12) : 1 - 0.5 * Math.pow((1 - t) * 2, 1.12);
  const sculpturalL = Math.max(3, Math.min(98, origLab.L * 0.68 + sculpturalT * 96 * 0.32));

  if (paletteId === 'graphite') {
    const targetL = 5 + sculpturalT * 92;
    return lchToRgbGamutSafe(targetL, 1.8, 78);
  }

  // Pure chromatic tone descriptors from the original pixel (zero spatial coordinates!)
  // Warm tan/amber/brown/ginger markings have high positive b* & positive a*
  const rawWarmth = origLab.a * 0.55 + origLab.b * 0.9;
  const refWarmth = ctx ? ctx.avgWarmth : 6;
  const warmthDelta = rawWarmth - refWarmth;

  // Detect distinct warm fur/tan markings (e.g. Rottweiler brows/muzzle/paws, Aussie rust)
  const isDistinctWarmFur =
    origC > 11 && origLab.b > 7 && rawWarmth > Math.max(9.5, refWarmth + 3.5);
  // Detect rosy/pink accents (e.g. tongue, pink nose/inner ear)
  const isRosyAccent =
    origC > 13 && origLab.a > 12 && origLab.a > origLab.b * 0.65 && origLab.L > 18;
  // Detect mid-shadow / warm-shadow facets inside dark/neutral fur -> vivid violet & pop-magenta planes
  const isMagentaShadowTone =
    !isDistinctWarmFur &&
    ((origLab.a > 1.8 && origLab.a > origLab.b * 0.38 && origC > 2.8) ||
      (t > 0.12 && t < 0.23 && warmthDelta > -1.0));

  // Pure tone-based warm/cool split for Editorial & Pastel (zero normX/normY!)
  const isWarmTone = rawWarmth > Math.max(6.5, refWarmth + 1.5);

  // --- POP-ART WARHOL (Pure tone-mapped Cobalt/Cyan + Violet/Magenta + Tangerine/Yellow) ---
  if (paletteId === 'popart') {
    // Keep only the deepest pupil/nostril black (t < 0.05), lift dark fur cleanly into vivid
    // cobalt blue / electric violet / cerulean L* range (26..62) so black coats POP like sculpture!
    const liftedT = Math.pow(t, 0.72);
    const basePopL =
      t < 0.05
        ? 4 + (t / 0.05) * 18
        : Math.max(24, Math.min(96, 22 + liftedT * 73));

    if (isRosyAccent) {
      const pinkL = Math.max(46, Math.min(82, 40 + liftedT * 44));
      const highlightFade = pinkL > 88 ? (100 - pinkL) / 12 : 1;
      return lchToRgbGamutSafe(pinkL, 114 * highlightFade, 348);
    }

    if (isDistinctWarmFur) {
      // Map warm tan/brown/gold tones strictly by luminance -> tangerine orange to golden yellow
      const warmL = Math.max(52, Math.min(90, 48 + liftedT * 42));
      const hue = sampleHueStops(POPART_WARM_HUES, liftedT);
      const highlightFade = warmL > 89 ? (100 - warmL) / 11 : 1;
      return lchToRgbGamutSafe(warmL, 122 * highlightFade, hue);
    }

    if (isMagentaShadowTone) {
      // Shadow transition planes pop in royal violet / hot pop magenta
      const magL = Math.max(30, Math.min(76, 28 + liftedT * 48));
      const hue = sampleHueStops(POPART_SHADOW_MAGENTA_HUES, liftedT);
      return lchToRgbGamutSafe(magL, 112, hue);
    }

    // Dark, black, neutral, and cool tones -> vibrant cobalt blue, royal blue & cyan strictly by tone
    const hue = sampleHueStops(POPART_COOL_HUES, liftedT);
    const highlightFade = basePopL > 89 ? (100 - basePopL) / 11 : 1;
    const shadowTaper = basePopL < 18 ? 0.6 + (basePopL / 18) * 0.4 : 1;
    return lchToRgbGamutSafe(basePopL, 120 * highlightFade * shadowTaper, hue);
  }

  // --- POP-ART ARCOÍRIS / WPAP (Authentic WPAP discrete tonal value bands — ZERO spatial waves!) ---
  if (paletteId === 'wpap') {
    const liftedT = Math.pow(t, 0.76);
    const wpapL =
      t < 0.05
        ? 4 + (t / 0.05) * 18
        : Math.max(24, Math.min(96, 22 + liftedT * 73));

    // Authentic WPAP maps discrete tonal value steps (dark -> mid -> light) to vivid hues
    // strictly from original luminance & original warmth (never by X/Y position!)
    let hue: number;
    if (isRosyAccent) {
      hue = 352; // Hot Pop Pink
    } else if (isDistinctWarmFur) {
      if (t < 0.24) hue = 18;       // Vivid Vermilion-Red
      else if (t < 0.46) hue = 48;  // Electric Tangerine
      else if (t < 0.70) hue = 74;  // Bright Amber-Gold
      else hue = 92;                // Sunburst Canary Yellow
    } else {
      if (t < 0.14) hue = 280;      // Deep Electric Indigo
      else if (t < 0.27) hue = 326; // Royal Violet-Magenta
      else if (t < 0.44) hue = 262; // Vivid Cobalt Blue
      else if (t < 0.60) hue = 214; // Electric Cyan
      else if (t < 0.76) hue = 162; // Vivid Mint-Turquoise
      else if (t < 0.89) hue = 88;  // Luminous Sunburst Yellow
      else hue = 194;               // Crisp Aqua-White highlight
    }

    const highlightFade = wpapL > 90 ? (100 - wpapL) / 10 : 1;
    const shadowTaper = wpapL < 18 ? 0.58 + (wpapL / 18) * 0.42 : 1;
    return lchToRgbGamutSafe(wpapL, 124 * highlightFade * shadowTaper, hue);
  }

  // --- CÁLIDO EDITORIAL (Fine-art warm terracotta, cognac & stone strictly by original tone) ---
  if (paletteId === 'editorial') {
    const targetHue = isWarmTone
      ? lerpHue(36, 68, sculpturalT) // Deep espresso -> burnt terracotta -> warm honey linen
      : lerpHue(215, 82, sculpturalT); // Deep charcoal-slate -> warm stone -> ivory

    const blendedHue = origC > 6 ? lerpHue(targetHue, origHue360, 0.28) : targetHue;
    const bell = Math.sin(Math.min(1, Math.max(0, sculpturalT)) * Math.PI);
    const targetChroma = isWarmTone ? 12 + bell * 46 : 5 + bell * 14;

    return lchToRgbGamutSafe(sculpturalL, targetChroma, blendedHue);
  }

  // --- PASTEL SUAVE (Luminous Scandinavian / gallery pastel strictly by original tone) ---
  const pastelL = 22 + sculpturalL * 0.76;
  const pastelHue = isRosyAccent
    ? 352
    : isWarmTone
      ? sampleHueStops(
          [
            [0.0, 342], // Soft plum-berry shadows
            [0.42, 24], // Dusty coral-blush
            [0.78, 68], // Buttercream apricot
            [1.0, 84],
          ],
          sculpturalT
        )
      : sampleHueStops(
          [
            [0.0, 268], // Soft slate-periwinkle shadows
            [0.48, 210], // Powder sky blue
            [0.8, 166], // Soft eucalyptus mint
            [1.0, 148],
          ],
          sculpturalT
        );

  const pastelBell = Math.sin(Math.min(1, Math.max(0, sculpturalT)) * Math.PI);
  const pastelChroma = 16 + pastelBell * 28;

  return lchToRgbGamutSafe(pastelL, pastelChroma, pastelHue);
}
