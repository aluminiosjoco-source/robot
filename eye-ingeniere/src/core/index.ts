--- hex-eyes-engine/src/core/index.ts (原始)


+++ hex-eyes-engine/src/core/index.ts (修改后)
/**
 * Export barrel — Core module
 *
 * [ESTADO] Tipos y utilidades base
 * [DEPENDENCIA] Ninguna — módulo raíz
 */

export {
  DEFAULT_CONFIG,
  type Vec2,
  type OffsetCoord,
  type ColorwayDef,
  type CubicBezier,
  type ShapeId,
  type EyeVisualState,
  type CellPlacement,
  type EngineConfig
} from './types';
