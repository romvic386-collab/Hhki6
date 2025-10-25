export const Config = {
    CHUNK_SIZE: 16,
    CHUNK_HEIGHT: 128,
    RENDER_DISTANCE: 5,
    WATER_LEVEL: 45,
    SEED: Math.random(),
    PLAYER_HEIGHT: 1.8,
    PLAYER_RADIUS: 0.3,
    PLAYER_MAX_HEALTH: 20,
    GRAVITY: 30.0,
    JUMP_FORCE: 10.0,
    MOVE_SPEED: 7.0,
    FLY_SPEED: 18.0,
    TERMINAL_VELOCITY: -78.0,
    WATER_GRAVITY: 8.0,
    WATER_DRAG: 20.0,
    SWIM_SPEED: 4.0,
    SWIM_FORCE_Y: 8.0,
    MAX_FALL_SPEED_WATER: -4.0,
    JUMP_FORCE_WATER_EXIT: 8.5,
    SAFE_FALL_SPEED: -22.5,
    FALL_DAMAGE_MULTIPLIER: 0.6,
    INTERACTION_DISTANCE: 6.0,
    ATLAS_SIZE_PX: 16,
    ATLAS_COUNT_X: 12,
    COLOR_SKY: 0x87CEEB,
    COLOR_UNDERWATER: 0x306090
};

export const UV_UNIT = 1 / Config.ATLAS_COUNT_X;

export const BlockType = {
    AIR: 0,
    GRASS: 1,
    DIRT: 2,
    STONE: 3,
    WOOD: 4,
    LEAVES: 5,
    SAND: 6,
    WATER: 7,
    COAL: 8,
    IRON: 9,
    DIAMOND: 10,
    CRAFTING_TABLE: 11
};

export const RenderType = {
    OPAQUE: 0,
    TRANSLUCENT: 1
};

export const BlockRenderType = {
    [BlockType.AIR]: null,
    [BlockType.GRASS]: RenderType.OPAQUE,
    [BlockType.DIRT]: RenderType.OPAQUE,
    [BlockType.STONE]: RenderType.OPAQUE,
    [BlockType.WOOD]: RenderType.OPAQUE,
    [BlockType.LEAVES]: RenderType.OPAQUE,
    [BlockType.SAND]: RenderType.OPAQUE,
    [BlockType.WATER]: RenderType.TRANSLUCENT,
    [BlockType.COAL]: RenderType.OPAQUE,
    [BlockType.IRON]: RenderType.OPAQUE,
    [BlockType.DIAMOND]: RenderType.OPAQUE,
    [BlockType.CRAFTING_TABLE]: RenderType.OPAQUE
};

export const BlockTextures = {
    [BlockType.GRASS]: { top: 0, bottom: 1, side: 2 },
    [BlockType.DIRT]: { top: 1, bottom: 1, side: 1 },
    [BlockType.STONE]: { top: 3, bottom: 3, side: 3 },
    [BlockType.WOOD]: { top: 4, bottom: 4, side: 4 },
    [BlockType.LEAVES]:{ top: 5, bottom: 5, side: 5 },
    [BlockType.SAND]: { top: 6, bottom: 6, side: 6 },
    [BlockType.WATER]: { top: 7, bottom: 7, side: 7 },
    [BlockType.COAL]: { top: 8, bottom: 8, side: 8 },
    [BlockType.IRON]: { top: 9, bottom: 9, side: 9 },
    [BlockType.DIAMOND]: { top: 10, bottom: 10, side: 10 },
    [BlockType.CRAFTING_TABLE]: { top: 11, bottom: 4, side: 11 }
};

export const NonSolidBlocks = new Set([BlockType.AIR, BlockType.WATER]);
export const TransparentBlocks = new Set([BlockType.AIR, BlockType.WATER, BlockType.LEAVES]);
export const LiquidBlocks = new Set([BlockType.WATER]);

export const Structures = {
    HOUSE_BLUEPRINT: {
        width: 5,
        height: 4,
        depth: 5,
        blocks: [
            [
                [3,3,3,3,3],
                [3,3,3,3,3],
                [3,3,3,3,3],
                [3,3,3,3,3],
                [3,3,3,3,3]
            ],
            [
                [4,4,4,4,4],
                [4,0,0,0,4],
                [4,0,0,0,4],
                [4,0,0,0,4],
                [4,4,0,4,4]
            ],
            [
                [4,4,4,4,4],
                [4,0,0,0,4],
                [4,0,0,0,4],
                [4,0,0,0,4],
                [4,4,0,4,4]
            ],
            [
                [4,4,4,4,4],
                [4,4,4,4,4],
                [4,4,4,4,4],
                [4,4,4,4,4],
                [4,4,4,4,4]
            ]
        ]
    }
};

export const Recipes = {
    [BlockType.WOOD]: {
        produces: BlockType.CRAFTING_TABLE,
        quantity: 1,
        ingredients: {
            [BlockType.WOOD]: 4
        }
    }
};