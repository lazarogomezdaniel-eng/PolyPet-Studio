import type {
  AspectRatioOption,
  FrameFinish,
  FrameGridId,
  Locale,
  PaletteId,
  UnifyBgTone,
} from '../engine/types';

export interface Messages {
  nav: {
    studio: string;
    modes: string;
    pricing: string;
    uploadCta: string;
  };
  hero: {
    kicker: string;
    title: string;
    subtitle: string;
    uploadBtn: string;
    trySampleLabel: string;
  };
  studio: {
    modeColor: string;
    modePbn: string;
    modeMultiframe: string;
    tabBrushes: string;
    tabGeometry: string;
    tabColor: string;
    tabFrames: string;
    tabPbn: string;
    brushDetail: string;
    brushDetailHint: string;
    brushSimplify: string;
    brushSimplifyHint: string;
    brushUnifyBg: string;
    brushViewOnly: string;
    brushSize: string;
    detailBrushSize: string;
    detailTrianglesLabel: string;
    detailTrianglesScaleLow: string;
    detailTrianglesScaleHigh: string;
    detailNoStrokesHint: string;
    otherBrushSize: string;
    brushPolarityLabel: string;
    brushPolarityAdd: string;
    brushPolaritySub: string;
    brushPolarityHint: string;
    showBrushMask: string;
    undo: string;
    clearStrokes: string;
    bgSectionTitle: string;
    bgAutoToggle: string;
    bgToleranceLabel: string;
    unifyStrengthLabel: string;
    unifyStrengthLow: string;
    unifyStrengthHigh: string;
    bgFillLabel: string;
    bgHint: string;
    holdOriginal: string;
    splitCompare: string;
    trianglesUnit: string;
    densityLabel: string;
    densityLow: string;
    densityMed: string;
    densityHigh: string;
    edgeLabel: string;
    aspectLabel: string;
    paletteLabel: string;
    meshLabel: string;
    pbnColorsLabel: string;
    pbnReferenceToggle: string;
    pbnLineArtToggle: string;
    pbnLegendHint: string;
    pbnClearHighlight: string;
    multiframeGridLabel: string;
    gutterLabel: string;
    frameFinishLabel: string;
    dropHint: string;
    changePhoto: string;
    freePreviewBtn: string;
    storyExportBtn: string;
    unlockExportBtn: string;
    storySignature: string;
    savedNotice: string;
    recalculating: string;
    brushTipBanner: string;
  };
  aspectRatios: Record<AspectRatioOption, string>;
  palettes: Record<PaletteId, string>;
  frameGrids: Record<FrameGridId, string>;
  frameFinishes: Record<FrameFinish, string>;
  unifyTones: Record<UnifyBgTone, string>;
  samples: {
    aussie: { name: string; tag: string };
    black: { name: string; tag: string };
    white: { name: string; tag: string };
  };
  showcase: {
    heading: string;
    subheading: string;
    items: {
      index: string;
      title: string;
      description: string;
      detail: string;
    }[];
  };
  pricing: {
    heading: string;
    subheading: string;
    oneTime: string;
    selectPlan: string;
    tiers: {
      id: 'hd' | 'pbn' | 'bundle';
      name: string;
      price: string;
      tagline: string;
      features: string[];
    }[];
  };
  modal: {
    title: string;
    subtitle: string;
    tabDigital: string;
    tabPrintify: string;
    instantExportsHeading: string;
    instantExportsNote: string;
    downloadSvg: string;
    downloadPng300: string;
    downloadPbnPdf: string;
    downloadMultiFramePdf: string;
    generating: string;
    printifyTitle: string;
    printifyDesc: string;
    emailPlaceholder: string;
    countryLabel: string;
    requestPrintBtn: string;
    requestSentTitle: string;
    requestSentDesc: string;
    close: string;
    privacyNote: string;
    unlockCta: string;
    unlockedBadge: string;
    redirectingCheckout: string;
    verifyingPayment: string;
    paymentVerifiedTitle: string;
    paymentVerifiedDesc: string;
    paymentCancelledNotice: string;
    paymentErrorNotice: string;
    stripeNotConfiguredNotice: string;
    lockedExportHint: string;
    freePreviewNote: string;
  };
  footer: {
    tagline: string;
    privacy: string;
    copyright: string;
  };
}

