import type { OffsetCoord, EyeVisualState, CellPlacement, Vec2, ShapeId, ColorwayDef } from '../core/types';
import { DEFAULT_CONFIG } from '../core/types';
import { AVAILABLE_SHAPES } from './shapes';
import { COLORWAYS } from './colorways';

export interface GeneratedEyeData {
    placements: CellPlacement[];
    eyeStates: Map<string, EyeVisualState>;
}

class SeededRandom {
    private seed: number;

    constructor(seed: number) {
        this.seed = seed;
    }

    next(): number {
        this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
        return this.seed / 0x7fffffff;
    }

    nextInt(max: number): number {
        return Math.floor(this.next() * max);
    }

    pick<T>(array: T[]): T {
        return array[this.nextInt(array.length)];
    }
}

function offsetToPixel(coord: OffsetCoord, hexSize: number): Vec2 {
    const x = hexSize * (coord.col + coord.row * 0.5);
    const y = hexSize * coord.row * 0.866025404;
    return { x, y };
}

function generateSpiralCoords(maxCount: number): OffsetCoord[] {
    const coords: OffsetCoord[] = [];
    
    coords.push({ col: 0, row: 0 });
    if (maxCount <= 1) return coords;

    let ring = 1;
    while (coords.length < maxCount) {
        const directions = [
            { dc: 0, dr: -1 },
            { dc: 1, dr: -1 },
            { dc: 1, dr: 0 },
            { dc: 0, dr: 1 },
            { dc: -1, dr: 1 },
            { dc: -1, dr: 0 },
        ];

        for (let dir = 0; dir < 6 && coords.length < maxCount; dir++) {
            const { dc, dr } = directions[dir];

            for (let step = 0; step < ring && coords.length < maxCount; step++) {
                const prev = coords[coords.length - 1];
                coords.push({ col: prev.col + dc, row: prev.row + dr });
            }
        }
        ring++;
    }

    return coords.slice(0, maxCount);
}

function selectColorway(rng: SeededRandom, distanceFromCenter: number): ColorwayDef {
    const rarityThreshold = Math.max(0.3, 1 - distanceFromCenter * 0.02);
    
    const weightedColorways: ColorwayDef[] = [];
    COLORWAYS.forEach(cw => {
        const weight = cw.rarityWeight >= rarityThreshold ? cw.rarityWeight * 2 : cw.rarityWeight * 0.5;
        const copies = Math.floor(weight * 10);
        for (let i = 0; i < copies; i++) {
            weightedColorways.push(cw);
        }
    });

    return weightedColorways.length > 0 
        ? rng.pick(weightedColorways) 
        : rng.pick(COLORWAYS);
}

export function generateEyeData(count: number = 500, seed: number = 12345): GeneratedEyeData {
    if (count <= 0 || count > 10000) {
        throw new Error(`Invalid eye count: ${count}. Must be between 1 and 10000.`);
    }

    const rng = new SeededRandom(seed);
    const coords = generateSpiralCoords(count);
    const hexSize = DEFAULT_CONFIG.hexSizeBase / 2;

    const placements: CellPlacement[] = [];
    const eyeStates = new Map<string, EyeVisualState>();

    const spiralGrowthRate = DEFAULT_CONFIG.spiralGrowthRate;
    const spiralMinRadius = DEFAULT_CONFIG.spiralMinRadius;
    const spiralMaxRadius = DEFAULT_CONFIG.spiralMaxRadius;

    coords.forEach((coord, index) => {
        const center = offsetToPixel(coord, hexSize);
        const distanceFromCenter = Math.sqrt(coord.col * coord.col + coord.row * coord.row);
        
        const scale01 = Math.max(
            spiralMaxRadius,
            Math.min(1.0, spiralMinRadius - distanceFromCenter * spiralGrowthRate)
        );

        const maxViewDistance = 30;
        const alpha01 = distanceFromCenter > maxViewDistance 
            ? Math.max(0.2, 1 - (distanceFromCenter - maxViewDistance) * 0.05)
            : 1.0;

        const placement: CellPlacement = {
            col: coord.col,
            row: coord.row,
            center,
            scale01,
            alpha01,
        };

        placements.push(placement);

        const shapeId = rng.pick(AVAILABLE_SHAPES) as ShapeId;
        const colorway = selectColorway(rng, distanceFromCenter);

        const eyeState: EyeVisualState = {
            shapeId,
            colorway,
            animFrame: rng.nextInt(4),
            pupilAngleRad: rng.next() * Math.PI * 2,
            pupilOffset01: 0.3 + rng.next() * 0.4,
        };

        const key = `${coord.col},${coord.row}`;
        eyeStates.set(key, eyeState);
    });

    return { placements, eyeStates };
}

export function getSingleEyeData(col: number, row: number): { placement: CellPlacement; eyeState: EyeVisualState } {
    const hexSize = DEFAULT_CONFIG.hexSizeBase / 2;
    const center = offsetToPixel({ col, row }, hexSize);

    const rng = new SeededRandom(col * 1000 + row);
    
    return {
        placement: {
            col,
            row,
            center,
            scale01: 1.0,
            alpha01: 1.0,
        },
        eyeState: {
            shapeId: rng.pick(AVAILABLE_SHAPES) as ShapeId,
            colorway: rng.pick(COLORWAYS),
            animFrame: 0,
            pupilAngleRad: 0,
            pupilOffset01: 0.5,
        },
    };
}