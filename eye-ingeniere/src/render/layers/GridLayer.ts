//--- hex-eyes-engine/src/render/layers/GridLayer.ts 
/**
 * GridLayer — Capa de renderizado del grid hexagonal
 *
 * [FASE] 4 — Render
 * [ALGORITMO ORIGINAL] Funciones de renderizado de shapes con curvas Bézier
 * [CRITERIO DE ACEPTACIÓN]
 *   - Dibuja todas las celdas visibles dentro del viewport
 *   - Dibuja formas Bézier reales con colores correctos
 *   - Pupila se desplaza según pupilAngleRad y pupilOffset01
 */

import type { FrameData, EyeVisualState } from '@core/types';
import { DEFAULT_CONFIG } from '@core/types';
import type { IRenderLayer } from './types';
import { getShape } from '../../data/shapes';

export interface GridLayerConfig {
  showDebugBounds?: boolean;
}

export class GridLayer implements IRenderLayer {
  private readonly showDebugBounds: boolean;

  constructor(config: GridLayerConfig = {}) {
    this.showDebugBounds = config.showDebugBounds ?? false;
  }

  draw(ctx: CanvasRenderingContext2D, frameData: FrameData): void {
    const { cells, eyeStates } = frameData;

    for (const cell of cells) {
      const coordKey = `${cell.col},${cell.row}`;
      const eyeState = eyeStates.get(coordKey);

      if (!eyeState) continue;

      ctx.save();
      ctx.translate(cell.center.x, cell.center.y);
      ctx.scale(cell.scale01, cell.scale01);
      ctx.globalAlpha = cell.alpha01;

      this.drawEyeShape(ctx, eyeState, DEFAULT_CONFIG.hexSizeBase / 2);

      ctx.restore();
    }

    if (this.showDebugBounds) {
      this.drawDebugBounds(ctx);
    }
  }

  private drawEyeShape(
    ctx: CanvasRenderingContext2D,
    eyeState: EyeVisualState,
    baseSize: number
  ): void {
    const shape = getShape(eyeState.shapeId);
    const scale = baseSize / 100;

    ctx.save();
    ctx.scale(scale, scale);
    ctx.fillStyle = eyeState.colorway.hex;
    ctx.strokeStyle = this.adjustColorBrightness(eyeState.colorway.hex, -20);
    ctx.lineWidth = 2;

    ctx.beginPath();
    for (let i = 0; i < shape.length; i++) {
      const curve = shape[i];
      if (i === 0) {
        ctx.moveTo(curve.p0.x, curve.p0.y);
      }
      ctx.bezierCurveTo(curve.p1.x, curve.p1.y, curve.p2.x, curve.p2.y, curve.p3.x, curve.p3.y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    this.drawPupil(ctx, eyeState);
    ctx.restore();
  }

  private drawPupil(ctx: CanvasRenderingContext2D, eyeState: EyeVisualState): void {
    const pupilRadius = 15;
    const orbitRadius = DEFAULT_CONFIG.pupilOrbitOffset * eyeState.pupilOffset01;
    const pupilX = Math.cos(eyeState.pupilAngleRad) * orbitRadius;
    const pupilY = Math.sin(eyeState.pupilAngleRad) * orbitRadius;

    ctx.beginPath();
    ctx.arc(pupilX, pupilY, pupilRadius, 0, Math.PI * 2);
    ctx.fillStyle = this.adjustColorBrightness(eyeState.colorway.hex, -40);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(pupilX - pupilRadius * 0.3, pupilY - pupilRadius * 0.3, pupilRadius * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fill();
  }

  private adjustColorBrightness(hex: string, amount: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    const adjust = (channel: number) => Math.max(0, Math.min(255, channel + amount));

    const newR = adjust(r);
    const newG = adjust(g);
    const newB = adjust(b);

    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
  }

  private drawDebugBounds(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(-10, -10, 20, 20);
    ctx.restore();
  }
}
