//+++ hex-eyes-engine/src/render/layers/GridLayer.ts 
/**
 * GridLayer — Capa de renderizado del grid hexagonal
 *
 * [FASE] 4 — Render
 * [REFERENCIA] Patrón estándar de renderizado por capas
 * [CRITERIO DE ACEPTACIÓN]
 *   - Dibuja todas las celdas visibles dentro del viewport
 *   - Aplica distorsión de lente si está configurada
 *   - Respeta alpha y scale de cada celda
 */

import type { FrameData } from '@core/types';
import { DEFAULT_CONFIG } from '@core/types';
import type { IRenderLayer } from './types';

export interface GridLayerConfig {
  showDebugBounds?: boolean;
}

export class GridLayer implements IRenderLayer {
  private readonly showDebugBounds: boolean;

  constructor(config: GridLayerConfig = {}) {
    this.showDebugBounds = config.showDebugBounds ?? false;
  }

  /**
   * Dibuja el grid hexagonal completo
   *
   * @param ctx - Contexto de canvas
   * @param frameData - Datos del frame actual
   */
  draw(ctx: CanvasRenderingContext2D, frameData: FrameData): void {
    const { cells, eyeStates } = frameData;

    for (const cell of cells) {
      const coordKey = `${cell.col},${cell.row}`;
      const eyeState = eyeStates.get(coordKey);

      if (!eyeState) continue;

      // Guardar estado del contexto
      ctx.save();

      // Trasladar al centro de la celda
      ctx.translate(cell.center.x, cell.center.y);

      // Aplicar escala
      ctx.scale(cell.scale01, cell.scale01);

      // Aplicar alpha
      ctx.globalAlpha = cell.alpha01;

      // TODO: Dibujar forma del ojo según eyeState.shapeId
      // Esto requiere integración con el sistema de shapes
      // Por ahora, dibujar un placeholder hexagonal
      this.drawHexPlaceholder(ctx, DEFAULT_CONFIG.hexSizeBase / 2);

      // Restaurar estado
      ctx.restore();
    }

    // Debug: dibujar bounds del viewport
    if (this.showDebugBounds) {
      this.drawDebugBounds(ctx, frameData);
    }
  }

  /**
   * Dibuja un placeholder hexagonal (flat-top)
   */
  private drawHexPlaceholder(ctx: CanvasRenderingContext2D, size: number): void {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const x = Math.cos(angle) * size;
      const y = Math.sin(angle) * size;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  /**
   * Dibuja bounds de debug para visualización
   */
  private drawDebugBounds(ctx: CanvasRenderingContext2D, frameData: FrameData): void {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(-10, -10, 20, 20);
    ctx.restore();
  }
}
