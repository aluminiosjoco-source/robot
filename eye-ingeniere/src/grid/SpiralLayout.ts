--- hex-eyes-engine/src/grid/SpiralLayout.ts (原始)


+++ hex-eyes-engine/src/grid/SpiralLayout.ts (修改后)
/**
 * SpiralLayout — Generación de espiral para layout de celdas
 *
 * [FASE] 1 — Grid math
 * [ALGORITMO ORIGINAL] Función ja() del código original
 * [CRITERIO DE ACEPTACIÓN]
 *   - ringAt(c, 3).length === 18 (6 * ring para ring > 0)
 *   - walkSpiral visita cada celda exactamente una vez
 *   - ringsForViewport evita generar anillos innecesarios
 */

import type { OffsetCoord } from '@core/types';
import { DEFAULT_CONFIG, type EngineConfig } from '@core/types';

export interface ISpiralLayout {
  /**
   * [MÉTODO] [FUNCIÓN PURA]
   * Genera las coordenadas de un anillo específico
   * Complejidad O(ring): un anillo tiene exactamente 6*ring celdas (ring>0)
   */
  ringAt(center: OffsetCoord, ring: number): OffsetCoord[];

  /**
   * [MÉTODO] [CONTROL DE FLUJO] [CALLBACK]
   * Recorre la espiral desde el centro hasta maxRing
   * visit se invoca una vez por celda, orden de anillo ascendente
   */
  walkSpiral(
    center: OffsetCoord,
    maxRing: number,
    visit: (coord: OffsetCoord, ring: number) => void
  ): void;

  /**
   * [MÉTODO] [UTILIDAD]
   * Calcula cuántos anillos se necesitan para cubrir el viewport
   * Evita generar anillos de más
   */
  ringsForViewport(viewportPx: { width: number; height: number }, hexSize: number): number;
}

/**
 * Implementación del algoritmo espiral del original
 *
 * El algoritmo original usa una función ms(t) que interpola el radio
 * espiral basado en un factor de crecimiento acumulativo.
 *
 * Fórmula clave:
 *   - Bn[0] = 0
 *   - Bn[i] = Bn[i-1] + (ms(Bn[i-1]) + offset) * se
 *   - ms(t) = rn + (Js - rn) * jn(min(t, 1))
 *   - jn(e) = e * e * (3 - 2 * e)  [interpolación cúbica]
 */
export class SpiralLayout implements ISpiralLayout {
  private readonly spiralGrowthRate: number;
  private readonly spiralMinRadius: number;
  private readonly spiralMaxRadius: number;
  private readonly cullMargin: number;

  // Cache de radios precalculados para eficiencia
  private radiusCache: number[] = [0];
  private cacheValid = false;

  constructor(config: Partial<EngineConfig> = {}) {
    this.spiralGrowthRate = config.spiralGrowthRate ?? DEFAULT_CONFIG.spiralGrowthRate;
    this.spiralMinRadius = config.spiralMinRadius ?? DEFAULT_CONFIG.spiralMinRadius;
    this.spiralMaxRadius = config.spiralMaxRadius ?? DEFAULT_CONFIG.spiralMaxRadius;
    this.cullMargin = config.cullMargin ?? DEFAULT_CONFIG.cullMargin;
  }

  /**
   * Interpolación cúbica original (función jn)
   * jn(e) = e * e * (3 - 2 * e)
   */
  private cubicEase(t: number): number {
    return t * t * (3 - 2 * t);
  }

  /**
   * Función de escala espiral (función ms del original)
   * ms(t) = rn + (Js - rn) * jn(min(t, 1))
   */
  private spiralScale(t: number): number {
    return this.spiralMinRadius + (this.spiralMaxRadius - this.spiralMinRadius) * this.cubicEase(Math.min(t, 1));
  }

  /**
   * Precalcula la secuencia de radios hasta alcanzar una distancia máxima
   * Método original: función ja()
   */
  private ensureRadiusCache(maxDistance: number, cellSize: number): void {
    if (this.cacheValid && this.radiusCache.length > 0) {
      const currentMax = this.radiusCache[this.radiusCache.length - 1] * cellSize;
      if (currentMax >= maxDistance) return;
    }

    this.radiusCache = [0];
    let accumulated = 0;
    const maxIterations = 50000; // Límite de seguridad del original

    while (accumulated < maxDistance / cellSize && this.radiusCache.length < maxIterations) {
      const scale = this.spiralScale(accumulated);
      accumulated += (scale + this.cullMargin / cellSize) * this.spiralGrowthRate;
      this.radiusCache.push(accumulated);
    }

    this.cacheValid = true;
  }

