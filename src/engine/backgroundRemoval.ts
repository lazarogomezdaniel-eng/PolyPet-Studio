import { rgbToLab } from './palettes';
import type { LabColor, RGB } from './types';

export interface BackgroundMaskResult {
  /** 1 = foreground (pet subject), 0 = exterior background (unified color) */
  fgMask: Uint8Array;
  /** Boundary contour points [x0, y0, x1, y1, ...] in working image coordinates */
  boundaryPoints: number[];
  /** Dominant clean exterior color sampled from the outer perimeter */
  exteriorColor: RGB;
}

function buildGreedyClusters(samples: LabColor[], maxClusters: number, mergeRadiusSq: number): LabColor[] {
  const clusters: { L: number; a: number; b: number; count: number }[] = [];

  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    let bestIdx = -1;
    let bestDist = mergeRadiusSq;

    for (let c = 0; c < clusters.length; c++) {
      const cl = clusters[c];
      const dL = s.L - cl.L / cl.count;
      const da = s.a - cl.a / cl.count;
      const db = s.b - cl.b / cl.count;
      const d = dL * dL + da * da + db * db;
      if (d < bestDist) {
        bestDist = d;
        bestIdx = c;
      }
    }

    if (bestIdx >= 0) {
      clusters[bestIdx].L += s.L;
      clusters[bestIdx].a += s.a;
      clusters[bestIdx].b += s.b;
      clusters[bestIdx].count++;
    } else if (clusters.length < maxClusters) {
      clusters.push({ L: s.L, a: s.a, b: s.b, count: 1 });
    }
  }

  return clusters.map((c) => ({
    L: c.L / c.count,
    a: c.a / c.count,
    b: c.b / c.count,
  }));
}

function minClusterDistSq(L: number, a: number, b: number, clusters: LabColor[]): number {
  let best = Infinity;
  for (let i = 0; i < clusters.length; i++) {
    const c = clusters[i];
    const dL = L - c.L;
    const da = a - c.a;
    const db = b - c.b;
    const d = dL * dL + da * da + db * db;
    if (d < best) best = d;
  }
  return best;
}

/**
 * Dual-model algorithmic foreground/background segmentation (100% client-side, zero AI):
 * 1. Learns BOTH a Background color model (outer top/upper-side border) AND a Foreground Pet
 *    color model (central subject + user Detail Brush zones) in perceptual CIE Lab space.
 * 2. Computes local texture/edge energy so furry coat contours block background flooding.
 * 3. Flood-fills strictly from the outer borders ONLY through pixels that match the Background
 *    model better than the Pet model (protecting fur, eyes, ears, and white/dark coats).
 * 4. Fills any enclosed interior holes inside the pet silhouette.
 * 5. Merges manual Erase Background (-1) and Restore Pet (+1) strokes and extracts crisp
 *    contour vertices along the pet silhouette.
 */
