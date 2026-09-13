//--- hex-eyes-engine/src/render/layers/SatelliteLayer.ts 
/**
 * SatelliteLayer — Capa de renderizado de satélites (textos orbitales)
 *
 * [FASE] 4 — Render
 * [ALGORITMO ORIGINAL] Sistema de textos orbitales del código original
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

      const orbitRadius = DEFAULT_CONFIG.pupilOrbitRadius;
      const orbitSpeed = DEFAULT_CONFIG.textOrbitSpeed * (Math.PI / 180);
      const orbitAngle = eyeState.pupilAngleRad + orbitSpeed * (now / 1000);

      const satelliteX = cell.center.x + Math.cos(orbitAngle) * orbitRadius;
      const satelliteY = cell.center.y + Math.sin(orbitAngle) * orbitRadius;

      const alpha = cell.alpha01;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(satelliteX, satelliteY);

      // Dibujar texto identificador (coordenadas o ID de forma)
      const labelText = eyeState.shapeId.substring(0, 3).toUpperCase();
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;

      // Fondo semitransparente para legibilidad
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fill();

      // Texto
      ctx.font = `bold ${this.fontSize - 2}px ${this.fontFamily}`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(labelText, 0, 0);

      ctx.restore();
    }

    ctx.restore();
  }
}
