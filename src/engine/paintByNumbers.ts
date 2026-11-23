import { labDistanceSq, labToRgb, rgbToHex, rgbToLab } from './palettes';
import type { LabColor, PaletteColorEntry, TriangleData } from './types';

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

/**
 * Computes exact mathematical incenter and inradius of a triangle.
 * The incenter is the center of the largest inscribed circle, giving maximum clearance
 * from all three edges for placing Paint-by-Numbers indices cleanly.
 */
export function computeTriangleIncenter(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): { incenterX: number; incenterY: number; inradius: number; area: number } {
  const a = Math.hypot(x1 - x2, y1 - y2); // opposite vertex 0
  const b = Math.hypot(x2 - x0, y2 - y0); // opposite vertex 1
  const c = Math.hypot(x0 - x1, y0 - y1); // opposite vertex 2
  const perimeter = a + b + c;

  const area = Math.abs((x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0)) * 0.5;

  if (perimeter < 1e-6) {
    return {
      incenterX: (x0 + x1 + x2) / 3,
      incenterY: (y0 + y1 + y2) / 3,
      inradius: 0,
      area: 0,
    };
  }

  const incenterX = (a * x0 + b * x1 + c * x2) / perimeter;
  const incenterY = (a * y0 + b * y1 + c * y2) / perimeter;
  const inradius = (2 * area) / perimeter;

  return { incenterX, incenterY, inradius, area };
}

/**
 * Deterministic K-Means++ quantization in perceptual CIE Lab color space.
 * Assigns each triangle a 1-based color index, computes exact incenters/inradii,
 * and sorts the resulting palette from darkest to lightest for an intuitive painting guide.
 */
export function quantizePaintByNumbers(
  triangles: TriangleData[],
  k: number,
  seed: number
): { triangles: TriangleData[]; palette: PaletteColorEntry[] } {
  const n = triangles.length;
  if (n === 0) return { triangles: [], palette: [] };

  const effectiveK = Math.min(k, n);
  const labs: LabColor[] = new Array(n);
  const weights: number[] = new Array(n);

  // Precompute Lab + incenter + area weight
  for (let i = 0; i < n; i++) {
    const t = triangles[i];
    labs[i] = rgbToLab(t.r, t.g, t.b);
    const geom = computeTriangleIncenter(t.x0, t.y0, t.x1, t.y1, t.x2, t.y2);
    t.incenterX = geom.incenterX;
    t.incenterY = geom.incenterY;
    t.inradius = geom.inradius;
    t.area = geom.area;
    // Slight weight compression so small eye/nose triangles still earn distinct palette colors!
    weights[i] = Math.sqrt(Math.max(1, geom.area));
  }

  const rng = mulberry32(seed ^ 0x9e3779b9);

  // Deterministic K-Means++ initialization
  const centroids: LabColor[] = [];
  const firstIdx = Math.floor(rng() * n);
  centroids.push({ ...labs[firstIdx] });

  const minDistSq = new Float64Array(n).fill(Infinity);

  for (let c = 1; c < effectiveK; c++) {
    const last = centroids[c - 1];
    let totalWeight = 0;
    for (let i = 0; i < n; i++) {
      const d = labDistanceSq(labs[i], last);
      if (d < minDistSq[i]) minDistSq[i] = d;
      totalWeight += minDistSq[i];
    }

    if (totalWeight <= 1e-6) {
      centroids.push({ ...labs[c % n] });
      continue;
    }

    let rVal = rng() * totalWeight;
    let chosen = n - 1;
    for (let i = 0; i < n; i++) {
      rVal -= minDistSq[i];
      if (rVal <= 0) {
        chosen = i;
        break;
      }
    }
    centroids.push({ ...labs[chosen] });
  }

  // Run weighted Lloyd iterations
  const assignments = new Int32Array(n);
  const maxIters = 18;

  for (let iter = 0; iter < maxIters; iter++) {
    let changed = false;

    for (let i = 0; i < n; i++) {
      let bestC = 0;
      let bestDist = Infinity;
      const sample = labs[i];

      for (let c = 0; c < effectiveK; c++) {
        const d = labDistanceSq(sample, centroids[c]);
        if (d < bestDist) {
          bestDist = d;
          bestC = c;
        }
      }

      if (assignments[i] !== bestC) {
        assignments[i] = bestC;
        changed = true;
      }
    }

    if (!changed && iter > 2) break;

    const sumL = new Float64Array(effectiveK);
    const sumA = new Float64Array(effectiveK);
    const sumB = new Float64Array(effectiveK);
    const sumW = new Float64Array(effectiveK);

    for (let i = 0; i < n; i++) {
      const c = assignments[i];
      const w = weights[i];
      sumL[c] += labs[i].L * w;
      sumA[c] += labs[i].a * w;
      sumB[c] += labs[i].b * w;
      sumW[c] += w;
    }

    for (let c = 0; c < effectiveK; c++) {
      if (sumW[c] > 0) {
        centroids[c].L = sumL[c] / sumW[c];
        centroids[c].a = sumA[c] / sumW[c];
        centroids[c].b = sumB[c] / sumW[c];
      }
    }
  }

  // Sort clusters by perceptual lightness (dark -> light) and filter out unused clusters
  const clusterCounts = new Int32Array(effectiveK);
  for (let i = 0; i < n; i++) {
    clusterCounts[assignments[i]]++;
  }

  const activeOrder = Array.from({ length: effectiveK }, (_, idx) => idx)
    .filter((idx) => clusterCounts[idx] > 0)
    .sort((i1, i2) => centroids[i1].L - centroids[i2].L);

  const oldToNew = new Int32Array(effectiveK);
  const palette: PaletteColorEntry[] = activeOrder.map((oldIdx, newPos) => {
    oldToNew[oldIdx] = newPos;
    const c = centroids[oldIdx];
    const rgb = labToRgb(c.L, c.a, c.b);
    return {
      index: newPos + 1,
      rgb,
      hex: rgbToHex(rgb.r, rgb.g, rgb.b),
      count: clusterCounts[oldIdx],
    };
  });

  // Assign sorted 1-based indices and quantized RGB back to triangles
  for (let i = 0; i < n; i++) {
    const newIdx = oldToNew[assignments[i]];
    const entry = palette[newIdx];
    const t = triangles[i];
    t.pbnIndex = entry.index;
    t.pbnR = entry.rgb.r;
    t.pbnG = entry.rgb.g;
    t.pbnB = entry.rgb.b;
  }

  return { triangles, palette };
}
