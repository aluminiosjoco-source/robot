//+++ hex-eyes-engine/src/render/layers/SatelliteLayer.ts
/**
 * SatelliteLayer — Capa de renderizado de satélites (textos orbitales)
 *
 * [FASE] 4 — Render
 * [REFERENCIA] Sistema de textos orbitales del código original
 * [CRITERIO DE ACEPTACIÓN]
 *   - Dibuja textos en órbita alrededor de las celdas
 *   - Aplica animación de fade in/out según estado
 *   - Respeta velocidad de órbita configurada
 */

import type { FrameData } from '@core/types';
import { DEFAULT_CONFIG } from '@core/types';
import type { IRenderLayer } from './types';

export interface SatelliteLayerConfig {
  fontSize?: number;
  fontFamily?: string;
}

export class SatelliteLayer implements IRenderLayer {
  private readonly fontSize: number;
  private readonly fontFamily: string;

  constructor(config: SatelliteLayerConfig = {}) {
    this.fontSize = config.fontSize ?? 14;
    this.fontFamily = config.fontFamily ?? 'system-ui, sans-serif';
  }

  /**
   * Dibuja los satélites (textos orbitales) para cada celda
   */
  draw(ctx: CanvasRenderingContext2D, frameData: FrameData): void {
    const { cells, eyeStates } = frameData;
    const now = performance.now();

    ctx.save();
    ctx.font = `${this.fontSize}px ${this.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const cell of cells) {
      const coordKey = `${cell.col},${cell.row}`;
      const eyeState = eyeStates.get(coordKey);

      if (!eyeState) continue;

      // Calcular posición orbital basada en el tiempo
      const orbitRadius = DEFAULT_CONFIG.pupilOrbitRadius;
      const orbitSpeed = DEFAULT_CONFIG.textOrbitSpeed * (Math.PI / 180); // grados a rad/s
      const orbitAngle = eyeState.pupilAngleRad + orbitSpeed * (now / 1000);

      // Posición del satélite
      const satelliteX = cell.center.x + Math.cos(orbitAngle) * orbitRadius;
      const satelliteY = cell.center.y + Math.sin(orbitAngle) * orbitRadius;

      // Calcular alpha basado en estado de animación
      // TODO: Implementar sistema de timing de fade real
      const alpha = cell.alpha01;

      ctx.save();
      ctx.globalAlpha = alpha;

      // Trasladar a posición del satélite
      ctx.translate(satelliteX, satelliteY);

      // TODO: Dibujar texto real (requiere integración con datos de texto)
      // Por ahora, dibujar un círculo placeholder
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#666';
      ctx.fill();

      ctx.restore();
    }

    ctx.restore();
  }
}
