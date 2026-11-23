/**
 * Computes normalized Sobel edge magnitude map G(x, y) in [0, 1]
 * from an RGBA pixel buffer using Rec. 709 luminance.
 */
export function computeSobelMap(
  pixels: Uint8ClampedArray,
  width: number,
  height: number
): Float32Array {
  const size = width * height;
  const lum = new Float32Array(size);

  for (let i = 0, p = 0; i < size; i++, p += 4) {
    lum[i] = (0.2126 * pixels[p] + 0.7152 * pixels[p + 1] + 0.0722 * pixels[p + 2]) / 255;
  }

  // Light 3x3 box-blur pre-pass reduces photographic sensor noise so edges lock onto eyes, nose & silhouette
  const smooth = new Float32Array(size);
  for (let y = 1; y < height - 1; y++) {
    const row = y * width;
    for (let x = 1; x < width - 1; x++) {
      const idx = row + x;
      smooth[idx] =
        (lum[idx - width - 1] +
          lum[idx - width] * 2 +
          lum[idx - width + 1] +
          lum[idx - 1] * 2 +
          lum[idx] * 4 +
          lum[idx + 1] * 2 +
          lum[idx + width - 1] +
          lum[idx + width] * 2 +
          lum[idx + width + 1]) /
        16;
    }
  }

  const grad = new Float32Array(size);
  let maxGrad = 0.0001;

  for (let y = 1; y < height - 1; y++) {
    const row = y * width;
    const prevRow = row - width;
    const nextRow = row + width;

    for (let x = 1; x < width - 1; x++) {
      const tl = smooth[prevRow + x - 1];
      const tc = smooth[prevRow + x];
      const tr = smooth[prevRow + x + 1];
      const ml = smooth[row + x - 1];
      const mr = smooth[row + x + 1];
      const bl = smooth[nextRow + x - 1];
      const bc = smooth[nextRow + x];
      const br = smooth[nextRow + x + 1];

      const gx = -tl + tr - 2 * ml + 2 * mr - bl + br;
      const gy = -tl - 2 * tc - tr + bl + 2 * bc + br;
      const mag = Math.sqrt(gx * gx + gy * gy);

      grad[row + x] = mag;
      if (mag > maxGrad) maxGrad = mag;
    }
  }

  // Normalize with soft contrast curve so medium contrast fur/eye boundaries are preserved
  const invMax = 1 / maxGrad;
  for (let i = 0; i < size; i++) {
    const norm = grad[i] * invMax;
    grad[i] = Math.min(1, Math.pow(norm, 0.72));
  }

  return grad;
}