export const MESSAGES: Record<Locale, Messages> = {
  es: {
    nav: {
      studio: 'Estudio',
      modes: 'Formatos',
      pricing: 'Ediciones',
      uploadCta: 'Subir foto',
    },
    hero: {
      kicker: 'Geometría computacional local · Sin IA generativa',
      title: 'Retratos geométricos de tu mascota, con precisión de estudio',
      subtitle:
        'Pasa el pincel por los ojos y el hocico para concentrar triángulos finos donde vive la expresión, o transforma el retrato en un kit imprimible de Pintar por Números y mural multimarco.',
      uploadBtn: 'Subir tu fotografía',
      trySampleLabel: 'Probar con retratos reales:',
    },
    studio: {
      modeColor: 'Retrato Color',
      modePbn: 'Pintar por Números',
      modeMultiframe: 'Multimarco',
      tabBrushes: 'Pinceles',
      tabGeometry: 'Geometría',
      tabColor: 'Color',
      tabFrames: 'Marcos',
      tabPbn: 'Lámina',
      brushDetail: 'Pinceles de Estudio',
      brushDetailHint: 'Ojos / Detalle',
      brushSimplify: 'Simplificar',
      brushSimplifyHint: 'Fondo amplio',
      brushUnifyBg: 'Unificar zona',
      brushViewOnly: 'Explorar',
      brushSize: 'Tamaño',
      detailBrushSize: 'Diámetro pincel ojos',
      detailTrianglesLabel: 'Triángulos en zona ojos / detalle',
      detailTrianglesScaleLow: 'Más grandes',
      detailTrianglesScaleHigh: 'Ultra finos',
      detailNoStrokesHint: 'Pinta primero sobre los ojos o el hocico para notar el cambio.',
      otherBrushSize: 'Diámetro pincel zona',
      brushPolarityLabel: 'Máscara',
      brushPolarityAdd: 'Añadir',
      brushPolaritySub: 'Quitar',
      brushPolarityHint: 'Alternar añadir / quitar (tecla X o mantén Alt)',
      showBrushMask: 'Ver mapa',
      undo: 'Deshacer',
      clearStrokes: 'Limpiar',
      bgSectionTitle: 'Unificación selectiva por zonas',
      bgAutoToggle: 'Detectar fondo auto (suave)',
      bgToleranceLabel: 'Alcance automático',
      unifyStrengthLabel: 'Sutileza de unificación',
      unifyStrengthLow: 'Muy sutil',
      unifyStrengthHigh: 'Uniforme',
      bgFillLabel: 'Tono de la zona seleccionada',
      bgHint: 'Pinta solo la zona que quieras armonizar; cada zona toma su propio tono local con transición suave.',
      holdOriginal: 'Ver original',
      splitCompare: 'Antes / Después',
      trianglesUnit: 'triángulos',
      densityLabel: 'Densidad de malla',
      densityLow: 'Bajo',
      densityMed: 'Medio',
      densityHigh: 'Alto',
      edgeLabel: 'Sensibilidad de bordes',
      aspectLabel: 'Formato de recorte',
      paletteLabel: 'Paleta cromática',
      meshLabel: 'Línea fina de malla',
      pbnColorsLabel: 'Número de colores',
      pbnReferenceToggle: 'Ver referencia a color',
      pbnLineArtToggle: 'Ver lámina numerada',
      pbnLegendHint: 'Pulsa un tono para iluminar sus triángulos en el lienzo',
      pbnClearHighlight: 'Mostrar todos',
      multiframeGridLabel: 'Composición de pared',
      gutterLabel: 'Separación entre marcos',
      frameFinishLabel: 'Acabado del marco',
      dropHint: 'Suelta una foto aquí para cargarla',
      changePhoto: 'Cambiar foto',
      freePreviewBtn: 'Vista previa PNG',
      storyExportBtn: 'Tarjeta Stories 9:16',
      unlockExportBtn: 'Exportar HD y PDF imprenta',
      storySignature: 'Creado en polypetstudio.com',
      savedNotice: 'Proyecto guardado localmente',
      recalculating: 'Calculando geometría',
      brushTipBanner: 'Pinta directamente sobre los ojos y la nariz para multiplicar el detalle geométrico.',
    },
    aspectRatios: {
      original: 'Original',
      '1:1': '1:1 Cuadrado',
      '4:5': '4:5 Vertical',
      '3:4': '3:4 Póster',
      a4: 'DIN A',
    },
    palettes: {
      natural: 'Natural',
      editorial: 'Cálido Editorial',
      pastel: 'Pastel Suave',
      popart: 'Pop-Art Warhol',
      wpap: 'Pop-Art Arcoíris (WPAP)',
      graphite: 'Monocromo Grafito',
    },
    frameGrids: {
      '1x1': '1 Marco',
      '2x1': 'Díptico 2×1',
      '3x1': 'Tríptico 3×1',
      '2x2': 'Cuadrícula 2×2',
      '3x2': 'Mosaico 3×2',
      '4x3': 'Galería 4×3',
    },
    frameFinishes: {
      oak: 'Roble natural',
      black: 'Negro mate',
      white: 'Blanco galería',
      frameless: 'Sin marco',
    },
    unifyTones: {
      exterior: 'Tono local',
      white: 'Blanco',
      paper: 'Papel cálido',
      dark: 'Grafito',
    },
    samples: {
      aussie: { name: 'Pastor Australiano', tag: 'Tricolor pelo largo' },
      black: { name: 'Labrador Negro', tag: 'Pelaje oscuro' },
      white: { name: 'Samoyedo Blanco', tag: 'Pelaje claro' },
    },
    showcase: {
      heading: 'Tres ediciones desde el mismo motor geométrico',
      subheading:
        'Todo el cálculo de bordes Sobel, triangulación de Delaunay y cuantización perceptual CIE Lab ocurre en tu navegador sin alterar los rasgos reales de tu perro.',
      items: [
        {
          index: '01.',
          title: 'Retrato Geométrico HD',
          description:
            'Archivo vectorial SVG sin costuras y PNG a 300 DPI listo para enmarcar hasta tamaño A2, con control táctil sobre mirada, hocico y fondo.',
          detail: 'SVG vectorial · PNG 300 DPI · 6 paletas',
        },
        {
          index: '02.',
          title: 'Kit Pintar por Números',
          description:
            'Reduce la obra a 12, 16 o 20 tonos puros en CIE Lab, limpia el relleno y coloca cada número en el incentro matemático exacto del triángulo.',
          detail: 'PDF A4 de 3 páginas · Leyenda HEX · Guía paso a paso',
        },
        {
          index: '03.',
          title: 'Mural Multimarco',
          description:
            'Divide el retrato en composiciones de 2 a 12 piezas con compensación física del hueco entre marcos y marcas de corte profesionales.',
          detail: 'PDF multipágina · Plano de pared · Compensación de hueco',
        },
      ],
    },
    pricing: {
      heading: 'Ediciones digitales de pago único',
      subheading:
        'Sin suscripciones ni cuentas obligatorias. Descarga archivos maestros limpios listos para imprenta o solicita envío enmarcado desde la Unión Europea.',
      oneTime: 'Pago único',
      selectPlan: 'Abrir centro de exportación',
      tiers: [
        {
          id: 'hd',
          name: 'Retrato HD',
          price: '9 €',
          tagline: 'Ideal para imprimir en lámina hasta A2',
          features: [
            'PNG a 300 DPI sin marca de agua',
            'Archivo vectorial SVG escalable infinito',
            'Todas las paletas editoriales incluidas',
          ],
        },
        {
          id: 'pbn',
          name: 'Kit Pintar por Números',
          price: '12 €',
          tagline: 'Regalo artesanal listo para imprimir y pintar',
          features: [
            'PDF vectorial A4 de 3 páginas listo para imprenta',
            'Lámina numerada con incentros exactos',
            'Referencia a color + tabla cromática HEX',
          ],
        },
        {
          id: 'bundle',
          name: 'Pack Estudio Completo',
          price: '19 €',
          tagline: 'Todo el estudio más murales multimarco',
          features: [
            'Retrato HD (SVG + PNG 300 DPI)',
            'Kit completo Pintar por Números (PDF 3 págs.)',
            'Pack Multimarco PDF con marcas de corte',
          ],
        },
      ],
    },
    modal: {
      title: 'Exportación de Imprenta y Cuadros',
      subtitle: 'Tus archivos se generan al instante desde la geometría vectorial exacta de tu retrato.',
      tabDigital: 'Descargas Maestras (Digital)',
      tabPrintify: 'Pedir impreso en cuadro (Envío UE)',
      instantExportsHeading: 'Archivos maestros de imprenta',
      instantExportsNote:
        'Tu proyecto actual se ha respaldado en IndexedDB. Desbloquea una edición con pago único para descargar los archivos maestros sin marca de agua.',
      downloadSvg: 'Descargar SVG Vectorial Puro',
      downloadPng300: 'Descargar PNG 300 DPI (Alta Resolución)',
      downloadPbnPdf: 'Descargar PDF Kit Pintar por Números (3 págs.)',
      downloadMultiFramePdf: 'Descargar PDF Pack Multimarco (con marcas de corte)',
      generating: 'Generando archivo…',
      printifyTitle: 'Impresión artística bajo demanda en la Unión Europea',
      printifyDesc:
        'Producción en laboratorios europeos (DE/NL/ES) en papel algodón 250 g/m² o lienzo con bastidor, sin aduanas. Déjanos tu correo para activar tu pedido con este diseño exacto.',
      emailPlaceholder: 'tu@correo.com',
      countryLabel: 'País de envío (UE)',
      requestPrintBtn: 'Solicitar aviso de impresión UE',
      requestSentTitle: 'Solicitud registrada con tu diseño',
      requestSentDesc:
        'Hemos guardado las especificaciones de tu retrato y formato elegido. Te avisaremos en cuanto se active el pedido directo con Printify UE.',
      close: 'Cerrar',
      privacyNote: 'Privacidad por diseño: tu foto nunca se sube a servidores externos; todo el cálculo ocurre en tu dispositivo.',
      unlockCta: 'Desbloquear',
      unlockedBadge: 'Desbloqueado',
      redirectingCheckout: 'Abriendo Stripe Checkout…',
      verifyingPayment: 'Verificando pago y restaurando tu proyecto…',
      paymentVerifiedTitle: 'Pago confirmado — Descargas maestras desbloqueadas',
      paymentVerifiedDesc: 'Tu proyecto se ha restaurado desde IndexedDB. Ya puedes descargar tus archivos de imprenta.',
      paymentCancelledNotice: 'Pago cancelado. Tu retrato sigue intacto en el estudio.',
      paymentErrorNotice: 'No se pudo verificar el pago. Comprueba tu sesión o inténtalo de nuevo.',
      stripeNotConfiguredNotice: 'Stripe Checkout aún no está configurado en el servidor (falta STRIPE_SECRET_KEY).',
      lockedExportHint: 'Desbloquea con',
      freePreviewNote: 'La vista previa PNG y la tarjeta Stories 9:16 siguen siendo gratuitas desde el panel lateral.',
    },
    footer: {
      tagline: 'Retratos geométricos Low Poly y Pintar por Números · 100 % en navegador',
      privacy: 'Procesamiento local sin almacenamiento de fotos en servidor',
      copyright: '© 2026 PolyPet Studio',
    },
  },

  en: {
    nav: {
      studio: 'Studio',
      modes: 'Formats',
      pricing: 'Editions',
      uploadCta: 'Upload photo',
    },
    hero: {
      kicker: 'Local computational geometry · Zero generative AI',
      title: 'Geometric pet portraits crafted with studio precision',
      subtitle:
        'Paint over the eyes and nose to concentrate fine triangles where expression lives, or turn your portrait into a printable Paint by Numbers kit and multi-frame wall mural.',
      uploadBtn: 'Upload your photo',
      trySampleLabel: 'Try with real studio portraits:',
    },
    studio: {
      modeColor: 'Color Portrait',
      modePbn: 'Paint by Numbers',
      modeMultiframe: 'Multi-Frame',
      tabBrushes: 'Brushes',
      tabGeometry: 'Geometry',
      tabColor: 'Color',
      tabFrames: 'Frames',
      tabPbn: 'Sheet',
      brushDetail: 'Studio Brushes',
      brushDetailHint: 'Eyes / Detail',
      brushSimplify: 'Simplify',
      brushSimplifyHint: 'Broad backdrop',
      brushUnifyBg: 'Unify zone',
      brushViewOnly: 'Inspect',
      brushSize: 'Size',
      detailBrushSize: 'Eyes brush diameter',
      detailTrianglesLabel: 'Triangle size in eyes / detail zone',
      detailTrianglesScaleLow: 'Larger',
      detailTrianglesScaleHigh: 'Ultra fine',
      detailNoStrokesHint: 'Paint over the eyes or nose first to see live subdivision.',
      otherBrushSize: 'Zone brush diameter',
      brushPolarityLabel: 'Mask',
      brushPolarityAdd: 'Add',
      brushPolaritySub: 'Subtract',
      brushPolarityHint: 'Swap add / subtract (press X or hold Alt)',
      showBrushMask: 'Show map',
      undo: 'Undo',
      clearStrokes: 'Clear',
      bgSectionTitle: 'Selective zone harmonization',
      bgAutoToggle: 'Soft auto backdrop',
      bgToleranceLabel: 'Auto reach',
      unifyStrengthLabel: 'Unification subtlety',
      unifyStrengthLow: 'Very subtle',
      unifyStrengthHigh: 'Uniform',
      bgFillLabel: 'Selected zone tone',
      bgHint: 'Paint only the zones you want to calm; each area harmonizes softly to its own local tone.',
      holdOriginal: 'Hold original',
      splitCompare: 'Before / After',
      trianglesUnit: 'triangles',
      densityLabel: 'Mesh density',
      densityLow: 'Low',
      densityMed: 'Medium',
      densityHigh: 'High',
      edgeLabel: 'Edge sensitivity',
      aspectLabel: 'Crop aspect ratio',
      paletteLabel: 'Color palette',
      meshLabel: 'Fine mesh wireframe',
      pbnColorsLabel: 'Number of colors',
      pbnReferenceToggle: 'View color reference',
      pbnLineArtToggle: 'View numbered sheet',
      pbnLegendHint: 'Click a swatch to highlight its triangles on canvas',
      pbnClearHighlight: 'Show all',
      multiframeGridLabel: 'Wall gallery grid',
      gutterLabel: 'Physical frame gap',
      frameFinishLabel: 'Frame finish',
      dropHint: 'Drop a photo here to load it',
      changePhoto: 'Change photo',
      freePreviewBtn: 'Preview PNG',
      storyExportBtn: '9:16 Story Card',
      unlockExportBtn: 'Export HD & Print PDF',
      storySignature: 'Created with polypetstudio.com',
      savedNotice: 'Saved locally',
      recalculating: 'Computing geometry',
      brushTipBanner: 'Paint directly across eyes and snout to concentrate fine geometric detail.',
    },
    aspectRatios: {
      original: 'Original',
      '1:1': '1:1 Square',
      '4:5': '4:5 Portrait',
      '3:4': '3:4 Poster',
      a4: 'ISO A',
    },
    palettes: {
      natural: 'Natural',
      editorial: 'Warm Editorial',
      pastel: 'Soft Pastel',
      popart: 'Warhol Pop-Art',
      wpap: 'Rainbow Pop-Art (WPAP)',
      graphite: 'Graphite Mono',
    },
    frameGrids: {
      '1x1': '1 Frame',
      '2x1': 'Diptych 2×1',
      '3x1': 'Triptych 3×1',
      '2x2': 'Grid 2×2',
      '3x2': 'Mosaic 3×2',
      '4x3': 'Gallery 4×3',
    },
    frameFinishes: {
      oak: 'Natural Oak',
      black: 'Matte Black',
      white: 'Gallery White',
      frameless: 'Frameless',
    },
    unifyTones: {
      exterior: 'Local tone',
      white: 'White',
      paper: 'Warm Paper',
      dark: 'Charcoal',
    },
    samples: {
      aussie: { name: 'Australian Shepherd', tag: 'Tricolor long coat' },
      black: { name: 'Black Labrador', tag: 'Dark coat' },
      white: { name: 'White Samoyed', tag: 'Bright coat' },
    },
    showcase: {
      heading: 'Three studio editions from one geometric engine',
      subheading:
        'Sobel edge detection, Delaunay triangulation, and perceptual CIE Lab quantization run entirely in your browser while preserving your dog’s true features.',
      items: [
        {
          index: '01.',
          title: 'HD Geometric Portrait',
          description:
            'Seamless vector SVG and 300 DPI PNG ready for framing up to A2 size, with tactile control over eyes, snout, and background.',
          detail: 'Vector SVG · 300 DPI PNG · 6 palettes',
        },
        {
          index: '02.',
          title: 'Paint by Numbers Kit',
          description:
            'Quantizes colors into 12, 16, or 20 clean CIE Lab tones, removes fills, and places every index at the exact mathematical incenter.',
          detail: '3-page A4 PDF · HEX legend · Step-by-step guide',
        },
        {
          index: '03.',
          title: 'Multi-Frame Wall Mural',
          description:
            'Splits your portrait across 2 to 12 coordinated frames with physical gutter compensation and print-shop corner crop marks.',
          detail: 'Multi-page PDF · Wall blueprint · Gutter compensation',
        },
      ],
    },
    pricing: {
      heading: 'One-time digital print editions',
      subheading:
        'No subscriptions or accounts required. Download clean print-ready master files or request EU framed printing.',
      oneTime: 'One-time',
      selectPlan: 'Open export center',
      tiers: [
        {
          id: 'hd',
          name: 'HD Portrait',
          price: '€9',
          tagline: 'Ideal for fine-art prints up to A2',
          features: [
            'Watermark-free 300 DPI PNG',
            'Infinitely scalable vector SVG',
            'All 6 curated color palettes included',
          ],
        },
        {
          id: 'pbn',
          name: 'Paint by Numbers Kit',
          price: '€12',
          tagline: 'Handcrafted printable painting kit',
          features: [
            'Print-ready 3-page A4 vector PDF',
            'Incenter-aligned numbered line art',
            'Color reference + HEX palette guide',
          ],
        },
        {
          id: 'bundle',
          name: 'Full Studio Pack',
          price: '€19',
          tagline: 'Complete studio plus multi-frame murals',
          features: [
            'HD Portrait (SVG + 300 DPI PNG)',
            'Full 3-page Paint by Numbers PDF',
            'Multi-Frame print PDF with crop marks',
          ],
        },
      ],
    },
    modal: {
      title: 'Print Export & Framed Prints',
      subtitle: 'Master files are generated directly from your portrait’s exact vector triangle geometry.',
      tabDigital: 'Master Downloads (Digital)',
      tabPrintify: 'Order Framed Print (EU Shipping)',
      instantExportsHeading: 'Print-ready master files',
      instantExportsNote:
        'Your current project is backed up in IndexedDB. Unlock any one-time edition to download watermark-free master files.',
      downloadSvg: 'Download Pure Vector SVG',
      downloadPng300: 'Download 300 DPI Print PNG',
      downloadPbnPdf: 'Download Paint by Numbers PDF (3 pages)',
      downloadMultiFramePdf: 'Download Multi-Frame PDF (with crop marks)',
      generating: 'Generating file…',
      printifyTitle: 'On-demand fine art printing in the EU',
      printifyDesc:
        'Printed locally in EU studios (DE/NL/ES) on 250 gsm cotton paper or stretched gallery canvas with zero customs duties. Leave your email to reserve your framed print.',
      emailPlaceholder: 'you@email.com',
      countryLabel: 'Shipping country (EU)',
      requestPrintBtn: 'Join EU print waitlist',
      requestSentTitle: 'Print request saved with your artwork',
      requestSentDesc:
        'We recorded your chosen frame format and layout. We will notify you as soon as direct Printify EU fulfillment opens.',
      close: 'Close',
      privacyNote: 'Privacy by design: your photograph never leaves your browser; all computation runs locally.',
      unlockCta: 'Unlock',
      unlockedBadge: 'Unlocked',
      redirectingCheckout: 'Opening Stripe Checkout…',
      verifyingPayment: 'Verifying payment & restoring your project…',
      paymentVerifiedTitle: 'Payment confirmed — Master downloads unlocked',
      paymentVerifiedDesc: 'Your project was restored from IndexedDB. You can now download your print-ready files.',
      paymentCancelledNotice: 'Checkout cancelled. Your portrait remains intact in the studio.',
      paymentErrorNotice: 'Could not verify payment. Please check your session or try again.',
      stripeNotConfiguredNotice: 'Stripe Checkout is not configured on the server yet (missing STRIPE_SECRET_KEY).',
      lockedExportHint: 'Unlock with',
      freePreviewNote: 'PNG preview & 9:16 Stories card remain free in the studio sidebar.',
    },
    footer: {
      tagline: 'Geometric Low Poly portraits & Paint by Numbers · 100% in-browser',
      privacy: 'Local processing with zero server photo storage',
      copyright: '© 2026 PolyPet Studio',
    },
  },

  fr: {
    nav: {
      studio: 'Studio',
      modes: 'Formats',
      pricing: 'Éditions',
      uploadCta: 'Importer une photo',
    },
    hero: {
      kicker: 'Géométrie computationnelle locale · Sans IA générative',
      title: 'Portraits géométriques de votre animal, avec précision d’atelier',
      subtitle:
        'Passez le pinceau sur les yeux et la truffe pour concentrer les triangles fins là où vit le regard, ou transformez le portrait en kit Peinture par Numéros et mural multicadre.',
      uploadBtn: 'Importer votre photo',
      trySampleLabel: 'Essayer avec des portraits réels :',
    },
    studio: {
      modeColor: 'Portrait Couleur',
      modePbn: 'Peinture par Numéros',
      modeMultiframe: 'Multicadre',
      tabBrushes: 'Pinceaux',
      tabGeometry: 'Géométrie',
      tabColor: 'Couleur',
      tabFrames: 'Cadres',
      tabPbn: 'Planche',
      brushDetail: 'Pinceaux d’atelier',
      brushDetailHint: 'Yeux / Détail',
      brushSimplify: 'Simplifier',
      brushSimplifyHint: 'Arrière-plan',
      brushUnifyBg: 'Unifier zone',
      brushViewOnly: 'Observer',
      brushSize: 'Taille',
      detailBrushSize: 'Diamètre pinceau yeux',
      detailTrianglesLabel: 'Taille des triangles (yeux / détail)',
      detailTrianglesScaleLow: 'Plus grands',
      detailTrianglesScaleHigh: 'Ultra fins',
      detailNoStrokesHint: 'Peignez d’abord sur les yeux ou la truffe pour appliquer ce réglage.',
      otherBrushSize: 'Diamètre pinceau zone',
      brushPolarityLabel: 'Masque',
      brushPolarityAdd: 'Ajouter',
      brushPolaritySub: 'Retirer',
      brushPolarityHint: 'Inverser ajouter / retirer (touche X ou maintenez Alt)',
      showBrushMask: 'Voir carte',
      undo: 'Annuler',
      clearStrokes: 'Effacer',
      bgSectionTitle: 'Harmonisation sélective par zones',
      bgAutoToggle: 'Détecter le fond auto (doux)',
      bgToleranceLabel: 'Portée automatique',
      unifyStrengthLabel: 'Subtilité d’unification',
      unifyStrengthLow: 'Très subtil',
      unifyStrengthHigh: 'Uniforme',
      bgFillLabel: 'Teinte de la zone sélectionnée',
      bgHint: 'Peignez uniquement les zones à adoucir ; chaque zone s’harmonise vers sa propre teinte locale.',
      holdOriginal: 'Voir l’original',
      splitCompare: 'Avant / Après',
      trianglesUnit: 'triangles',
      densityLabel: 'Densité du maillage',
      densityLow: 'Bas',
      densityMed: 'Moyen',
      densityHigh: 'Élevé',
      edgeLabel: 'Sensibilité des contours',
      aspectLabel: 'Format de recadrage',
      paletteLabel: 'Palette chromatique',
      meshLabel: 'Fines lignes du maillage',
      pbnColorsLabel: 'Nombre de teintes',
      pbnReferenceToggle: 'Voir modèle couleur',
      pbnLineArtToggle: 'Voir planche numérotée',
      pbnLegendHint: 'Cliquez sur une teinte pour mettre en lumière ses triangles',
      pbnClearHighlight: 'Tout afficher',
      multiframeGridLabel: 'Composition murale',
      gutterLabel: 'Écart entre les cadres',
      frameFinishLabel: 'Finition du cadre',
      dropHint: 'Déposez une photo ici pour la charger',
      changePhoto: 'Changer de photo',
      freePreviewBtn: 'Aperçu PNG',
      storyExportBtn: 'Carte Stories 9:16',
      unlockExportBtn: 'Exporter HD et PDF impression',
      storySignature: 'Créé avec polypetstudio.com',
      savedNotice: 'Projet sauvegardé',
      recalculating: 'Calcul géométrique',
      brushTipBanner: 'Peignez sur les yeux et la truffe pour multiplier la finesse des triangles.',
    },
    aspectRatios: {
      original: 'Original',
      '1:1': '1:1 Carré',
      '4:5': '4:5 Vertical',
      '3:4': '3:4 Affiche',
      a4: 'Format A',
    },
    palettes: {
      natural: 'Naturel',
      editorial: 'Chaleur Éditoriale',
      pastel: 'Pastel Doux',
      popart: 'Pop-Art Warhol',
      wpap: 'Pop-Art Arc-en-Ciel (WPAP)',
      graphite: 'Monochrome Graphite',
    },
    frameGrids: {
      '1x1': '1 Cadre',
      '2x1': 'Diptyque 2×1',
      '3x1': 'Triptyque 3×1',
      '2x2': 'Grille 2×2',
      '3x2': 'Mosaïque 3×2',
      '4x3': 'Galerie 4×3',
    },
    frameFinishes: {
      oak: 'Chêne naturel',
      black: 'Noir mat',
      white: 'Blanc galerie',
      frameless: 'Sans cadre',
    },
    unifyTones: {
      exterior: 'Ton local',
      white: 'Blanc',
      paper: 'Papier chaud',
      dark: 'Graphite',
    },
    samples: {
      aussie: { name: 'Berger Australien', tag: 'Tricolore poil long' },
      black: { name: 'Labrador Noir', tag: 'Pelage sombre' },
      white: { name: 'Samoyède Blanc', tag: 'Pelage clair' },
    },
    showcase: {
      heading: 'Trois éditions issues du même moteur géométrique',
      subheading:
        'Détection Sobel, triangulation de Delaunay et quantification CIE Lab s’exécutent dans votre navigateur sans déformer les traits de votre compagnon.',
      items: [
        {
          index: '01.',
          title: 'Portrait Géométrique HD',
          description:
            'Fichier vectoriel SVG sans raccords blancs et PNG 300 DPI prêt à encadrer jusqu’au format A2, avec contrôle tactile du regard.',
          detail: 'SVG vectoriel · PNG 300 DPI · 6 palettes',
        },
        {
          index: '02.',
          title: 'Kit Peinture par Numéros',
          description:
            'Réduit l’œuvre en 12, 16 ou 20 tons CIE Lab purs et place chaque numéro au centre du cercle inscrit de chaque triangle.',
          detail: 'PDF A4 3 pages · Légende HEX · Guide pratique',
        },
        {
          index: '03.',
          title: 'Mural Multicadre',
          description:
            'Découpe le portrait de 2 à 12 cadres coordonnés avec compensation de l’écart physique et traits de coupe professionnels.',
          detail: 'PDF multipage · Plan mural · Compensation d’écart',
        },
      ],
    },
    pricing: {
      heading: 'Éditions numériques en paiement unique',
      subheading:
        'Sans abonnement ni création de compte. Téléchargez des fichiers prêts pour l’imprimerie ou demandez un tirage encadré en Union européenne.',
      oneTime: 'Paiement unique',
      selectPlan: 'Ouvrir le centre d’export',
      tiers: [
        {
          id: 'hd',
          name: 'Portrait HD',
          price: '9 €',
          tagline: 'Idéal pour un tirage d’art jusqu’au A2',
          features: [
            'PNG 300 DPI sans filigrane',
            'Fichier vectoriel SVG évolutif',
            'Les 6 palettes chromatiques incluses',
          ],
        },
        {
          id: 'pbn',
          name: 'Kit Peinture par Numéros',
          price: '12 €',
          tagline: 'Cadeau créatif prêt à imprimer et peindre',
          features: [
            'PDF vectoriel A4 de 3 pages prêt à imprimer',
            'Planche numérotée centrée avec précision',
            'Référence couleur + légende HEX',
          ],
        },
        {
          id: 'bundle',
          name: 'Pack Studio Complet',
          price: '19 €',
          tagline: 'Tout le studio plus les compositions multicadres',
          features: [
            'Portrait HD (SVG + PNG 300 DPI)',
            'Kit complet Peinture par Numéros (PDF 3 p.)',
            'Pack Multicadre PDF avec repères de coupe',
          ],
        },
      ],
    },
    modal: {
      title: 'Export Impression et Tirages Encadrés',
      subtitle: 'Vos fichiers sont générés instantanément à partir de la géométrie vectorielle exacte.',
      tabDigital: 'Téléchargements Maîtres (Numérique)',
      tabPrintify: 'Commander en cadre (Envoi UE)',
      instantExportsHeading: 'Fichiers maîtres d’impression',
      instantExportsNote:
        'Votre projet est sauvegardé dans IndexedDB. Débloquez une édition en paiement unique pour télécharger les fichiers maîtres sans filigrane.',
      downloadSvg: 'Télécharger le SVG Vectoriel Pur',
      downloadPng300: 'Télécharger le PNG 300 DPI',
      downloadPbnPdf: 'Télécharger le PDF Peinture par Numéros (3 pages)',
      downloadMultiFramePdf: 'Télécharger le PDF Multicadre (traits de coupe)',
      generating: 'Génération en cours…',
      printifyTitle: 'Impression d’art à la demande dans l’Union européenne',
      printifyDesc:
        'Production locale en Europe (DE/NL/ES) sur papier coton 250 g/m² ou toile sur châssis sans frais de douane.',
      emailPlaceholder: 'vous@email.com',
      countryLabel: 'Pays de livraison (UE)',
      requestPrintBtn: 'S’inscrire pour le tirage UE',
      requestSentTitle: 'Demande enregistrée avec votre création',
      requestSentDesc:
        'Nous avons conservé le format choisi et vous préviendrons dès l’ouverture directe avec Printify UE.',
      close: 'Fermer',
      privacyNote: 'Confidentialité native : votre photo reste sur votre appareil et n’est jamais envoyée sur un serveur.',
      unlockCta: 'Débloquer',
      unlockedBadge: 'Débloqué',
      redirectingCheckout: 'Ouverture de Stripe Checkout…',
      verifyingPayment: 'Vérification du paiement et restauration du projet…',
      paymentVerifiedTitle: 'Paiement confirmé — Téléchargements maîtres débloqués',
      paymentVerifiedDesc: 'Votre projet a été restauré depuis IndexedDB. Vous pouvez télécharger vos fichiers d’impression.',
      paymentCancelledNotice: 'Paiement annulé. Votre portrait reste intact dans le studio.',
      paymentErrorNotice: 'Impossible de vérifier le paiement. Veuillez réessayer.',
      stripeNotConfiguredNotice: 'Stripe Checkout n’est pas encore configuré sur le serveur (STRIPE_SECRET_KEY manquant).',
      lockedExportHint: 'Débloquer avec',
      freePreviewNote: 'L’aperçu PNG et la carte Stories 9:16 restent gratuits dans le panneau latéral.',
    },
    footer: {
      tagline: 'Portraits géométriques Low Poly et Peinture par Numéros · 100 % navigateur',
      privacy: 'Traitement local sans stockage serveur',
      copyright: '© 2026 PolyPet Studio',
    },
  },
};

export function detectInitialLocale(): Locale {
  if (typeof navigator === 'undefined') return 'es';
  const lang = (navigator.language || 'es').toLowerCase();
  if (lang.startsWith('fr')) return 'fr';
  if (lang.startsWith('en')) return 'en';
  return 'es';
}