  /**
   * Genera las coordenadas de un anillo específico
   * Un anillo de radio R tiene exactamente 6*R celdas (para R > 0)
   * El anillo 0 contiene solo el centro
   */
  ringAt(center: OffsetCoord, ring: number): OffsetCoord[] {
    if (ring === 0) return [center];
    if (ring < 0) return [];

    const result: OffsetCoord[] = [];

    // Direcciones de los 6 lados del hexágono (en coordenadas offset)
    // Orden: empieza arriba-derecha y va clockwise
    const directions = this.getRingDirections(ring);

    let current = { ...directions.start };
    result.push({ ...current });

    // Recorre los 6 lados del anillo
    for (let side = 0; side < 6; side++) {
      const dir = directions.sideDirs[side];
      for (let step = 0; step < ring; step++) {
        current = { col: current.col + dir.col, row: current.row + dir.row };
        result.push({ ...current });
      }
    }

    return result;
  }

  /**
   * Obtiene las direcciones para recorrer un anillo
   * Las direcciones dependen de la paridad del centro
   */
  private getRingDirections(ring: number): {
    start: OffsetCoord;
    sideDirs: Array<{ col: number; row: number }>;
  } {
    // Direcciones base para odd-row offset
    // Estas son las 6 direcciones principales en orden clockwise
    const evenDirs = [
      { col: 1, row: 0 },   // derecha
      { col: 0, row: 1 },   // abajo-derecha
      { col: -1, row: 1 },  // abajo-izquierda
      { col: -1, row: 0 },  // izquierda
      { col: 0, row: -1 },  // arriba-izquierda
      { col: 1, row: -1 }   // arriba-derecha
    ];

    // Para filas impares, algunas direcciones se ajustan
    const oddDirs = [
      { col: 1, row: 0 },
      { col: 0, row: 1 },
      { col: -1, row: 1 },
      { col: -1, row: 0 },
      { col: 0, row: -1 },
      { col: 1, row: -1 }
    ];

    // Punto de partida: desde el centro, sube 'ring' pasos en dirección arriba
    const startDir = ring % 2 === 0 ? evenDirs[4] : oddDirs[4];
    const start = { col: startDir.col * ring, row: startDir.row * ring };

    // Direcciones para recorrer los lados (clockwise desde el punto de partida)
    const sideDirs = ring % 2 === 0 ?
      [evenDirs[0], evenDirs[1], evenDirs[2], evenDirs[3], evenDirs[4], evenDirs[5]] :
      [oddDirs[0], oddDirs[1], oddDirs[2], oddDirs[3], oddDirs[4], oddDirs[5]];

    return { start, sideDirs };
  }

  /**
   * Recorre toda la espiral desde el centro hasta maxRing
   * Invoca el callback visit para cada celda
   */
  walkSpiral(
    center: OffsetCoord,
    maxRing: number,
    visit: (coord: OffsetCoord, ring: number) => void
  ): void {
    for (let ring = 0; ring <= maxRing; ring++) {
      const coords = this.ringAt({ col: 0, row: 0 }, ring);
      for (const coord of coords) {
        visit(
          { col: center.col + coord.col, row: center.row + coord.row },
          ring
        );
      }
    }
  }

  /**
   * Calcula cuántos anillos se necesitan para cubrir el viewport dado
   * Basado en la diagonal máxima del viewport y el tamaño de celda
   */
  ringsForViewport(
    viewportPx: { width: number; height: number },
    hexSize: number
  ): number {
    const diagonal = Math.sqrt(viewportPx.width ** 2 + viewportPx.height ** 2);
    const maxDistance = diagonal / 2 + hexSize * this.cullMargin;

    this.ensureRadiusCache(maxDistance / hexSize, hexSize);

    // Encuentra el primer anillo que excede la distancia necesaria
    for (let i = 0; i < this.radiusCache.length; i++) {
      if (this.radiusCache[i] * hexSize >= maxDistance) {
        return i + 1; // +1 para margen adicional
      }
    }

    return this.radiusCache.length;
  }

  /**
   * Interpola el radio espiral para un parámetro t continuo
   * Usa lookup en la tabla precalculada con interpolación lineal
   */
  interpolateRadius(t: number, cellSize: number): number {
    const normalizedT = Math.abs(t) / this.spiralGrowthRate;
    const index = Math.floor(normalizedT);

    if (index >= this.radiusCache.length - 1) {
      return this.radiusCache[this.radiusCache.length - 1] * cellSize;
    }

    const frac = normalizedT - index;
    return (this.radiusCache[index] + (this.radiusCache[index + 1] - this.radiusCache[index]) * frac) * cellSize;
  }

  /**
   * Invalida el cache de radios (útil cuando cambian los parámetros)
   */
  invalidateCache(): void {
    this.cacheValid = false;
    this.radiusCache = [0];
  }
}
