# Reglas del proyecto PolyPet Studio

Estas reglas permanecen activas para cualquier agente que trabaje sobre este repositorio en Google Antigravity.

## 1. CERO IA GENERATIVA
- Todo el procesamiento gráfico debe ser **100 % algorítmico en cliente** (geometría computacional con TypeScript, HTML5 Canvas 2D, Web Workers y `delaunator`).
- Nunca integrar APIs externas de generación o edición de imágenes por IA ni subir fotografías de los usuarios a servidores externos para procesarlas.

## 2. RENDIMIENTO MÓVIL (60 FPS)
- Los cálculos pesados (filtro Sobel, recorte de fondo perceptual CIE Lab, muestreo ponderado de vértices, triangulación de Delaunay y cuantización K-Means++) deben ejecutarse **siempre dentro del Web Worker** (`src/engine/lowpoly.worker.ts`) para que los trazos del pincel táctil nunca se congelen.
- Mantener `touch-action: none` en el lienzo interactivo para evitar desplazamientos accidentales en pantallas táctiles.

## 3. CALIDAD ARTÍSTICA E IMPRENTA
- Cuando el fondo está activo, los triángulos deben cubrir el **100 % del área de recorte** incluyendo esquinas y bordes sin huecos.
- Cuando se elimina el fondo (recorte automático o pinceles *Borrar fondo* / *Restaurar*), inyectar vértices en la silueta del animal, descartar los triángulos de fondo y respetar transparencia alfa real en SVG y PNG 300 DPI.
- Al renderizar triángulos en color en Canvas (`src/engine/renderer.ts`) y SVG (`src/engine/exporters.ts`), aplicar siempre un micro-trazo del mismo color de relleno (`0.65 px`) para evitar costuras blancas (*anti-aliasing seams*).
- En el modo **Pintar por Números**, calcular siempre el **incentro matemático** e inradio de cada triángulo (`src/engine/paintByNumbers.ts`) para centrar cada número sin pisar bordes.

## 4. DISEÑO EDITORIAL LIMPIO
- Mantener la estética minimalista y editorial del estudio: fondo cálido neutro (`#F8F7F4`), superficies blancas con divisores finos (`#E4E2DC`), tinta grafito (`#18181B`), acento terracota (`#C2410C`), tipografía `Fraunces` + `Plus Jakarta Sans` + `JetBrains Mono` (`tabular-nums`).
- Conservar el soporte multilingüe en **Español, Inglés y Francés** (`src/i18n/messages.ts`) en cualquier nuevo texto visible.

## 5. ARQUITECTURA ACTUAL DEL REPOSITORIO
- Stack actual: **React 19 + Vite + TypeScript + Tailwind CSS v4** (no migrar a Next.js salvo petición explícita).
- Fases ya implementadas:
  - **Fase 1:** Motor Low Poly en Web Worker, Pincel de Detalle / Simplificar, 5 paletas en CIE Lab, comparador *Antes / Después* y vista previa PNG / Stories 9:16.
  - **Fase 2:** Modo *Pintar por Números* (12/16/20 tonos + PDF 3 páginas A4), modo *Multimarco* (simulador de pared + compensación de hueco + PDF multipágina con marcas de corte), idiomas ES/EN/FR y **borrado de fondo automático y manual**.
  - **Persistencia local:** Respaldo del proyecto en IndexedDB (`src/lib/projectStorage.ts`) y catálogo tipado para Printify UE (`src/lib/printify.ts`).
- **Para implementar Fase 3 (Monetización con Stripe Checkout):**
  - Añadir rutas `/api/checkout` y `/api/verify` mediante servidor Express (`server.ts`) o Vercel Serverless Functions (`/api/*.ts`).
  - Nunca hardcodear claves secretas en el código cliente; usar variables de entorno documentadas en `.env.example`.
  - Mantener la recuperación del proyecto desde IndexedDB al regresar de Stripe Checkout.

## 6. VERIFICACIÓN VISUAL OBLIGATORIA
- Tras cualquier cambio relevante, ejecutar `npm run build` y `npm run lint` (`tsc --noEmit`), abrir la aplicación en el navegador y comprobar visualmente el renderizado en escritorio y móvil sin errores de consola.
