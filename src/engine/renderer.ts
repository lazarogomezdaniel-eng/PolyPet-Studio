import { rgbToHex } from './palettes';
import type { StudioMode, TriangleData } from './types';

export interface RenderOptions {
  triangles: TriangleData[];
  width: number;
  height: number;
  mode: StudioMode;
  showMesh: boolean;
  pbnShowColorRef?: boolean;
  highlightPbnIndex?: number | null;
  watermarkText?: string;
}

/**
 * Renders the triangulated artwork onto a Canvas 2D context at any scale.
 * Applies a 0.65px same-color micro-stroke in color mode to eliminate subpixel
 * anti-aliasing seams between adjacent triangles.
 */
export function renderTrianglesToCanvas(
  ctx: CanvasRenderingContext2D,
  targetWidth: number,
  targetHeight: number,
  options: RenderOptions
): void {
  const {
    triangles,
    width,
    height,
    mode,
    showMesh,
    pbnShowColorRef = false,
    highlightPbnIndex = null,
    watermarkText,
  } = options;

  if (width <= 0 || height <= 0) return;

  const scaleX = targetWidth / width;
  const scaleY = targetHeight / height;
  const scale = (scaleX + scaleY) * 0.5;

  ctx.save();
  ctx.clearRect(0, 0, targetWidth, targetHeight);

  if (mode === 'pbn' && !pbnShowColorRef) {
    // Pure crisp white printable paper background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, targetWidth, targetHeight);

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    for (let i = 0; i < triangles.length; i++) {
      const t = triangles[i];
      const x0 = t.x0 * scaleX;
      const y0 = t.y0 * scaleY;
      const x1 = t.x1 * scaleX;
      const y1 = t.y1 * scaleY;
      const x2 = t.x2 * scaleX;
      const y2 = t.y2 * scaleY;

      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.closePath();

      if (highlightPbnIndex !== null && t.pbnIndex === highlightPbnIndex && t.pbnR !== undefined) {
        ctx.fillStyle = `rgba(${t.pbnR}, ${t.pbnG}, ${t.pbnB}, 0.88)`;
        ctx.fill();
      } else if (highlightPbnIndex !== null) {
        ctx.fillStyle = '#FAFAFA';
        ctx.fill();
      }

      ctx.strokeStyle =
        highlightPbnIndex !== null && t.pbnIndex === highlightPbnIndex ? '#18181B' : '#94A3B8';
      ctx.lineWidth = Math.max(0.6, 0.8 * scale);
      ctx.stroke();
    }

    // Draw centered numbers using exact mathematical incenter & inradius
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < triangles.length; i++) {
      const t = triangles[i];
      if (!t.pbnIndex || t.incenterX === undefined || t.incenterY === undefined || !t.inradius) {
        continue;
      }

      const scaledInradius = t.inradius * scale;
      // Skip ultra-narrow slivers where text would collide with edges
      if (scaledInradius < 3.4) continue;

      const label = String(t.pbnIndex);
      const digitFactor = label.length > 1 ? 0.84 : 1.05;
      const fontSize = Math.max(5.5, Math.min(14 * scale, scaledInradius * digitFactor));

      const isHighlighted = highlightPbnIndex !== null && t.pbnIndex === highlightPbnIndex;
      if (isHighlighted && t.pbnR !== undefined && t.pbnG !== undefined && t.pbnB !== undefined) {
        const lum = 0.2126 * t.pbnR + 0.7152 * t.pbnG + 0.0722 * t.pbnB;
        ctx.fillStyle = lum > 140 ? '#18181B' : '#FFFFFF';
      } else {
        ctx.fillStyle = highlightPbnIndex !== null ? '#CBD5E1' : '#475569';
      }

      ctx.font = `500 ${fontSize.toFixed(1)}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillText(label, t.incenterX * scaleX, t.incenterY * scaleY + fontSize * 0.04);
    }
  } else {
    // Full-color Low Poly render (or Paint-by-Numbers colored reference)
    ctx.fillStyle = '#F8F7F4';
    ctx.fillRect(0, 0, targetWidth, targetHeight);

    ctx.lineJoin = 'round';
    const seamStroke = Math.max(0.65, 0.75 * scale);

    for (let i = 0; i < triangles.length; i++) {
      const t = triangles[i];
      const usePbnColor = mode === 'pbn' && pbnShowColorRef && t.pbnR !== undefined;
      const r = usePbnColor ? (t.pbnR ?? t.r) : t.r;
      const g = usePbnColor ? (t.pbnG ?? t.g) : t.g;
      const b = usePbnColor ? (t.pbnB ?? t.b) : t.b;

      const color = rgbToHex(r, g, b);

      ctx.beginPath();
      ctx.moveTo(t.x0 * scaleX, t.y0 * scaleY);
      ctx.lineTo(t.x1 * scaleX, t.y1 * scaleY);
      ctx.lineTo(t.x2 * scaleX, t.y2 * scaleY);
      ctx.closePath();

      ctx.fillStyle = color;
      ctx.fill();

      // Anti-aliasing seam elimination micro-stroke
      ctx.strokeStyle = color;
      ctx.lineWidth = seamStroke;
      ctx.stroke();

      if (showMesh) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
        ctx.lineWidth = Math.max(0.45, 0.55 * scale);
        ctx.stroke();
      }
    }
  }

  // Optional subtle diagonal watermark for free preview downloads
  if (watermarkText) {
    ctx.save();
    ctx.translate(targetWidth / 2, targetHeight / 2);
    ctx.rotate(-Math.PI / 6);
    const wmSize = Math.max(18, Math.round(targetWidth * 0.045));
    ctx.font = `600 ${wmSize}px "Fraunces", Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const stepX = wmSize * 9;
    const stepY = wmSize * 5.2;
    const cols = Math.ceil((targetWidth * 1.6) / stepX);
    const rows = Math.ceil((targetHeight * 1.6) / stepY);

    for (let ry = -rows; ry <= rows; ry++) {
      for (let rx = -cols; rx <= cols; rx++) {
        const px = rx * stepX + (ry % 2 === 0 ? 0 : stepX * 0.5);
        const py = ry * stepY;
        ctx.fillStyle = mode === 'pbn' && !pbnShowColorRef ? 'rgba(24,24,27,0.09)' : 'rgba(255,255,255,0.22)';
        ctx.fillText(watermarkText, px, py);
      }
    }
    ctx.restore();
  }

  ctx.restore();
}
