import { jsPDF } from 'jspdf';
import { rgbToHex } from './palettes';
import { renderTrianglesToCanvas } from './renderer';
import type {
  FrameGridPreset,
  Locale,
  PaletteColorEntry,
  StudioMode,
  TriangleData,
} from './types';

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/**
 * Generates clean, seamless vector SVG markup with 0.6px matching micro-strokes
 * to prevent hairline anti-aliasing gaps in Illustrator, Inkscape, and browsers.
 */
export function buildVectorSvg(
  triangles: TriangleData[],
  width: number,
  height: number,
  options: {
    mode: StudioMode;
    showMesh: boolean;
    pbnShowColorRef?: boolean;
    viewBox?: { x: number; y: number; w: number; h: number };
  }
): string {
  const vb = options.viewBox ?? { x: 0, y: 0, w: width, h: height };
  const fmt = (n: number) => n.toFixed(2);
  const lines: string[] = [];

  lines.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${fmt(vb.x)} ${fmt(vb.y)} ${fmt(vb.w)} ${fmt(vb.h)}" width="${Math.round(vb.w)}" height="${Math.round(vb.h)}" shape-rendering="geometricPrecision">`
  );

  if (options.mode === 'pbn' && !options.pbnShowColorRef) {
    lines.push(`<rect x="${fmt(vb.x)}" y="${fmt(vb.y)}" width="${fmt(vb.w)}" height="${fmt(vb.h)}" fill="#FFFFFF"/>`);
    lines.push(`<g fill="#FFFFFF" stroke="#94A3B8" stroke-width="0.75" stroke-linejoin="round">`);
    for (let i = 0; i < triangles.length; i++) {
      const t = triangles[i];
      lines.push(
        `<polygon points="${fmt(t.x0)},${fmt(t.y0)} ${fmt(t.x1)},${fmt(t.y1)} ${fmt(t.x2)},${fmt(t.y2)}"/>`
      );
    }
    lines.push(`</g>`);

    lines.push(
      `<g fill="#475569" font-family="Helvetica, Arial, sans-serif" font-weight="500" text-anchor="middle" dominant-baseline="central">`
    );
    for (let i = 0; i < triangles.length; i++) {
      const t = triangles[i];
      if (!t.pbnIndex || t.incenterX === undefined || t.incenterY === undefined || !t.inradius) continue;
      if (t.inradius < 3.4) continue;
      const label = String(t.pbnIndex);
      const fontSize = Math.max(5.2, Math.min(13.5, t.inradius * (label.length > 1 ? 0.82 : 1.02)));
      lines.push(
        `<text x="${fmt(t.incenterX)}" y="${fmt(t.incenterY)}" font-size="${fontSize.toFixed(1)}">${label}</text>`
      );
    }
    lines.push(`</g>`);
  } else {
    lines.push(`<g stroke-width="0.65" stroke-linejoin="round">`);
    for (let i = 0; i < triangles.length; i++) {
      const t = triangles[i];
      const usePbn = options.mode === 'pbn' && options.pbnShowColorRef && t.pbnR !== undefined;
      const hex = rgbToHex(
        usePbn ? (t.pbnR ?? t.r) : t.r,
        usePbn ? (t.pbnG ?? t.g) : t.g,
        usePbn ? (t.pbnB ?? t.b) : t.b
      );
      lines.push(
        `<polygon points="${fmt(t.x0)},${fmt(t.y0)} ${fmt(t.x1)},${fmt(t.y1)} ${fmt(t.x2)},${fmt(t.y2)}" fill="${hex}" stroke="${hex}"/>`
      );
    }
    lines.push(`</g>`);

    if (options.showMesh) {
      lines.push(`<g fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="0.55" stroke-linejoin="round">`);
      for (let i = 0; i < triangles.length; i++) {
        const t = triangles[i];
        lines.push(
          `<polygon points="${fmt(t.x0)},${fmt(t.y0)} ${fmt(t.x1)},${fmt(t.y1)} ${fmt(t.x2)},${fmt(t.y2)}"/>`
        );
      }
      lines.push(`</g>`);
    }
  }

  lines.push(`</svg>`);
  return lines.join('\n');
}

/**
 * Free watermarked PNG preview (max 900px long side)
 */
