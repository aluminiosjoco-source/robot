--- hex-eyes-engine/src/main.ts
/**
 * main.ts — Punto de entrada y orquestación del motor
 *
 * [FASE] 5 — Orquestación / Estado
 * [CRITERIO DE ACEPTACIÓN]
 *   - 60fps sostenidos 60s sin memory leak
 *   - Heap estable en DevTools
 *   - dispose() limpia todos los listeners y rAF
 */

import { DEFAULT_CONFIG, type EngineConfig, type Vec2, type FrameData } from './core/types';
import { HexCoords } from './grid/HexCoords';
import { SpiralLayout } from './grid/SpiralLayout';
import { LensDistortion } from './grid/LensDistortion';
import { RenderPipeline } from './render/RenderPipeline';
import { SpriteCache } from './render/SpriteCache';
import { generateTestEyesGrid } from './data/fakeDataGenerator';

// Configuración de alias (se resuelve con vite.config.ts)
// @core -> ./core
// @grid -> ./grid
// @tracking -> ./tracking
// @interaction -> ./interaction
// @render -> ./render
// @state -> ./state

/**
 * Inicializa el motor hexagonal
 *
 * @param canvasIds - IDs de los canvases para grid, satélites y líneas
 * @returns Objeto con clock, camera y dispose()
 */
export function bootstrap(canvasIds: { grid: string; sat: string; line: string }): {
  clock: IAnimationClock;
  camera: CameraState;
  dispose: () => void;
} {
  console.log('[HexEyes] Bootstrap iniciado', canvasIds);

  // Obtiene elementos del DOM
  const gridCanvas = document.getElementById(canvasIds.grid) as HTMLCanvasElement;
  const satCanvas = document.getElementById(canvasIds.sat) as HTMLCanvasElement;
  const lineCanvas = document.getElementById(canvasIds.line) as HTMLCanvasElement;

  if (!gridCanvas || !satCanvas || !lineCanvas) {
    throw new Error(`[HexEyes] Canvas no encontrado: ${JSON.stringify(canvasIds)}`);
  }

  // Configura tamaños de canvas con DPR (Device Pixel Ratio)
  const resizeCanvases = () => {
    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;

    for (const canvas of [gridCanvas, satCanvas, lineCanvas]) {
      // Resolución física (escalada por DPR)
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      // Dimensión CSS (tamaño lógico)
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';

      // Escala el contexto para coordenadas lógicas
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    }
  };

  resizeCanvases();
  window.addEventListener('resize', resizeCanvases);

  // Inicializa sistemas core
  const hexSize = DEFAULT_CONFIG.hexSizeBase / 2;
  const coords = new HexCoords({ hexSize });
  const spiral = new SpiralLayout();
  const lens = new LensDistortion({
    strength01: DEFAULT_CONFIG.lensStrength,
    falloffRadiusPx: DEFAULT_CONFIG.lensFalloff,
    maxScale: DEFAULT_CONFIG.lensMaxScale
  });

  // Genera datos de prueba: 500 ojos
  console.log('[HexEyes] Generando 500 ojos de prueba...');
  const testData = generateTestEyesGrid(500);
  console.log('[HexEyes] Grid generado:', testData.placements.length, 'celdas');

  // Estado de cámara
  const camera: CameraState = {
    offset: { x: 0, y: 0 },
    zoom: DEFAULT_CONFIG.cameraZoomDefault,
    targetZoom: DEFAULT_CONFIG.cameraZoomDefault
  };

  // Crea SpriteCache para las 3 capas
  const spriteCache = new SpriteCache({
    maxSprites: 1000,
    useOffscreen: true
  });

  // Crea RenderPipeline
  const gridCtx = gridCanvas.getContext('2d');
  const satCtx = satCanvas.getContext('2d');
  const lineCtx = lineCanvas.getContext('2d');

  if (!gridCtx || !satCtx || !lineCtx) {
    throw new Error('[HexEyes] No se pudo obtener contexto 2D de los canvases');
  }

  const renderPipeline = new RenderPipeline({
    gridCtx,
    satCtx,
    lineCtx,
    spriteCache,
    config: DEFAULT_CONFIG
  });

  // Cursor tracking
  let cursorPos: Vec2 | null = null;

  // Animation clock
  let lastTime = performance.now();
  let animationFrameId = -1;

  const clock: IAnimationClock = {
    tick(nowMs: number): number {
      let deltaTime = nowMs - lastTime;

      // Clamp para evitar "spiral of death" en background
      deltaTime = Math.min(deltaTime, 100);

      lastTime = nowMs;
      return deltaTime;
    }
  };

  // Loop de render principal
  const renderLoop = (nowMs: number) => {
    const deltaTime = clock.tick(nowMs);

    // Actualiza estado del cursor (para layers que lo necesiten)
    const frameData: FrameData = {
      cells: testData.placements,
      eyeStates: testData.eyeStates,
      cursorScreenPos: cursorPos
    };

    // Renderiza todas las capas
    renderPipeline.renderFrame(frameData);

    animationFrameId = requestAnimationFrame(renderLoop);
  };

  // Inicia el loop
  animationFrameId = requestAnimationFrame(renderLoop);

  // Función de cleanup
  const dispose = () => {
    console.log('[HexEyes] Dispose: limpiando recursos');

    cancelAnimationFrame(animationFrameId);
    window.removeEventListener('resize', resizeCanvases);
    spriteCache.clear();

    // Limpia listeners adicionales aquí cuando se implementen
  };

  console.log('[HexEyes] Bootstrap completado - 500 ojos renderizados');

  return {
    clock,
    camera,
    dispose
  };
}

/**
 * Interfaces mínimas para el bootstrap
 */
interface IAnimationClock {
  tick(nowMs: number): number;
}

interface CameraState {
  offset: Vec2;
  zoom: number;
  targetZoom: number;
}

// Inicialización automática si estamos en browser
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    try {
      const engine = bootstrap({
        grid: 'grid-canvas',
        sat: 'sat-canvas',
        line: 'line-canvas'
      });

      // Expone para debugging en consola
      (window as any).hexEyesEngine = engine;

      console.log('[HexEyes] Motor inicializado. Disponible como window.hexEyesEngine');
    } catch (error) {
      console.error('[HexEyes] Error en inicialización:', error);
    }
  });
}
