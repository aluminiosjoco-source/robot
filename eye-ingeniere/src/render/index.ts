//--- hex-eyes-engine/src/render/index.ts
/**
 * Render module — Export unificado de renderizado
 *
 * [FASE] 4 — Render
 * Módulos: SpriteCache, RenderPipeline, layers (GridLayer, SatelliteLayer, LineLayer)
 */

export { SpriteCache, type SpriteKey, type CachedSprite, type SpriteCacheConfig } from './SpriteCache';
export { GridLayer, type GridLayerConfig } from './layers/GridLayer';
export { SatelliteLayer, type SatelliteLayerConfig } from './layers/SatelliteLayer';
export { LineLayer, type LineLayerConfig } from './layers/LineLayer';
export { type IRenderLayer, type BaseLayerConfig } from './layers/types';
