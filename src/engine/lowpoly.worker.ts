import Delaunator from 'delaunator';
import { computeBackgroundMask } from './backgroundRemoval';
import { labToRgb, mapColorToPalette, rgbToLab, type PaletteToneContext } from './palettes';
import { quantizePaintByNumbers } from './paintByNumbers';
import { computeSobelMap } from './sobel';
import type { PaletteColorEntry, TriangleData, WorkerRequest, WorkerResponse } from './types';

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Cache Sobel map between brush strokes & slider tweaks on the same cropped image
let cachedWidth = 0;
let cachedHeight = 0;
let cachedSobel: Float32Array | null = null;
let cachedPixelsHash = 0;

function quickPixelSignature(pixels: Uint8ClampedArray): number {
  let h = pixels.length;
  const step = Math.max(4, Math.floor(pixels.length / 256) * 4);
  for (let i = 0; i < pixels.length; i += step) {
    h = (Math.imul(h, 31) + pixels[i]) | 0;
  }
  return h;
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const start = performance.now();
  const {
    requestId,
    width,
    height,
    pixels,
    brushMap,
    bgMaskMap,
    brushWidth,
    brushHeight,
    params,
    computePbn,
  } = event.data;

  // Step 1: Sobel edge magnitude map (cached when image pixels are unchanged)
  const sig = quickPixelSignature(pixels);
  if (
    !cachedSobel ||
    cachedWidth !== width ||
    cachedHeight !== height ||
    cachedPixelsHash !== sig
  ) {
    cachedSobel = computeSobelMap(pixels, width, height);
    cachedWidth = width;
    cachedHeight = height;
    cachedPixelsHash = sig;
  }

  const sobel = cachedSobel;
  const rng = mulberry32(params.seed);

  // Step 1B: Build continuous feathered selective unification field u(x,y) in [0..1]
  let hasManualBgUnify = false;
  for (let i = 0; i < bgMaskMap.length; i++) {
    if (bgMaskMap[i] < -0.04) {
      hasManualBgUnify = true;
      break;
    }
  }
  const unifyStrengthNorm = Math.max(0, Math.min(1, (params.unifyStrength ?? 65) / 100));
  const unifyBgActive = (params.unifyBackground || hasManualBgUnify) && unifyStrengthNorm > 0.01;

  let unifyField: Float32Array | null = null;
  let zoneL: Float32Array | null = null;
  let zoneA: Float32Array | null = null;
  let zoneB: Float32Array | null = null;
  let boundaryPoints: number[] = [];

  const uW = brushWidth > 0 ? brushWidth : 128;
  const uH = brushHeight > 0 ? brushHeight : 128;

  if (unifyBgActive) {
    const field = new Float32Array(uW * uH);

    // Optional auto exterior base mask (softly feathered so it never looks harsh)
    if (params.unifyBackground) {
      const bgRes = computeBackgroundMask(
        pixels,
        sobel,
        width,
        height,
        true,
        params.bgTolerance,
        bgMaskMap,
        brushMap,
        uW,
        uH
      );
      const rawAuto = new Float32Array(uW * uH);
      for (let by = 0; by < uH; by++) {
        const py = Math.min(height - 1, Math.floor(((by + 0.5) / uH) * height));
        const pRow = py * width;
        const bRow = by * uW;
        for (let bx = 0; bx < uW; bx++) {
          const px = Math.min(width - 1, Math.floor(((bx + 0.5) / uW) * width));
          rawAuto[bRow + bx] = bgRes.fgMask[pRow + px] === 0 ? 1 : 0;
        }
      }
      // Gentle 3x3 feather pass on auto mask so transitions remain silky and non-invasive
      for (let by = 0; by < uH; by++) {
        for (let bx = 0; bx < uW; bx++) {
          let sum = 0;
          let cnt = 0;
          for (let dy = -1; dy <= 1; dy++) {
            const ny = by + dy;
            if (ny < 0 || ny >= uH) continue;
            for (let dx = -1; dx <= 1; dx++) {
              const nx = bx + dx;
              if (nx < 0 || nx >= uW) continue;
              sum += rawAuto[ny * uW + nx];
              cnt++;
            }
          }
          field[by * uW + bx] = sum / cnt;
        }
      }
    }

    // Merge selective manual brush strokes: negative = unify zone (0..1), positive = protect pet
    for (let i = 0; i < field.length && i < bgMaskMap.length; i++) {
      const mVal = bgMaskMap[i];
      if (mVal < -0.02) {
        field[i] = Math.max(field[i], Math.min(1, -mVal));
      } else if (mVal > 0.04) {
        field[i] = Math.max(0, field[i] * (1 - Math.min(1, mVal)));
      }
    }

    // Extract clean boundary contour vertices wherever the painted zone borders the pet
    for (let by = 1; by < uH - 1; by++) {
      const row = by * uW;
      for (let bx = 1; bx < uW - 1; bx++) {
        const c = field[row + bx] >= 0.35 ? 1 : 0;
        if (
          c !== (field[row + bx + 1] >= 0.35 ? 1 : 0) ||
          c !== (field[row + bx - 1] >= 0.35 ? 1 : 0) ||
          c !== (field[(by + 1) * uW + bx] >= 0.35 ? 1 : 0) ||
          c !== (field[(by - 1) * uW + bx] >= 0.35 ? 1 : 0)
        ) {
          boundaryPoints.push(((bx + 0.5) / uW) * width, ((by + 0.5) / uH) * height);
        }
      }
    }

    // Normalized local Lab convolution (2-pass separable box blur, R=14 cells) strictly over
    // selected pixels (weight = field[i]). Each painted zone smoothly harmonizes toward its OWN
    // clean local exterior tone with ZERO color bleeding from the unselected pet!
    const totalCells = uW * uH;
    const wL = new Float32Array(totalCells);
    const wA = new Float32Array(totalCells);
    const wB = new Float32Array(totalCells);
    const wSum = new Float32Array(totalCells);

    for (let by = 0; by < uH; by++) {
      const py = Math.min(height - 1, Math.floor(((by + 0.5) / uH) * height));
      const pRow = py * width;
      const bRow = by * uW;
      for (let bx = 0; bx < uW; bx++) {
        const idx = bRow + bx;
        const u = field[idx];
        if (u <= 0.02) continue;
        const px = Math.min(width - 1, Math.floor(((bx + 0.5) / uW) * width));
        const off = (pRow + px) * 4;
        const lab = rgbToLab(pixels[off], pixels[off + 1], pixels[off + 2]);
        wL[idx] = lab.L * u;
        wA[idx] = lab.a * u;
        wB[idx] = lab.b * u;
        wSum[idx] = u;
      }
    }

    const blurChannel = (src: Float32Array, radius: number): Float32Array => {
      const tmp = new Float32Array(totalCells);
      const out = new Float32Array(totalCells);
      // Horizontal prefix-sum pass
      for (let y = 0; y < uH; y++) {
        const row = y * uW;
        let acc = 0;
        for (let x = 0; x <= Math.min(uW - 1, radius); x++) acc += src[row + x];
        for (let x = 0; x < uW; x++) {
          const left = Math.max(0, x - radius);
          const right = Math.min(uW - 1, x + radius);
          tmp[row + x] = acc / (right - left + 1);
          const nextR = x + radius + 1;
          if (nextR < uW) acc += src[row + nextR];
          const oldL = x - radius;
          if (oldL >= 0) acc -= src[row + oldL];
        }
      }
      // Vertical prefix-sum pass
      for (let x = 0; x < uW; x++) {
        let acc = 0;
        for (let y = 0; y <= Math.min(uH - 1, radius); y++) acc += tmp[y * uW + x];
        for (let y = 0; y < uH; y++) {
          const top = Math.max(0, y - radius);
          const bot = Math.min(uH - 1, y + radius);
          out[y * uW + x] = acc / (bot - top + 1);
          const nextB = y + radius + 1;
          if (nextB < uH) acc += tmp[nextB * uW + x];
          const oldT = y - radius;
          if (oldT >= 0) acc -= tmp[oldT * uW + x];
        }
      }
      return out;
    };

    // Two separable box passes produce a smooth Gaussian local-zone tone field
    const bL = blurChannel(blurChannel(wL, 12), 10);
    const bA = blurChannel(blurChannel(wA, 12), 10);
    const bB = blurChannel(blurChannel(wB, 12), 10);
    const bW = blurChannel(blurChannel(wSum, 12), 10);

    zoneL = new Float32Array(totalCells);
    zoneA = new Float32Array(totalCells);
    zoneB = new Float32Array(totalCells);
    for (let i = 0; i < totalCells; i++) {
      if (bW[i] > 1e-4) {
        zoneL[i] = bL[i] / bW[i];
        zoneA[i] = bA[i] / bW[i];
        zoneB[i] = bB[i] / bW[i];
      }
    }

    unifyField = field;
  }

  const sampleUnifyAt = (fx: number, fy: number): number => {
    if (!unifyField) return 0;
    const gx = Math.min(uW - 1, Math.max(0, Math.floor((fx / width) * uW)));
    const gy = Math.min(uH - 1, Math.max(0, Math.floor((fy / height) * uH)));
    return unifyField[gy * uW + gx];
  };

  const sampleZoneLabAt = (fx: number, fy: number): { L: number; a: number; b: number } | null => {
    if (!zoneL || !zoneA || !zoneB) return null;
    const gx = Math.min(uW - 1, Math.max(0, Math.floor((fx / width) * uW)));
    const gy = Math.min(uH - 1, Math.max(0, Math.floor((fy / height) * uH)));
    const idx = gy * uW + gx;
    return { L: zoneL[idx], a: zoneA[idx], b: zoneB[idx] };
  };

  // Step 2: Combine Sobel edges with manual Detail (+1) / Simplify (-1) brush map
  const edgeAlpha = 0.25 + (params.edgeSensitivity / 100) * 1.15;
  const baseWeight = 0.045;

  const sampleBrush = (x: number, y: number): number => {
    if (brushWidth <= 0 || brushHeight <= 0 || brushMap.length === 0) return 0;
    const bx = Math.min(brushWidth - 1, Math.max(0, Math.floor((x / width) * brushWidth)));
    const by = Math.min(brushHeight - 1, Math.max(0, Math.floor((y / height) * brushHeight)));
    return brushMap[by * brushWidth + bx];
  };

  // Spatial hash grid for fast variable-radius separation check
  const targetInterior = Math.max(200, Math.min(2400, Math.round(params.density)));
  const avgSpacing = Math.sqrt((width * height) / targetInterior);
  const cellSize = Math.max(6, avgSpacing * 0.45);
  const gridCols = Math.ceil(width / cellSize);
  const gridRows = Math.ceil(height / cellSize);
  const grid: number[][] = new Array(gridCols * gridRows);

  const points: number[] = [];

  const insertPoint = (px: number, py: number) => {
    const idx = points.length / 2;
    points.push(px, py);
    const cx = Math.min(gridCols - 1, Math.max(0, Math.floor(px / cellSize)));
    const cy = Math.min(gridRows - 1, Math.max(0, Math.floor(py / cellSize)));
    const cellIdx = cy * gridCols + cx;
    if (!grid[cellIdx]) grid[cellIdx] = [idx];
    else grid[cellIdx].push(idx);
  };

  const isTooClose = (px: number, py: number, minDist: number): boolean => {
    const minDistSq = minDist * minDist;
    const cx = Math.floor(px / cellSize);
    const cy = Math.floor(py / cellSize);
    const span = Math.max(1, Math.ceil(minDist / cellSize));

    const xMin = Math.max(0, cx - span);
    const xMax = Math.min(gridCols - 1, cx + span);
    const yMin = Math.max(0, cy - span);
    const yMax = Math.min(gridRows - 1, cy + span);

    for (let gy = yMin; gy <= yMax; gy++) {
      const rowOffset = gy * gridCols;
      for (let gx = xMin; gx <= xMax; gx++) {
        const bucket = grid[rowOffset + gx];
        if (!bucket) continue;
        for (let k = 0; k < bucket.length; k++) {
          const pIdx = bucket[k] * 2;
          const dx = points[pIdx] - px;
          const dy = points[pIdx + 1] - py;
          if (dx * dx + dy * dy < minDistSq) return true;
        }
      }
    }
    return false;
  };

  // Step 3A: Fixed 4 corners + perimeter vertices
  insertPoint(0, 0);
  insertPoint(width, 0);
  insertPoint(width, height);
  insertPoint(0, height);

  const edgeStep = Math.max(18, avgSpacing * 1.15);
  const xCount = Math.max(4, Math.round(width / edgeStep));
  const yCount = Math.max(4, Math.round(height / edgeStep));

  for (let i = 1; i < xCount; i++) {
    const x = (i / xCount) * width;
    insertPoint(x, 0);
    insertPoint(x, height);
  }
  for (let j = 1; j < yCount; j++) {
    const y = (j / yCount) * height;
    insertPoint(0, y);
    insertPoint(width, y);
  }

  // Step 3A-2: Inject crisp contour vertices along the pet/exterior boundary so Delaunay edges
  // align directly onto the animal's silhouette instead of straddling fur and backdrop!
  if (unifyBgActive && boundaryPoints.length > 0) {
    const boundaryMinR = Math.max(4.5, avgSpacing * 0.42);
    const bCount = boundaryPoints.length / 2;
    const stepOffset = Math.max(1, Math.floor(bCount / 480));
    for (let i = 0; i < bCount; i += stepOffset) {
      const bx = boundaryPoints[i * 2];
      const by = boundaryPoints[i * 2 + 1];
      if (!isTooClose(bx, by, boundaryMinR)) {
        insertPoint(bx, by);
      }
    }
  }

  // Step 3B: Dedicated priority pass inside Detail Brush zones (eyes / nose)
  // Dynamically driven by params.detailIntensity (0..100) so moving the slider visibly shrinks
  // or enlarges the triangles inside the painted eye/detail area in real time!
  let detailCells = 0;
  const detailCoords: number[] = [];
  for (let by = 0; by < brushHeight; by++) {
    for (let bx = 0; bx < brushWidth; bx++) {
      const val = brushMap[by * brushWidth + bx];
      if (val > 0.1) {
        detailCells++;
        detailCoords.push(bx, by, val);
      }
    }
  }

  const detailNorm = Math.max(0, Math.min(1, (params.detailIntensity ?? 60) / 100));
  // Smooth curve: 0 -> 0 extra fine points; 50 -> rich facial detail; 100 -> ultra-fine sculptural micro-facets
  const detailStrength = Math.pow(detailNorm, 1.15);

  const maxDetailByArea = Math.round(detailCells * (0.12 + detailStrength * 1.65));
  const detailQuota =
    detailCells > 0 && detailStrength > 0.02
      ? Math.min(Math.round(targetInterior * (0.15 + detailStrength * 1.15)), Math.max(18, maxDetailByArea))
      : 0;

  if (detailQuota > 0) {
    let addedDetail = 0;
    const maxDetailAttempts = detailQuota * 18;
    const cellW = width / brushWidth;
    const cellH = height / brushHeight;

    // Min spacing shrinks dramatically as detailIntensity rises:
    // at 0% -> ~0.78*avgSpacing (large); at 50% -> ~0.28*avgSpacing; at 100% -> 2.1px micro-triangles!
    const baseDetailFactor = 0.78 - detailStrength * 0.68;

    for (let attempt = 0; attempt < maxDetailAttempts && addedDetail < detailQuota; attempt++) {
      const pick = Math.floor(rng() * detailCells) * 3;
      const bx = detailCoords[pick];
      const by = detailCoords[pick + 1];
      const bVal = detailCoords[pick + 2];

      const px = Math.min(width - 2, Math.max(2, (bx + rng()) * cellW));
      const py = Math.min(height - 2, Math.max(2, (by + rng()) * cellH));
      if (unifyBgActive && sampleUnifyAt(px, py) > 0.6) continue;

      const ix = Math.floor(px);
      const iy = Math.floor(py);
      const g = sobel[iy * width + ix];

      const acceptProb = Math.min(1, 0.25 + g * 0.8 + bVal * (0.35 + detailStrength * 0.85));
      if (rng() > acceptProb) continue;

      const minR = Math.max(
        2.1,
        avgSpacing * Math.max(0.06, baseDetailFactor - bVal * 0.08 * detailStrength - g * 0.04)
      );
      if (!isTooClose(px, py, minR)) {
        insertPoint(px, py);
        addedDetail++;
      }
    }
  }

  // Step 3C: Weighted rejection sampling (keeps selected exterior zones calmer & broader while pet stays crisp)
  let interiorAdded = 0;
  const remainingTarget = Math.max(120, targetInterior - Math.round(detailQuota * 0.2));
  const maxAttempts = remainingTarget * 28;

  for (let attempt = 0; attempt < maxAttempts && interiorAdded < remainingTarget; attempt++) {
    const px = 2 + rng() * (width - 4);
    const py = 2 + rng() * (height - 4);

    const ix = Math.floor(px);
    const iy = Math.floor(py);
    const g = sobel[iy * width + ix];
    const m = sampleBrush(px, py);
    const u = unifyBgActive ? sampleUnifyAt(px, py) : 0;

    let weight: number;
    let minR: number;

    if (u > 0.35) {
      // Gently calm & broaden facets proportionally to selection strength
      const calm = u * unifyStrengthNorm;
      weight = Math.max(0.14, (edgeAlpha * g + baseWeight) * (1 - calm * 0.65));
      minR = avgSpacing * (0.98 + calm * 0.52);
    } else if (m > 0.05) {
      weight = Math.min(1, (edgeAlpha * g + baseWeight) * (1 + m * (0.4 + detailStrength * 3.5)) + m * 0.35 * detailStrength);
      minR = Math.max(2.4, avgSpacing * Math.max(0.09, 0.85 - detailStrength * 0.65 - m * 0.1 * detailStrength));
    } else if (m < -0.05) {
      const simp = -m;
      weight = Math.max(0.015, (edgeAlpha * g + baseWeight) * (1 - simp * 0.88));
      minR = avgSpacing * (1.05 + simp * 1.45);
    } else {
      weight = Math.max(0.02, Math.min(1, edgeAlpha * g + baseWeight));
      minR = avgSpacing * (0.98 - g * 0.56);
    }

    if (rng() > weight) continue;
    if (isTooClose(px, py, minR)) continue;

    insertPoint(px, py);
    interiorAdded++;
  }

  // Step 4: Delaunay triangulation
  const delaunay = new Delaunator(points);
  const triIndices = delaunay.triangles;
  const triangles: TriangleData[] = [];

  const samplePixel = (fx: number, fy: number): [number, number, number] => {
    const x = Math.min(width - 1, Math.max(0, Math.round(fx)));
    const y = Math.min(height - 1, Math.max(0, Math.round(fy)));
    const off = (y * width + x) * 4;
    return [pixels[off], pixels[off + 1], pixels[off + 2]];
  };

  // Optional explicit studio tint when user picks White / Warm Paper / Charcoal
  const studioTintRgb =
    params.unifyBgTone === 'white'
      ? { r: 251, g: 251, b: 249 }
      : params.unifyBgTone === 'paper'
        ? { r: 242, g: 238, b: 230 }
        : params.unifyBgTone === 'dark'
          ? { r: 28, g: 28, b: 32 }
          : null;
  const studioTintLab = studioTintRgb
    ? rgbToLab(studioTintRgb.r, studioTintRgb.g, studioTintRgb.b)
    : null;

  // Store per-triangle subtle unification weight so artistic palettes respect studio tints smoothly
  const triUnifyWeights: number[] = [];

  // Step 5: Sample triangles with clean silhouette separation + subtle local-zone CIE Lab unification
  for (let i = 0; i < triIndices.length; i += 3) {
    const i0 = triIndices[i] * 2;
    const i1 = triIndices[i + 1] * 2;
    const i2 = triIndices[i + 2] * 2;

    const x0 = points[i0];
    const y0 = points[i0 + 1];
    const x1 = points[i1];
    const y1 = points[i1 + 1];
    const x2 = points[i2];
    const y2 = points[i2 + 1];

    const cx = (x0 + x1 + x2) / 3;
    const cy = (y0 + y1 + y2) / 3;

    const m0x = (cx + x0) * 0.5;
    const m0y = (cy + y0) * 0.5;
    const m1x = (cx + x1) * 0.5;
    const m1y = (cy + y1) * 0.5;
    const m2x = (cx + x2) * 0.5;
    const m2y = (cy + y2) * 0.5;

    if (unifyBgActive) {
      const uC = sampleUnifyAt(cx, cy);
      const u0 = sampleUnifyAt(m0x, m0y);
      const u1 = sampleUnifyAt(m1x, m1y);
      const u2 = sampleUnifyAt(m2x, m2y);
      const avgU = (uC * 2 + u0 + u1 + u2) / 5;

      // On unselected pet triangles right along the painted silhouette border, ignore any sample
      // point that spills into the painted exterior zone so outline edges stay 100% pure!
      let sumR = 0;
      let sumG = 0;
      let sumB = 0;
      let wSum = 0;

      const isPetEdge = avgU < 0.25 && (uC > 0.45 || u0 > 0.45 || u1 > 0.45 || u2 > 0.45);
      const addSample = (px: number, py: number, uVal: number, weight: number) => {
        if (isPetEdge && uVal > 0.45) return;
        const p = samplePixel(px, py);
        sumR += p[0] * weight;
        sumG += p[1] * weight;
        sumB += p[2] * weight;
        wSum += weight;
      };

      addSample(cx, cy, uC, 2);
      addSample(m0x, m0y, u0, 1);
      addSample(m1x, m1y, u1, 1);
      addSample(m2x, m2y, u2, 1);

      let avgR = Math.round(sumR / Math.max(1, wSum));
      let avgG = Math.round(sumG / Math.max(1, wSum));
      let avgB = Math.round(sumB / Math.max(1, wSum));

      const blend = Math.min(1, avgU * unifyStrengthNorm);
      if (blend > 0.02) {
        const origLab = rgbToLab(avgR, avgG, avgB);
        const targetLab = studioTintLab ?? sampleZoneLabAt(cx, cy) ?? origLab;
        // Subtle perceptual CIE Lab harmonization: melts clutter & uneven noise in the selected zone
        // while keeping soft photographic transitions and natural geometric facets!
        const outRgb = labToRgb(
          origLab.L * (1 - blend) + targetLab.L * blend,
          origLab.a * (1 - blend) + targetLab.a * blend,
          origLab.b * (1 - blend) + targetLab.b * blend
        );
        avgR = outRgb.r;
        avgG = outRgb.g;
        avgB = outRgb.b;
      }

      triangles.push({
        x0,
        y0,
        x1,
        y1,
        x2,
        y2,
        r: avgR,
        g: avgG,
        b: avgB,
        isUnifiedBg: avgU >= 0.45,
      });
      triUnifyWeights.push(blend);
      continue;
    }

    const pC = samplePixel(cx, cy);
    const p0 = samplePixel(m0x, m0y);
    const p1 = samplePixel(m1x, m1y);
    const p2 = samplePixel(m2x, m2y);

    const avgR = Math.round((pC[0] * 2 + p0[0] + p1[0] + p2[0]) / 5);
    const avgG = Math.round((pC[1] * 2 + p0[1] + p1[1] + p2[1]) / 5);
    const avgB = Math.round((pC[2] * 2 + p0[2] + p1[2] + p2[2]) / 5);

    triangles.push({
      x0,
      y0,
      x1,
      y1,
      x2,
      y2,
      r: avgR,
      g: avgG,
      b: avgB,
    });
    triUnifyWeights.push(0);
  }

  // Step 5B: Apply artistic palette colorization strictly OVER the pet's true tonal range
  // so shadows, highlights, and animal silhouette remain 100% crisp across all palettes!
  if (params.palette !== 'natural' && triangles.length > 0) {
    // Anchor exposure strictly to unselected pet triangles when selective unification is active
    const fgTriangles = unifyBgActive ? triangles.filter((t) => !t.isUnifiedBg) : triangles;
    const toneSource = fgTriangles.length >= 12 ? fgTriangles : triangles;

    const lVals = new Float32Array(toneSource.length);
    let warmthSum = 0;

    for (let i = 0; i < toneSource.length; i++) {
      const t = toneSource[i];
      const lab = rgbToLab(t.r, t.g, t.b);
      lVals[i] = lab.L;
      warmthSum += lab.a * 0.65 + lab.b * 0.85;
    }

    lVals.sort();
    const minIdx = Math.floor(toneSource.length * 0.02);
    const maxIdx = Math.min(toneSource.length - 1, Math.floor(toneSource.length * 0.98));

    const toneCtx: PaletteToneContext = {
      minL: lVals[minIdx],
      maxL: Math.max(lVals[minIdx] + 20, lVals[maxIdx]),
      avgWarmth: warmthSum / toneSource.length,
    };

    for (let i = 0; i < triangles.length; i++) {
      const t = triangles[i];
      const normX = (t.x0 + t.x1 + t.x2) / (3 * width);
      const normY = (t.y0 + t.y1 + t.y2) / (3 * height);
      const mapped = mapColorToPalette(t.r, t.g, t.b, params.palette, toneCtx, normX, normY);

      const uBlend = triUnifyWeights[i] ?? 0;
      if (studioTintRgb && uBlend > 0.02) {
        // Blend smoothly toward chosen clean studio backdrop tint (White / Warm Paper / Charcoal)
        t.r = Math.round(mapped.r * (1 - uBlend) + studioTintRgb.r * uBlend);
        t.g = Math.round(mapped.g * (1 - uBlend) + studioTintRgb.g * uBlend);
        t.b = Math.round(mapped.b * (1 - uBlend) + studioTintRgb.b * uBlend);
      } else {
        t.r = mapped.r;
        t.g = mapped.g;
        t.b = mapped.b;
      }
    }
  }

  // Step 6: Optional Paint by Numbers CIE Lab K-Means++ quantization (100% focused on the pet!)
  let pbnPalette: PaletteColorEntry[] = [];
  if (computePbn) {
    const pbnResult = quantizePaintByNumbers(triangles, params.pbnColors, params.seed);
    pbnPalette = pbnResult.palette;
  }

  const response: WorkerResponse = {
    requestId,
    width,
    height,
    triangles,
    pbnPalette,
    computeTimeMs: Math.round(performance.now() - start),
  };

  self.postMessage(response);
};
