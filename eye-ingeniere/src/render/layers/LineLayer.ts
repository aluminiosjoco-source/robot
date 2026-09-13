//--- hex-eyes-engine/src/render/layers/LineLayer.ts
/**
 * LineLayer — Capa de renderizado de líneas de conexión
 *
 * [FASE] 4 — Render
 * [ALGORITMO ORIGINAL] Funciones relacionadas con Ve (lineThickness), fa (curveTightness)
 * [CRITERIO DE ACEPTACIÓN]
 *   - Dibuja líneas curvas entre celdas conectadas
 *   - Aplica grosor y alpha configurados
 *   - Usa curvas de Bézier cuadráticas para suavidad
 */

import type { FrameData, Vec2, CellPlacement } from '@core/types';
import { DEFAULT_CONFIG } from '@core/types';
import type { IRenderLayer } from './types';

export interface LineLayerConfig {
  showAllConnections?: boolean;
}

export class LineLayer implements IRenderLayer {
  private readonly showAllConnections: boolean;

  constructor(config: LineLayerConfig = {}) {
    this.showAllConnections = config.showAllConnections ?? false;
  }

  draw(ctx: CanvasRenderingContext2D, frameData: FrameData): void {
    const { cells } = frameData;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const isMobile = ctx.canvas.width < 768;
    const lineThickness = isMobile
      ? DEFAULT_CONFIG.lineThicknessMobile
      : DEFAULT_CONFIG.lineThickness;

    ctx.lineWidth = lineThickness;
    ctx.globalAlpha = DEFAULT_CONFIG.lineAlpha;

    this.drawNeighborConnections(ctx, cells, lineThickness);

    ctx.restore();
  }

  private drawNeighborConnections(
    ctx: CanvasRenderingContext2D,
    cells: CellPlacement[],
    lineThickness: number
  ): void {
    const cellMap = new Map<string, CellPlacement>();
    for (const cell of cells) {
      cellMap.set(`${cell.col},${cell.row}`, cell);
    }

    const neighborDirs = [
      { col: 1, row: 0 },
      { col: 0, row: 1 },
      { col: -1, row: 1 },
      { col: -1, row: 0 },
      { col: 0, row: -1 },
      { col: 1, row: -1 }
    ];

    const drawnConnections = new Set<string>();

    for (const cell of cells) {
      for (const dir of neighborDirs) {
        const neighborCoord = {
          col: cell.col + dir.col,
          row: cell.row + dir.row
        };

        const neighborKey = `${neighborCoord.col},${neighborCoord.row}`;
        const neighbor = cellMap.get(neighborKey);

        if (!neighbor) continue;

        const connKey = [
          `${cell.col},${cell.row}`,
          neighborKey
        ].sort().join('|');

        if (drawnConnections.has(connKey)) continue;

        this.drawCurvedLine(
          ctx,
          cell.center,
          neighbor.center,
          lineThickness
        );

        drawnConnections.add(connKey);
      }
    }
  }

  private drawCurvedLine(
    ctx: CanvasRenderingContext2D,
    start: Vec2,
    end: Vec2,
    lineThickness: number
  ): void {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 1) return;

    const margin = DEFAULT_CONFIG.lineCurveMargin;
    const tightness = DEFAULT_CONFIG.lineCurveTightness;

    const nx = -dy / dist;
    const ny = dx / dist;

    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;

    const controlX = midX + nx * margin * tightness;
    const controlY = midY + ny * margin * tightness;

    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.quadraticCurveTo(controlX, controlY, end.x, end.y);

    ctx.strokeStyle = '#cccccc';
    ctx.stroke();
  }
}