export async function downloadPreviewPng(
  triangles: TriangleData[],
  width: number,
  height: number,
  mode: StudioMode,
  showMesh: boolean
): Promise<void> {
  const maxSide = 900;
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const outW = Math.round(width * scale);
  const outH = Math.round(height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  renderTrianglesToCanvas(ctx, outW, outH, {
    triangles,
    width,
    height,
    mode,
    showMesh,
    watermarkText: 'PolyPet Studio',
  });

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (blob) triggerDownload(blob, `polypet-preview-${mode}.png`);
}

/**
 * Free vertical 9:16 social Story card with tasteful bottom brand signature
 */
export async function downloadStoryPng(
  triangles: TriangleData[],
  width: number,
  height: number,
  mode: StudioMode,
  showMesh: boolean,
  signatureText: string
): Promise<void> {
  const outW = 1080;
  const outH = 1920;
  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Warm gallery paper canvas
  ctx.fillStyle = '#F4F1EB';
  ctx.fillRect(0, 0, outW, outH);

  // Inner matted art card
  const padX = 96;
  const maxArtW = outW - padX * 2;
  const maxArtH = 1360;
  const aspect = width / height;
  let artW = maxArtW;
  let artH = artW / aspect;
  if (artH > maxArtH) {
    artH = maxArtH;
    artW = artH * aspect;
  }

  const artX = (outW - artW) / 2;
  const artY = (outH - artH) / 2 - 48;

  // Subtle architectural gallery mat frame
  ctx.save();
  ctx.shadowColor = 'rgba(24, 24, 27, 0.14)';
  ctx.shadowBlur = 44;
  ctx.shadowOffsetY = 20;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(artX - 36, artY - 36, artW + 72, artH + 72);
  ctx.restore();

  // Render crisp artwork onto an offscreen canvas then blit cleanly inside the mat
  const artCanvas = document.createElement('canvas');
  artCanvas.width = Math.round(artW);
  artCanvas.height = Math.round(artH);
  const artCtx = artCanvas.getContext('2d');
  if (artCtx) {
    renderTrianglesToCanvas(artCtx, artCanvas.width, artCanvas.height, {
      triangles,
      width,
      height,
      mode,
      showMesh,
    });
    ctx.drawImage(artCanvas, artX, artY, artW, artH);
  }

  // Clean editorial footer signature
  ctx.fillStyle = '#18181B';
  ctx.font = '600 32px "Fraunces", Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('PolyPet Studio', outW / 2, outH - 138);

  ctx.fillStyle = '#71717A';
  ctx.font = '500 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(signatureText, outW / 2, outH - 94);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (blob) triggerDownload(blob, `polypet-story-${mode}.png`);
}

/**
 * Pure vector SVG master file (no watermark)
 */
export function downloadMasterSvg(
  triangles: TriangleData[],
  width: number,
  height: number,
  mode: StudioMode,
  showMesh: boolean
): void {
  const svg = buildVectorSvg(triangles, width, height, {
    mode,
    showMesh,
  });
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  triggerDownload(blob, `polypet-master-${mode}.svg`);
}

/**
 * Full 300 DPI print-ready PNG rendered directly from vector triangle geometry (up to A3 quality)
 */
export async function downloadMasterPng300Dpi(
  triangles: TriangleData[],
  width: number,
  height: number,
  mode: StudioMode,
  showMesh: boolean
): Promise<void> {
  const targetLongSide = 4200; // Crisp 300 DPI for A3 / 30x40cm prints without hitting mobile canvas RAM limits
  const scale = targetLongSide / Math.max(width, height);
  const outW = Math.round(width * scale);
  const outH = Math.round(height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  renderTrianglesToCanvas(ctx, outW, outH, {
    triangles,
    width,
    height,
    mode,
    showMesh,
  });

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (blob) triggerDownload(blob, `polypet-300dpi-${mode}.png`);
}

const PDF_COPY: Record<
  Locale,
  {
    pbnTitle: string;
    pbnPage1Sub: string;
    pbnPage2Sub: string;
    pbnPage3Title: string;
    pbnPage3Sub: string;
    colorCol: string;
    hexCol: string;
    facetsCol: string;
    tipsHeading: string;
    tips: string[];
    mfPlanTitle: string;
    mfPlanSub: string;
    mfRow: string;
    mfCol: string;
    mfTileFooter: string;
  }
> = {
  es: {
    pbnTitle: 'PolyPet Studio — Kit Pintar por Números',
    pbnPage1Sub: 'Página 1 de 3 · Lámina geométrica numerada lista para imprimir (A4)',
    pbnPage2Sub: 'Página 2 de 3 · Referencia de color completa',
    pbnPage3Title: 'Guía Cromática y Paleta Numerada',
    pbnPage3Sub: 'Página 3 de 3 · Correspondencia exacta de tonos (CIE Lab)',
    colorCol: 'Nº / Tono',
    hexCol: 'Código HEX',
    facetsCol: 'Triángulos',
    tipsHeading: 'Consejos prácticos de pintura',
    tips: [
      '1. Imprime la Página 1 en papel acuarela o cartulina mate de 250–300 g/m² para evitar que la pintura traspase.',
      '2. Comienza siempre pintando los tonos más oscuros (números bajos) o por zonas grandes de fondo antes de abordar los ojos.',
      '3. Utiliza un pincel plano fino (#2 o #4) para las aristas rectas y un pincel redondo #0 para los triángulos pequeños del rostro.',
      '4. Deja secar 5 minutos cada color antes de pintar el triángulo vecino para mantener las líneas geométricas limpias.',
    ],
    mfPlanTitle: 'PolyPet Studio — Guía de Montaje Multimarco',
    mfPlanSub: 'Plano de colocación en pared y orden exacto de cada lámina',
    mfRow: 'Fila',
    mfCol: 'Columna',
    mfTileFooter: 'Recorta por las marcas exteriores de las esquinas · PolyPet Studio',
  },
  en: {
    pbnTitle: 'PolyPet Studio — Paint by Numbers Kit',
    pbnPage1Sub: 'Page 1 of 3 · Printable numbered geometric line-art template (A4)',
    pbnPage2Sub: 'Page 2 of 3 · Full-color geometric reference guide',
    pbnPage3Title: 'Color Palette & Mixing Guide',
    pbnPage3Sub: 'Page 3 of 3 · Perceptual CIE Lab color assignments',
    colorCol: '# / Swatch',
    hexCol: 'HEX Code',
    facetsCol: 'Triangles',
    tipsHeading: 'Practical Painting Tips',
    tips: [
      '1. Print Page 1 on heavyweight matte cardstock or cold-press watercolor paper (250–300 gsm) for clean paint absorption.',
      '2. Start with darker tones (lower numbers) or larger background facets before moving to fine eye and nose details.',
      '3. Use a small flat brush (#2–#4) for crisp polygon edges and a #0 round liner brush for delicate facial facets.',
      '4. Allow each color to dry for 5 minutes before painting neighboring triangles to preserve sharp geometric seams.',
    ],
    mfPlanTitle: 'PolyPet Studio — Multi-Frame Gallery Blueprint',
    mfPlanSub: 'Wall hanging layout and exact frame order',
    mfRow: 'Row',
    mfCol: 'Column',
    mfTileFooter: 'Trim along outer corner crop marks · PolyPet Studio',
  },
  fr: {
    pbnTitle: 'PolyPet Studio — Kit Peinture par Numéros',
    pbnPage1Sub: 'Page 1 sur 3 · Planche géométrique numérotée prête à imprimer (A4)',
    pbnPage2Sub: 'Page 2 sur 3 · Modèle de référence en couleur',
    pbnPage3Title: 'Guide Chromatique et Palette Numérotée',
    pbnPage3Sub: 'Page 3 sur 3 · Correspondance perceptuelle CIE Lab',
    colorCol: 'N° / Teinte',
    hexCol: 'Code HEX',
    facetsCol: 'Triangles',
    tipsHeading: 'Conseils pratiques de peinture',
    tips: [
      '1. Imprimez la Page 1 sur un papier épais mat ou aquarelle (250–300 g/m²) pour une excellente tenue des pigments.',
      '2. Commencez par les teintes les plus sombres (petits numéros) ou les grandes zones de fond avant les détails du regard.',
      '3. Utilisez un pinceau plat fin (n° 2 ou 4) pour les arêtes nettes et un pinceau rond n° 0 pour les yeux et la truffe.',
      '4. Laissez sécher 5 minutes entre deux facettes voisines afin de préserver la netteté des contours géométriques.',
    ],
    mfPlanTitle: 'PolyPet Studio — Plan de Montage Multicadre',
    mfPlanSub: 'Disposition murale et ordre exact de chaque cadre',
    mfRow: 'Ligne',
    mfCol: 'Colonne',
    mfTileFooter: 'Découpez le long des repères de coupe extérieurs · PolyPet Studio',
  },
};

function drawCropMarks(doc: jsPDF, x: number, y: number, w: number, h: number): void {
  const gap = 2.5;
  const len = 5.5;
  doc.setDrawColor(120, 120, 128);
  doc.setLineWidth(0.25);

  // Top-left
  doc.line(x - gap - len, y, x - gap, y);
  doc.line(x, y - gap - len, x, y - gap);
  // Top-right
  doc.line(x + w + gap, y, x + w + gap + len, y);
  doc.line(x + w, y - gap - len, x + w, y - gap);
  // Bottom-left
  doc.line(x - gap - len, y + h, x - gap, y + h);
  doc.line(x, y + h + gap, x, y + h + gap + len);
  // Bottom-right
  doc.line(x + w + gap, y + h, x + w + gap + len, y + h);
  doc.line(x + w, y + h + gap, x + w, y + h + gap + len);
}

/**
 * Generates the 3-page A4 Paint by Numbers printable kit PDF:
 * Page 1: Numbered vector line-art template
 * Page 2: Full-color geometric reference
 * Page 3: Numbered palette table (swatches, HEX, counts) & painting guide
 */
export function downloadPaintByNumbersPdf(
  triangles: TriangleData[],
  width: number,
  height: number,
  palette: PaletteColorEntry[],
  locale: Locale
): void {
  const copy = PDF_COPY[locale];
  const isLandscape = width > height * 1.05;
  const doc = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 14;
  const headerH = 18;
  const footerH = 12;
  const availW = pageW - marginX * 2;
  const availH = pageH - headerH - footerH - 8;

  const scale = Math.min(availW / width, availH / height);
  const artW = width * scale;
  const artH = height * scale;
  const offsetX = (pageW - artW) / 2;
  const offsetY = headerH + (availH - artH) / 2;

  // --- PAGE 1: NUMBERED VECTOR LINE-ART ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(24, 24, 27);
  doc.text(copy.pbnTitle, marginX, 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(113, 113, 122);
  doc.text(copy.pbnPage1Sub, marginX, 16);

  // Outer crisp border
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.2);

  for (let i = 0; i < triangles.length; i++) {
    const t = triangles[i];
    const x0 = offsetX + t.x0 * scale;
    const y0 = offsetY + t.y0 * scale;
    const x1 = offsetX + t.x1 * scale;
    const y1 = offsetY + t.y1 * scale;
    const x2 = offsetX + t.x2 * scale;
    const y2 = offsetY + t.y2 * scale;

    doc.triangle(x0, y0, x1, y1, x2, y2, 'S');
  }

  // Centered numbers at exact mathematical incenter
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');
  for (let i = 0; i < triangles.length; i++) {
    const t = triangles[i];
    if (!t.pbnIndex || t.incenterX === undefined || t.incenterY === undefined || !t.inradius) continue;
    const inradiusMm = t.inradius * scale;
    if (inradiusMm < 0.85) continue;

    const label = String(t.pbnIndex);
    // 1 mm = 2.8346 pt
    const ptSize = Math.max(3.6, Math.min(9.5, inradiusMm * 2.15 * (label.length > 1 ? 0.8 : 1.0)));
    doc.setFontSize(ptSize);
    doc.text(label, offsetX + t.incenterX * scale, offsetY + t.incenterY * scale, {
      align: 'center',
      baseline: 'middle',
    });
  }

  drawCropMarks(doc, offsetX, offsetY, artW, artH);

  // --- PAGE 2: FULL-COLOR REFERENCE ---
  doc.addPage('a4', isLandscape ? 'landscape' : 'portrait');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(24, 24, 27);
  doc.text(copy.pbnTitle, marginX, 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(113, 113, 122);
  doc.text(copy.pbnPage2Sub, marginX, 16);

  doc.setLineWidth(0.18);
  for (let i = 0; i < triangles.length; i++) {
    const t = triangles[i];
    const r = t.pbnR ?? t.r;
    const g = t.pbnG ?? t.g;
    const b = t.pbnB ?? t.b;
    doc.setFillColor(r, g, b);
    doc.setDrawColor(r, g, b);
    doc.triangle(
      offsetX + t.x0 * scale,
      offsetY + t.y0 * scale,
      offsetX + t.x1 * scale,
      offsetY + t.y1 * scale,
      offsetX + t.x2 * scale,
      offsetY + t.y2 * scale,
      'FD'
    );
  }

  // --- PAGE 3: COLOR PALETTE LEGEND & GUIDE ---
  doc.addPage('a4', 'portrait');
  const p3W = doc.internal.pageSize.getWidth();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(24, 24, 27);
  doc.text(copy.pbnPage3Title, 16, 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(113, 113, 122);
  doc.text(copy.pbnPage3Sub, 16, 26);

  // 2-column palette swatch grid
  const cols = 2;
  const colW = (p3W - 32 - 8) / cols;
  const startY = 36;
  const rowH = 15;

  palette.forEach((entry, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const x = 16 + col * (colW + 8);
    const y = startY + row * rowH;

    // Swatch card outline
    doc.setDrawColor(228, 226, 220);
    doc.setLineWidth(0.25);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, colW, 12.5, 1.5, 1.5, 'FD');

    // Color chip
    doc.setFillColor(entry.rgb.r, entry.rgb.g, entry.rgb.b);
    doc.setDrawColor(200, 200, 205);
    doc.roundedRect(x + 2.5, y + 2, 13, 8.5, 1, 1, 'FD');

    // Number badge inside chip with adaptive contrast
    const lum = 0.2126 * entry.rgb.r + 0.7152 * entry.rgb.g + 0.7152 * entry.rgb.b;
    doc.setTextColor(lum > 145 ? 24 : 255, lum > 145 ? 24 : 255, lum > 145 ? 27 : 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(String(entry.index), x + 9, y + 6.4, { align: 'center', baseline: 'middle' });

    // HEX + count
    doc.setTextColor(24, 24, 27);
    doc.setFont('courier', 'bold');
    doc.setFontSize(9.5);
    doc.text(entry.hex, x + 19, y + 5.8);

    doc.setTextColor(113, 113, 122);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`${entry.count} ${copy.facetsCol.toLowerCase()}`, x + 19, y + 10.2);
  });

  // Painting tips block
  const tipsStartY = startY + Math.ceil(palette.length / cols) * rowH + 10;
  doc.setDrawColor(228, 226, 220);
  doc.line(16, tipsStartY - 4, p3W - 16, tipsStartY - 4);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(24, 24, 27);
  doc.text(copy.tipsHeading, 16, tipsStartY + 3);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(63, 63, 70);
  let cursorY = tipsStartY + 10;
  copy.tips.forEach((tip) => {
    const wrapped = doc.splitTextToSize(tip, p3W - 32);
    doc.text(wrapped, 16, cursorY);
    cursorY += wrapped.length * 4.8 + 2.5;
  });

  doc.save('polypet-paint-by-numbers-kit.pdf');
}

/**
 * Generates a Multi-Frame print-ready multipage PDF:
 * Page 1: Hanging guide blueprint
 * Pages 2..N: One high-res cropped page per frame with gutter compensation,
 * outer crop marks, and Row/Column margin indices.
 */
export function downloadMultiFramePdf(
  triangles: TriangleData[],
  width: number,
  height: number,
  grid: FrameGridPreset,
  gutterPercent: number,
  showMesh: boolean,
  locale: Locale
): void {
  const copy = PDF_COPY[locale];
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Render crisp master artwork to an offscreen canvas (high-res 2400px long side)
  const masterScale = 2400 / Math.max(width, height);
  const masterW = Math.round(width * masterScale);
  const masterH = Math.round(height * masterScale);
  const masterCanvas = document.createElement('canvas');
  masterCanvas.width = masterW;
  masterCanvas.height = masterH;
  const masterCtx = masterCanvas.getContext('2d');
  if (!masterCtx) return;

  renderTrianglesToCanvas(masterCtx, masterW, masterH, {
    triangles,
    width,
    height,
    mode: 'color',
    showMesh,
  });

  // Compute physical gutter compensation in master pixel space
  const gutterPx = Math.round(Math.min(masterW, masterH) * (gutterPercent / 100));
  const totalGutterX = gutterPx * (grid.cols - 1);
  const totalGutterY = gutterPx * (grid.rows - 1);
  const tileSrcW = (masterW - totalGutterX) / grid.cols;
  const tileSrcH = (masterH - totalGutterY) / grid.rows;

  // --- PAGE 1: WALL HANGING BLUEPRINT ---
  const pW = doc.internal.pageSize.getWidth();
  const pH = doc.internal.pageSize.getHeight();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(24, 24, 27);
  doc.text(copy.mfPlanTitle, 16, 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(113, 113, 122);
  doc.text(`${copy.mfPlanSub} (${grid.cols} × ${grid.rows})`, 16, 26);

  const previewAvailW = pW - 36;
  const previewAvailH = pH - 72;
  const bpScale = Math.min(previewAvailW / masterW, previewAvailH / masterH);
  const bpW = masterW * bpScale;
  const bpH = masterH * bpScale;
  const bpX = (pW - bpW) / 2;
  const bpY = 38 + (previewAvailH - bpH) / 2;

  const tileCanvas = document.createElement('canvas');
  tileCanvas.width = Math.max(10, Math.round(tileSrcW));
  tileCanvas.height = Math.max(10, Math.round(tileSrcH));
  const tileCtx = tileCanvas.getContext('2d');
  if (!tileCtx) return;

  const tileDataUrls: { row: number; col: number; dataUrl: string }[] = [];

  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const sx = c * (tileSrcW + gutterPx);
      const sy = r * (tileSrcH + gutterPx);

      tileCtx.clearRect(0, 0, tileCanvas.width, tileCanvas.height);
      tileCtx.drawImage(
        masterCanvas,
        sx,
        sy,
        tileSrcW,
        tileSrcH,
        0,
        0,
        tileCanvas.width,
        tileCanvas.height
      );

      const dataUrl = tileCanvas.toDataURL('image/jpeg', 0.94);
      tileDataUrls.push({ row: r + 1, col: c + 1, dataUrl });

      // Place mini tile onto Page 1 blueprint
      const bx = bpX + sx * bpScale;
      const by = bpY + sy * bpScale;
      const bw = tileSrcW * bpScale;
      const bh = tileSrcH * bpScale;
      doc.addImage(dataUrl, 'JPEG', bx, by, bw, bh);
      doc.setDrawColor(24, 24, 27);
      doc.setLineWidth(0.4);
      doc.rect(bx, by, bw, bh, 'S');

      // Label center
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(bx + bw / 2 - 9, by + bh / 2 - 4, 18, 8, 1, 1, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(24, 24, 27);
      doc.text(`${r + 1}-${c + 1}`, bx + bw / 2, by + bh / 2 + 0.5, {
        align: 'center',
        baseline: 'middle',
      });
    }
  }

  // --- PAGES 2..N: INDIVIDUAL FRAME TILES WITH CROP MARKS ---
  const tileLandscape = tileSrcW > tileSrcH * 1.05;
  tileDataUrls.forEach((tile, idx) => {
    doc.addPage('a4', tileLandscape ? 'landscape' : 'portrait');
    const tpW = doc.internal.pageSize.getWidth();
    const tpH = doc.internal.pageSize.getHeight();
    const margin = 16;
    const maxW = tpW - margin * 2;
    const maxH = tpH - margin * 2 - 14;
    const tScale = Math.min(maxW / tileSrcW, maxH / tileSrcH);
    const drawW = tileSrcW * tScale;
    const drawH = tileSrcH * tScale;
    const drawX = (tpW - drawW) / 2;
    const drawY = margin + 6 + (maxH - drawH) / 2;

    // Header coordinates in outer print margin
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(24, 24, 27);
    doc.text(
      `${copy.mfRow} ${tile.row} · ${copy.mfCol} ${tile.col}  (${idx + 1}/${tileDataUrls.length})`,
      margin,
      11
    );

    doc.addImage(tile.dataUrl, 'JPEG', drawX, drawY, drawW, drawH);
    drawCropMarks(doc, drawX, drawY, drawW, drawH);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(113, 113, 122);
    doc.text(copy.mfTileFooter, tpW / 2, tpH - 7, { align: 'center' });
  });

  doc.save(`polypet-multiframe-${grid.id}.pdf`);
}
