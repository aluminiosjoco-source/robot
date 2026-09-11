//+++ hex-eyes-engine/src/render/layers/types.ts 
/**
 * Tipos y contratos para capas de renderizado
 *
 * [FASE] 4 — Render
 * [CONTRATO] Interface único para todas las capas — intercambiables y testeables por separado
 */

import type { FrameData } from '@core/types';

/**
 * Contrato común para todas las capas de renderizado
 *
 * [CRITERIO DE ACEPTACIÓN]
 *   - <10ms de render puro con 500 celdas (medido con performance.now())
 *   - Interfaz uniforme para composición de pipeline
 */
export interface IRenderLayer {
  /**
   * [MÉTODO] [RENDER]
   * Dibuja la capa en el contexto dado
   *
   * @param ctx - Contexto de canvas
   * @param frameData - Datos del frame actual
   */
  draw(ctx: CanvasRenderingContext2D, frameData: FrameData): void;
}

/**
 * Configuración base para capas
 */
export interface BaseLayerConfig {
  enabled?: boolean;
  zIndex?: number;
}
