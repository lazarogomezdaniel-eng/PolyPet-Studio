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
    swatches: ['#161F6D', '#EC1D6B', '#FF8A00', '#FFE600'],
  },
  wpap: {
    id: 'wpap',
    swatches: ['#1E1B6E', '#00B4D8', '#F72585', '#FFD60A'],
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
  let diff = ((h2 - h1 + 540) % 360) - 180;
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

// Pure polar LCh hue stops (degrees in CIE Lab wheel: 0=magenta-red, 40=orange, 90=yellow, 145=green, 210=cyan, 275=royal blue, 315=violet)
const WARHOL_WARM_HUES: [number, number][] = [
  [0.0, 290], // Deep electric indigo-violet shadows
  [0.24, 330], // Vivid royal magenta-plum
  [0.48, 8],   // Hot Warhol crimson-pink
  [0.7, 52],   // Electric tangerine-orange
  [0.88, 92],  // Vivid canary yellow
  [1.0, 96],   // Crisp warm white highlight
];

const WARHOL_COOL_HUES: [number, number][] = [
  [0.0, 278], // Deep midnight cobalt
  [0.26, 255], // Electric ultramarine blue
  [0.52, 218], // Vibrant cyan-cerulean
  [0.76, 178], // Electric turquoise-mint
  [0.92, 145], // Luminous aqua highlight
  [1.0, 120],
];

/**
 * Applies high-fidelity gamut-safe CIE LCh colorization strictly OVER the original
 * portrait's luminance structure so the pet's silhouette, eyes, snout, and 3D volume
 * remain 100% sharp and unmistakable in every style.
 */
export function mapColorToPalette(
  r: number,
  g: number,
  b: number,
  paletteId: PaletteId,
  ctx?: PaletteToneContext,
  normX = 0.5,
  normY = 0.5
): RGB {
  if (paletteId === 'natural') {
    return { r, g, b };
  }

  const origLab = rgbToLab(r, g, b);
  const origC = Math.hypot(origLab.a, origLab.b);
  const origHue = (Math.atan2(origLab.b, origLab.a) * 180) / Math.PI;
  const origHue360 = (origHue + 360) % 360;

  const minL = ctx ? ctx.minL : 2;
  const maxL = ctx ? ctx.maxL : 98;
  const spanL = Math.max(18, maxL - minL);

  // Portrait-anchored normalized lightness t in [0..1]
  const t = Math.max(0, Math.min(1, (origLab.L - minL) / spanL));

  // Gentle photographic S-curve keeps dark eyes/nose deep & highlights luminous
  const sculpturalT =
    t < 0.5 ? 0.5 * Math.pow(t * 2, 1.12) : 1 - 0.5 * Math.pow((1 - t) * 2, 1.12);
  const sculpturalL = Math.max(3, Math.min(98, origLab.L * 0.68 + sculpturalT * 96 * 0.32));

  if (paletteId === 'graphite') {
    const targetL = 5 + sculpturalT * 92;
    return lchToRgbGamutSafe(targetL, 1.8, 78);
  }

  // Relative warmth score (distinguishes chestnut/amber fur from cooler shadows/backdrops)
  const rawWarmth = origLab.a * 0.65 + origLab.b * 0.85;
  const refWarmth = ctx ? ctx.avgWarmth : 8;
  const warmthDelta = rawWarmth - refWarmth;
  // Blend actual coat warmth with a subtle directional studio key-light cue so even
  // monochrome coats (black Labrador / white Samoyed) split cleanly without noisy speckles
  const directedWarmth = warmthDelta + (0.5 - normX) * 6.5 + (sculpturalT - 0.45) * 8.0;
  const isWarmSide = Math.abs(warmthDelta) > 5.0 ? warmthDelta >= 0 : directedWarmth >= 0;

  // --- POP-ART WARHOL (Pure LCh high-voltage silkscreen — ZERO muddy gray!) ---
  if (paletteId === 'popart') {
    const popT =
      t < 0.5 ? 0.5 * Math.pow(t * 2, 1.18) : 1 - 0.5 * Math.pow((1 - t) * 2, 1.18);
    const popL = Math.max(3, Math.min(98, origLab.L * 0.62 + popT * 96 * 0.38));

    // Clean warm vs. cool screenprint branch (zero 50/50 gray cancellation!)
    const hue = isWarmSide
      ? sampleHueStops(WARHOL_WARM_HUES, popT)
      : sampleHueStops(WARHOL_COOL_HUES, popT);

    // Preserve razor-sharp dark pupils/nose and sparkling eye catchlights
    const highlightFade = popL > 91 ? (100 - popL) / 9 : 1;
    const shadowTaper = popL < 14 ? 0.55 + (popL / 14) * 0.45 : 1;
    const targetChroma = 120 * highlightFade * shadowTaper;

    return lchToRgbGamutSafe(popL, targetChroma, hue);
  }

  // --- POP-ART ARCOÍRIS / WPAP (Joyful, electric multicolor geometric art preserving 100% form!) ---
  if (paletteId === 'wpap') {
    const wpapT =
      t < 0.5 ? 0.5 * Math.pow(t * 2, 1.15) : 1 - 0.5 * Math.pow((1 - t) * 2, 1.15);
    const wpapL = Math.max(3, Math.min(98, origLab.L * 0.65 + wpapT * 96 * 0.35));

    // Ordered 7-hue joyful WPAP gallery palette (every adjacent pair harmonizes cleanly):
    // Royal Cobalt (268), Electric Cyan (208), Vivid Mint-Turquoise (162), Sunburst Yellow (90),
    // Electric Tangerine (54), Hot Pop-Pink (356), Neon Violet (312)
    const WPAP_HUES = [268, 208, 162, 90, 54, 356, 312];

    // Smooth diagonal color flow + coat warmth + tonal facet stepping creates lively
    // multi-color Pop-Art planes across the face while preserving EVERY shadow & contour!
    const spatialWave = normX * 2.35 + normY * 1.55;
    const warmthShift = warmthDelta * 0.04;
    const toneShift = wpapT * 1.65;
    const rawIdx = spatialWave + warmthShift + toneShift;
    const wrapped = ((rawIdx % WPAP_HUES.length) + WPAP_HUES.length) % WPAP_HUES.length;

    // Crisp WPAP facet stepping (tight transition band avoids muddy in-between mixtures)
    const baseIdx = Math.floor(wrapped) % WPAP_HUES.length;
    const nextIdx = (baseIdx + 1) % WPAP_HUES.length;
    const frac = wrapped - Math.floor(wrapped);
    const sharpU = frac < 0.42 ? 0 : frac > 0.58 ? 1 : (frac - 0.42) / 0.16;
    const hue = lerpHue(WPAP_HUES[baseIdx], WPAP_HUES[nextIdx], sharpU);

    // Keep deepest pupils/nose dark & expressive and eye highlights crisp white
    const highlightFade = wpapL > 92 ? (100 - wpapL) / 8 : 1;
    const shadowTaper = wpapL < 12 ? 0.45 + (wpapL / 12) * 0.55 : 1;
    const targetChroma = 128 * highlightFade * shadowTaper;

    return lchToRgbGamutSafe(wpapL, targetChroma, hue);
  }

  // --- CÁLIDO EDITORIAL (Fine-art warm terracotta, cognac & sage-stone harmony in LCh) ---
  if (paletteId === 'editorial') {
    const targetHue = isWarmSide
      ? lerpHue(38, 66, sculpturalT) // Deep espresso -> burnt terracotta -> warm honey linen
      : lerpHue(160, 82, sculpturalT); // Muted olive-charcoal -> warm stone -> ivory

    const blendedHue = origC > 6 ? lerpHue(targetHue, origHue360, 0.25) : targetHue;
    const bell = Math.sin(Math.min(1, Math.max(0, sculpturalT)) * Math.PI);
    const targetChroma = isWarmSide ? 10 + bell * 44 : 6 + bell * 16;

    return lchToRgbGamutSafe(sculpturalL, targetChroma, blendedHue);
  }

  // --- PASTEL SUAVE (Luminous Scandinavian / gallery pastel tones in pure LCh) ---
  const pastelL = 22 + sculpturalL * 0.76; // Softly lifted shadows without washing out eyes/nose
  const pastelHue = isWarmSide
    ? sampleHueStops(
        [
          [0.0, 342], // Soft plum-berry shadows
          [0.45, 22], // Dusty coral-blush
          [0.8, 72],  // Buttercream apricot
          [1.0, 82],
        ],
        sculpturalT
      )
    : sampleHueStops(
        [
          [0.0, 268], // Soft slate-periwinkle shadows
          [0.5, 200], // Powder sky blue
          [0.82, 162], // Soft eucalyptus mint
          [1.0, 140],
        ],
        sculpturalT
      );

  const pastelBell = Math.sin(Math.min(1, Math.max(0, sculpturalT)) * Math.PI);
  const pastelChroma = 14 + pastelBell * 26;

  return lchToRgbGamutSafe(pastelL, pastelChroma, pastelHue);
}