export function computeBackgroundMask(
  pixels: Uint8ClampedArray,
  sobel: Float32Array,
  width: number,
  height: number,
  autoRemove: boolean,
  tolerance: number, // 10 .. 88
  manualBgMap: Float32Array,
  detailBrushMap: Float32Array,
  manualW: number,
  manualH: number
): BackgroundMaskResult {
  const total = width * height;
  const fgMask = new Uint8Array(total);
  fgMask.fill(1);

  if (autoRemove) {
    // Work on a compact 220px grid for fast, responsive segmentation
    const scale = Math.min(1, 220 / Math.max(width, height));
    const sw = Math.max(32, Math.round(width * scale));
    const sh = Math.max(32, Math.round(height * scale));
    const sTotal = sw * sh;

    const labL = new Float32Array(sTotal);
    const labA = new Float32Array(sTotal);
    const labB = new Float32Array(sTotal);
    const sEdge = new Float32Array(sTotal);
    const protectedPet = new Uint8Array(sTotal);

    for (let sy = 0; sy < sh; sy++) {
      const srcY = Math.min(height - 1, Math.floor((sy + 0.5) / scale));
      const srcRow = srcY * width;
      const dstRow = sy * sw;
      const my = manualH > 0 ? Math.min(manualH - 1, Math.floor((sy / sh) * manualH)) : 0;

      for (let sx = 0; sx < sw; sx++) {
        const srcX = Math.min(width - 1, Math.floor((sx + 0.5) / scale));
        const srcIdx = srcRow + srcX;
        const p = srcIdx * 4;
        const lab = rgbToLab(pixels[p], pixels[p + 1], pixels[p + 2]);
        const dIdx = dstRow + sx;
        labL[dIdx] = lab.L;
        labA[dIdx] = lab.a;
        labB[dIdx] = lab.b;
        sEdge[dIdx] = sobel[srcIdx];

        // Anything the user highlighted with the Detail Brush (eyes/nose) is 100% protected pet
        if (manualW > 0 && manualH > 0 && detailBrushMap.length > 0) {
          const mx = Math.min(manualW - 1, Math.floor((sx / sw) * manualW));
          if (detailBrushMap[my * manualW + mx] > 0.14) {
            protectedPet[dIdx] = 1;
          }
        }
      }
    }

    // Compute local 3x3 Lab color variance (fur/eyes have rich micro-texture; walls/bokeh are smooth)
    const localVar = new Float32Array(sTotal);
    for (let y = 1; y < sh - 1; y++) {
      const row = y * sw;
      for (let x = 1; x < sw - 1; x++) {
        const idx = row + x;
        const cL = labL[idx];
        const cA = labA[idx];
        const cB = labB[idx];
        const d1 =
          Math.abs(labL[idx - 1] - cL) +
          Math.abs(labL[idx + 1] - cL) +
          Math.abs(labL[idx - sw] - cL) +
          Math.abs(labL[idx + sw] - cL);
        const d2 =
          Math.abs(labA[idx - 1] - cA) +
          Math.abs(labA[idx + 1] - cA) +
          Math.abs(labB[idx - sw] - cB) +
          Math.abs(labB[idx + sw] - cB);
        localVar[idx] = (d1 + d2) * 0.25;
      }
    }

    // 1. Sample Background color clusters strictly from outer top & upper-side margins
    const bgSamples: LabColor[] = [];
    const marginX = Math.max(2, Math.floor(sw * 0.04));
    const marginY = Math.max(2, Math.floor(sh * 0.04));
    const step = Math.max(1, Math.floor(Math.min(sw, sh) / 36));

    // Top margin strip
    for (let y = 0; y < marginY; y += Math.max(1, Math.floor(marginY / 2))) {
      for (let x = 0; x < sw; x += step) {
        const idx = y * sw + x;
        bgSamples.push({ L: labL[idx], a: labA[idx], b: labB[idx] });
      }
    }
    // Left & right upper 65% strips (never touch lower shoulders/paws)
    const sideLimit = Math.floor(sh * 0.65);
    for (let y = marginY; y < sideLimit; y += step) {
      for (let dx = 0; dx < marginX; dx += Math.max(1, Math.floor(marginX / 2))) {
        const lIdx = y * sw + dx;
        const rIdx = y * sw + (sw - 1 - dx);
        bgSamples.push({ L: labL[lIdx], a: labA[lIdx], b: labB[lIdx] });
        bgSamples.push({ L: labL[rIdx], a: labA[rIdx], b: labB[rIdx] });
      }
    }

    const bgClusters = buildGreedyClusters(bgSamples, 6, 100); // 10^2 Lab radius

    // 2. Sample Foreground Pet color clusters from central subject core + protected Detail Brush areas
    const fgSamples: LabColor[] = [];
    const cxCore = sw * 0.5;
    const cyCore = sh * 0.52;
    const rxCore = sw * 0.22;
    const ryCore = sh * 0.26;

    for (let y = 0; y < sh; y += 2) {
      for (let x = 0; x < sw; x += 2) {
        const idx = y * sw + x;
        const dx = (x - cxCore) / rxCore;
        const dy = (y - cyCore) / ryCore;
        const inCore = dx * dx + dy * dy <= 1.0;

        if (protectedPet[idx] || inCore) {
          // Only add to pet model if it's not obviously identical to a smooth border background pixel
          const dBg = minClusterDistSq(labL[idx], labA[idx], labB[idx], bgClusters);
          if (protectedPet[idx] || dBg > 49 || localVar[idx] > 2.2) {
            fgSamples.push({ L: labL[idx], a: labA[idx], b: labB[idx] });
          }
        }
      }
    }

    const fgClusters = buildGreedyClusters(fgSamples, 8, 121);

    // 3. Calibrate conservative, pet-protective thresholds from tolerance [10..88]
    const tNorm = Math.max(0.05, Math.min(1, tolerance / 100));
    // Max perceptual distance from border background model (much tighter than before!)
    const maxBgDist = 7 + tNorm * 24; // At default 34% -> Delta E ~15.1 (clean & conservative!)
    const maxBgDistSq = maxBgDist * maxBgDist;
    // Max step-to-step Lab jump between adjacent background pixels
    const maxStepDist = 2.6 + tNorm * 7.5;
    const maxStepDistSq = maxStepDist * maxStepDist;
    // Strong Sobel contour & fur texture barriers
    const edgeStop = 0.14 + tNorm * 0.26;
    const textureStop = 3.2 + tNorm * 6.5;
    // Competitive margin: pixel must be genuinely closer to Background than to the Pet coat
    const fgCompetitiveness = 0.72 + tNorm * 0.55; // lower = stricter protection for pet colors

    const isBgSmall = new Uint8Array(sTotal);
    const queue = new Int32Array(sTotal);
    let qHead = 0;
    let qTail = 0;

    const isBackgroundCandidate = (idx: number, x: number, y: number): boolean => {
      if (protectedPet[idx]) return false;

      // Protect inner core of the portrait (dog's face/chest) unless tolerance is very high
      const ndx = (x - cxCore) / (sw * 0.20);
      const ndy = (y - sh * 0.48) / (sh * 0.22);
      const inFaceCore = ndx * ndx + ndy * ndy < 1.0;

      const dBgSq = minClusterDistSq(labL[idx], labA[idx], labB[idx], bgClusters);
      if (dBgSq > maxBgDistSq) return false;

      // Reject textured fur or strong silhouette boundaries
      if (sEdge[idx] > edgeStop) return false;
      if (localVar[idx] > textureStop) return false;

      if (fgClusters.length > 0) {
        const dFgSq = minClusterDistSq(labL[idx], labA[idx], labB[idx], fgClusters);
        // Require background distance to beat foreground pet distance
        const ratio = inFaceCore ? fgCompetitiveness * 0.55 : fgCompetitiveness;
        if (dBgSq > dFgSq * ratio * ratio) return false;
      } else if (inFaceCore) {
        return false;
      }

      return true;
    };

    const seedBorder = (x: number, y: number) => {
      const idx = y * sw + x;
      if (isBgSmall[idx] || protectedPet[idx]) return;
      const dBgSq = minClusterDistSq(labL[idx], labA[idx], labB[idx], bgClusters);
      if (dBgSq <= maxBgDistSq * 0.9 && sEdge[idx] <= edgeStop * 1.15) {
        isBgSmall[idx] = 1;
        queue[qTail++] = idx;
      }
    };

    // Seed top border and upper 72% of left/right borders (never seed bottom paws/chest)
    for (let x = 0; x < sw; x++) seedBorder(x, 0);
    const seedSideLimit = Math.floor(sh * 0.72);
    for (let y = 0; y < seedSideLimit; y++) {
      seedBorder(0, y);
      seedBorder(sw - 1, y);
    }

    // 4-connected conservative perceptual flood-fill
    while (qHead < qTail) {
      const curr = queue[qHead++];
      const cx = curr % sw;
      const cy = (curr - cx) / sw;
      const cL = labL[curr];
      const cA = labA[curr];
      const cB = labB[curr];

      const tryNeighbor = (nx: number, ny: number) => {
        if (nx < 0 || nx >= sw || ny < 0 || ny >= sh) return;
        const nIdx = ny * sw + nx;
        if (isBgSmall[nIdx]) return;

        // Check local smoothness step first
        const dL = labL[nIdx] - cL;
        const da = labA[nIdx] - cA;
        const db = labB[nIdx] - cB;
        if (dL * dL + da * da + db * db > maxStepDistSq) return;

        if (isBackgroundCandidate(nIdx, nx, ny)) {
          isBgSmall[nIdx] = 1;
          queue[qTail++] = nIdx;
        }
      };

      tryNeighbor(cx - 1, cy);
      tryNeighbor(cx + 1, cy);
      tryNeighbor(cx, cy - 1);
      tryNeighbor(cx, cy + 1);
    }

    // 4. Gently erode background by 1px along pet boundary (protects fine whiskers & ear tips)
    const safeBg = new Uint8Array(sTotal);
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        const idx = y * sw + x;
        if (!isBgSmall[idx]) continue;
        // Keep background only if at least 5 of 9 neighbors are also background
        let bgCount = 0;
        let totalN = 0;
        for (let dy = -1; dy <= 1; dy++) {
          const ny = y + dy;
          if (ny < 0 || ny >= sh) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            if (nx < 0 || nx >= sw) continue;
            totalN++;
            bgCount += isBgSmall[ny * sw + nx];
          }
        }
        safeBg[idx] = bgCount >= Math.ceil(totalN * 0.62) ? 1 : 0;
      }
    }

    // 5. Upscale mask back to working image resolution
    for (let y = 0; y < height; y++) {
      const sy = Math.min(sh - 1, Math.floor(y * scale));
      const sRow = sy * sw;
      const dRow = y * width;
      for (let x = 0; x < width; x++) {
        const sx = Math.min(sw - 1, Math.floor(x * scale));
        fgMask[dRow + x] = safeBg[sRow + sx] ? 0 : 1;
      }
    }
  }

  // Step 6: Apply manual Erase Background (-1) and Restore Pet (+1) brush overrides
  if (manualW > 0 && manualH > 0 && manualBgMap.length > 0) {
    let hasManual = false;
    for (let i = 0; i < manualBgMap.length; i++) {
      if (Math.abs(manualBgMap[i]) > 0.15) {
        hasManual = true;
        break;
      }
    }

    if (hasManual) {
      for (let y = 0; y < height; y++) {
        const my = Math.min(manualH - 1, Math.floor((y / height) * manualH));
        const mRow = my * manualW;
        const dRow = y * width;
        for (let x = 0; x < width; x++) {
          const mx = Math.min(manualW - 1, Math.floor((x / width) * manualW));
          const val = manualBgMap[mRow + mx];
          if (val < -0.18) {
            fgMask[dRow + x] = 0;
          } else if (val > 0.18) {
            fgMask[dRow + x] = 1;
          }
        }
      }
    }
  }

  // Step 7: Extract crisp contour vertices along the foreground/background boundary
  const boundaryPoints: number[] = [];
  const stride = Math.max(3, Math.round(Math.min(width, height) / 155));

  for (let y = stride; y < height - stride; y += stride) {
    const row = y * width;
    for (let x = stride; x < width - stride; x += stride) {
      const c = fgMask[row + x];
      if (
        c !== fgMask[row + x + stride] ||
        c !== fgMask[row + x - stride] ||
        c !== fgMask[(y + stride) * width + x] ||
        c !== fgMask[(y - stride) * width + x]
      ) {
        boundaryPoints.push(x, y);
      }
    }
  }

  // Step 8: Compute dominant clean exterior color from outer perimeter pixels (top + upper sides)
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let extCount = 0;
  const borderStep = Math.max(2, Math.floor(Math.min(width, height) / 48));
  const bandX = Math.max(3, Math.floor(width * 0.04));
  const bandY = Math.max(3, Math.floor(height * 0.04));

  const accumPixel = (px: number, py: number) => {
    const off = (py * width + px) * 4;
    sumR += pixels[off];
    sumG += pixels[off + 1];
    sumB += pixels[off + 2];
    extCount++;
  };

  for (let x = 0; x < width; x += borderStep) {
    accumPixel(x, Math.min(height - 1, bandY));
  }
  const sideEnd = Math.floor(height * 0.65);
  for (let y = bandY; y < sideEnd; y += borderStep) {
    accumPixel(Math.min(width - 1, bandX), y);
    accumPixel(Math.max(0, width - 1 - bandX), y);
  }

  const exteriorColor: RGB =
    extCount > 0
      ? {
          r: Math.round(sumR / extCount),
          g: Math.round(sumG / extCount),
          b: Math.round(sumB / extCount),
        }
      : { r: 238, g: 234, b: 226 };

  return { fgMask, boundaryPoints, exteriorColor };
}
