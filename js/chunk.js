import * as THREE from 'three';
import { Config, BlockType, RenderType, BlockRenderType, BlockTextures, UV_UNIT, TransparentBlocks, Structures } from './config.js';

export class Chunk {
    constructor(world, cx, cz) {
        this.world = world;
        this.cx = cx;
        this.cz = cz;
        this.data = new Uint8Array(Config.CHUNK_SIZE * Config.CHUNK_HEIGHT * Config.CHUNK_SIZE);
        this.meshOpaque = null;
        this.meshTranslucent = null;
        this.raycastMesh = null;
        this.isGenerated = false;
        this.structureBlocks = new Set();
    }

    getIndex(x, y, z) {
        return y * Config.CHUNK_SIZE * Config.CHUNK_SIZE + z * Config.CHUNK_SIZE + x;
    }

    getBlock(x, y, z) {
        if (x < 0 || x >= Config.CHUNK_SIZE || y < 0 || y >= Config.CHUNK_HEIGHT || z < 0 || z >= Config.CHUNK_SIZE) {
            return this.world.getBlock(this.cx * Config.CHUNK_SIZE + x, y, this.cz * Config.CHUNK_SIZE + z);
        }
        return this.data[this.getIndex(x, y, z)];
    }

    setBlock(x, y, z, blockType) {
        if (x < 0 || x >= Config.CHUNK_SIZE || y < 0 || y >= Config.CHUNK_HEIGHT || z < 0 || z >= Config.CHUNK_SIZE) {
            return;
        }
        const index = this.getIndex(x, y, z);
        this.data[index] = blockType;
    }

    getHeightAt(lx, lz) {
        const x = Math.max(0, Math.min(lx, Config.CHUNK_SIZE - 1));
        const z = Math.max(0, Math.min(lz, Config.CHUNK_SIZE - 1));
        for (let y = Config.CHUNK_HEIGHT - 1; y >= 0; y--) {
            if (this.data[this.getIndex(x, y, z)] !== BlockType.AIR) {
                return y;
            }
        }
        return 0;
    }

    placeStructure(blueprint, lx_center, base_y, lz_center) {
        const halfWidth = Math.floor(blueprint.width / 2);
        const halfDepth = Math.floor(blueprint.depth / 2);
        const x_start = lx_center - halfWidth;
        const z_start = lz_center - halfDepth;
        console.log(`Размещение дома в чанке [${this.cx}, ${this.cz}] на высоте Y=${base_y}`);
        for (let y = 0; y < blueprint.height; y++) {
            for (let z = 0; z < blueprint.depth; z++) {
                for (let x = 0; x < blueprint.width; x++) {
                    const blockType = blueprint.blocks[y][z][x];
                    const wx = x_start + x;
                    const wy = base_y + y;
                    const wz = z_start + z;
                    if (wx < 0 || wx >= Config.CHUNK_SIZE || wz < 0 || wz >= Config.CHUNK_SIZE || wy >= Config.CHUNK_HEIGHT) {
                        continue;
                    }
                    this.setBlock(wx, wy, wz, blockType);
                    if (blockType !== BlockType.AIR) {
                        this.structureBlocks.add(this.getIndex(wx, wy, wz));
                    }
                }
            }
        }
        const window_y = base_y + 2;
        this.setBlock(x_start, window_y, z_start + 2, BlockType.AIR);
        this.setBlock(x_start + 4, window_y, z_start + 2, BlockType.AIR);
        this.setBlock(x_start + 2, window_y, z_start, BlockType.AIR);
    }

    generateData() {
        if (this.isGenerated) return;
        const noise = this.world.noise;
        const treesToSpawn = [];
        const baseHeight = 60;

        for (let x = 0; x < Config.CHUNK_SIZE; x++) {
            for (let z = 0; z < Config.CHUNK_SIZE; z++) {
                const worldX = this.cx * Config.CHUNK_SIZE + x;
                const worldZ = this.cz * Config.CHUNK_SIZE + z;
                let height;
                let canSpawnTrees = false;
                let isFieldBiome = false;
                const baseSurface = BlockType.GRASS;
                const biomeNoise = this.world.noise.noise2D(worldX / 500, worldZ / 500);

                if (biomeNoise > 0.3) {
                    canSpawnTrees = true;
                    const mountainAmplitude = 30;
                    height = noise.noise2D(worldX / 150, worldZ / 150) * mountainAmplitude;
                    height += noise.noise2D(worldX / 50, worldZ / 50) * 10;
                    height += noise.noise2D(worldX / 10, worldZ / 10) * 2;
                    height = Math.floor(height + baseHeight);
                } else if (biomeNoise > -0.15) {
                    canSpawnTrees = true;
                    const hillAmplitude = 7;
                    height = noise.noise2D(worldX / 150, worldZ / 150) * hillAmplitude;
                    height += noise.noise2D(worldX / 50, worldZ / 50) * 5;
                    height += noise.noise2D(worldX / 10, worldZ / 10) * 2;
                    height = Math.floor(height + baseHeight);
                } else {
                    isFieldBiome = true;
                    canSpawnTrees = false;
                    const plainsNoise = noise.noise2D(worldX / 30, worldZ / 30);
                    const plainsSteps = Math.floor(plainsNoise * 2);
                    height = baseHeight + plainsSteps;
                }

                height = Math.min(Config.CHUNK_HEIGHT - 5, Math.max(1, height));
                let surfaceBlock = baseSurface;

                if (height <= Config.WATER_LEVEL + 2) {
                    surfaceBlock = BlockType.SAND;
                    canSpawnTrees = false;
                }

                for (let y = 0; y < Config.CHUNK_HEIGHT; y++) {
                    let blockType = BlockType.AIR;
                    if (y === 0) blockType = BlockType.STONE;
                    else if (y < height - 4) blockType = BlockType.STONE;
                    else if (y < height) blockType = (surfaceBlock === BlockType.SAND) ? BlockType.SAND : BlockType.DIRT;
                    else if (y === height) {
                        blockType = surfaceBlock;
                        if (canSpawnTrees && surfaceBlock === BlockType.GRASS && noise.noise2D(worldX * 5, worldZ * 5) > 0.8) {
                            treesToSpawn.push({ x, y: y + 1, z });
                        }
                    } else if (y <= Config.WATER_LEVEL && blockType === BlockType.AIR) {
                        blockType = BlockType.WATER;
                    }
                    this.setBlock(x, y, z, blockType);
                }
            }
        }

        const ores = [
            { type: BlockType.COAL, scale: 20, threshold: 0.6, minHeight: 0, maxHeight: 128 },
            { type: BlockType.IRON, scale: 30, threshold: 0.7, minHeight: 0, maxHeight: 64 },
            { type: BlockType.DIAMOND, scale: 40, threshold: 0.85, minHeight: 0, maxHeight: 16 }
        ];

        for (let y = 0; y < Config.CHUNK_HEIGHT; y++) {
            for (let x = 0; x < Config.CHUNK_SIZE; x++) {
                for (let z = 0; z < Config.CHUNK_SIZE; z++) {
                    if (this.getBlock(x, y, z) === BlockType.STONE) {
                        ores.forEach(ore => {
                            if (y >= ore.minHeight && y <= ore.maxHeight) {
                                const worldX = this.cx * Config.CHUNK_SIZE + x;
                                const worldZ = this.cz * Config.CHUNK_SIZE + z;
                                const noiseValue = noise.noise2D(worldX / ore.scale, worldZ / ore.scale);
                                if (noiseValue > ore.threshold) {
                                    this.setBlock(x, y, z, ore.type);
                                }
                            }
                        });
                    }
                }
            }
        }

        const worldX_center = this.cx * Config.CHUNK_SIZE + 8;
        const worldZ_center = this.cz * Config.CHUNK_SIZE + 8;
        const centerBiomeNoise = this.world.noise.noise2D(worldX_center / 500, worldZ_center / 500);

        if (centerBiomeNoise <= -0.15 && Math.random() < 0.1) {
            const villageBaseY = this.getHeightAt(8, 8);
            if (villageBaseY > Config.WATER_LEVEL) {
                const houseLocations = [
                    { x: 5, z: 8 },
                    { x: 11, z: 8 }
                ];
                let canPlaceVillage = true;
                for (const loc of houseLocations) {
                    const houseY = this.getHeightAt(loc.x, loc.z);
                    if (Math.abs(houseY - villageBaseY) > 1) {
                        canPlaceVillage = false;
                        break;
                    }
                }
                if (canPlaceVillage) {
                    console.log(`*** Генерируем деревню в чанке [${this.cx}, ${this.cz}] ***`);
                    for (const loc of houseLocations) {
                        const houseY = this.getHeightAt(loc.x, loc.z);
                        this.placeStructure(Structures.HOUSE_BLUEPRINT, loc.x, houseY, loc.z);
                    }
                }
            }
        }

        treesToSpawn.forEach(pos => {
            const groundBlockIndex = this.getIndex(pos.x, pos.y - 1, pos.z);
            const treeBaseIndex = this.getIndex(pos.x, pos.y, pos.z);
            if (!this.structureBlocks.has(groundBlockIndex) && !this.structureBlocks.has(treeBaseIndex)) {
                this.generateTree(pos.x, pos.y, pos.z);
            }
        });

        this.isGenerated = true;
    }

    generateTree(x, y, z) {
        const height = Math.floor(Math.random() * 3) + 4;
        if (y + height >= Config.CHUNK_HEIGHT - 2) return;

        for (let i = 0; i < height; i++) {
            this.setBlock(x, y + i, z, BlockType.WOOD);
        }

        const crownTop = y + height;
        const crownBase = y + height - 2;
        for (let cy = crownBase; cy <= crownTop + 1; cy++) {
            const radius = (cy >= crownTop) ? 1 : 2;
            for (let cx = x - radius; cx <= x + radius; cx++) {
                for (let cz = z - radius; cz <= z + radius; cz++) {
                    if (cx === x && cz === z && cy < crownTop) continue;
                    if (Math.abs(cx - x) === 2 && Math.abs(cz - z) === 2 && Math.random() > 0.5) continue;
                    if (this.getBlock(cx, cy, cz) === BlockType.AIR) {
                        this.setBlock(cx, cy, cz, BlockType.LEAVES);
                    }
                }
            }
        }
    }

    generateMesh() {
        if (this.meshOpaque) {
            this.world.scene.remove(this.meshOpaque);
            this.meshOpaque.geometry.dispose();
        }
        if (this.meshTranslucent) {
            this.world.scene.remove(this.meshTranslucent);
            this.meshTranslucent.geometry.dispose();
        }
        if (this.raycastMesh) {
            this.world.scene.remove(this.raycastMesh);
            this.raycastMesh.geometry.dispose();
        }

        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = this.world.materialOpaque;
        const matrices = {};

        for (let y = 0; y < Config.CHUNK_HEIGHT; y++) {
            for (let x = 0; x < Config.CHUNK_SIZE; x++) {
                for (let z = 0; z < Config.CHUNK_SIZE; z++) {
                    const blockType = this.getBlock(x, y, z);
                    const renderType = BlockRenderType[blockType];

                    if (renderType === RenderType.OPAQUE) {
                        const matrix = new THREE.Matrix4();
                        matrix.setPosition(this.cx * Config.CHUNK_SIZE + x, y, this.cz * Config.CHUNK_SIZE + z);

                        if (!matrices[blockType]) {
                            matrices[blockType] = [];
                        }
                        matrices[blockType].push(matrix);
                    }
                }
            }
        }

        for (const blockType in matrices) {
            const instancedMesh = new THREE.InstancedMesh(geometry, material, matrices[blockType].length);
            for (let i = 0; i < matrices[blockType].length; i++) {
                instancedMesh.setMatrixAt(i, matrices[blockType][i]);
            }
            this.world.scene.add(instancedMesh);
            this.meshOpaque = instancedMesh;
        }

        const translucentGeometry = new THREE.BufferGeometry();
        const translucentPositions = [];
        const translucentNormals = [];
        const translucentUvs = [];
        const translucentIndices = [];
        let translucentVertexIndex = 0;

        const faces = [
            { dir: [0, 1, 0], corners: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], normal: [0, 1, 0], type: 'top' },
            { dir: [0, -1, 0], corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], normal: [0, -1, 0], type: 'bottom' },
            { dir: [1, 0, 0], corners: [[1, 1, 0], [1, 1, 1], [1, 0, 1], [1, 0, 0]], normal: [1, 0, 0], type: 'side' },
            { dir: [-1, 0, 0], corners: [[0, 1, 1], [0, 1, 0], [0, 0, 0], [0, 0, 1]], normal: [-1, 0, 0], type: 'side' },
            { dir: [0, 0, 1], corners: [[1, 1, 1], [0, 1, 1], [0, 0, 1], [1, 0, 1]], normal: [0, 0, 1], type: 'side' },
            { dir: [0, 0, -1], corners: [[0, 1, 0], [1, 1, 0], [1, 0, 0], [0, 0, 0]], normal: [0, 0, -1], type: 'side' }
        ];

        for (let y = 0; y < Config.CHUNK_HEIGHT; y++) {
            for (let x = 0; x < Config.CHUNK_SIZE; x++) {
                for (let z = 0; z < Config.CHUNK_SIZE; z++) {
                    const blockType = this.getBlock(x, y, z);
                    const renderType = BlockRenderType[blockType];

                    if (renderType === RenderType.TRANSLUCENT) {
                        const blockTextureInfo = BlockTextures[blockType];
                        if (!blockTextureInfo) continue;

                        for (const face of faces) {
                            const neighbor = this.getBlock(x + face.dir[0], y + face.dir[1], z + face.dir[2]);
                            if (TransparentBlocks.has(neighbor) && !(TransparentBlocks.has(blockType) && neighbor === blockType)) {
                                for (const corner of face.corners) {
                                    translucentPositions.push(x + corner[0], y + corner[1], z + corner[2]);
                                    translucentNormals.push(...face.normal);
                                }
                                const textureIndex = blockTextureInfo[face.type];
                                const uvX = textureIndex * UV_UNIT;
                                translucentUvs.push(uvX, 1, uvX + UV_UNIT, 1, uvX + UV_UNIT, 0, uvX, 0);
                                const vIndex = translucentVertexIndex;
                                translucentIndices.push(vIndex, vIndex + 1, vIndex + 2, vIndex, vIndex + 2, vIndex + 3);
                                translucentVertexIndex += 4;
                            }
                        }
                    }
                }
            }
        }

        if (translucentPositions.length > 0) {
            translucentGeometry.setAttribute('position', new THREE.Float32BufferAttribute(translucentPositions, 3));
            translucentGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(translucentNormals, 3));
            translucentGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(translucentUvs, 2));
            translucentGeometry.setIndex(translucentIndices);
            translucentGeometry.computeBoundingSphere();
            this.meshTranslucent = new THREE.Mesh(translucentGeometry, this.world.materialTranslucent);
            this.meshTranslucent.position.set(this.cx * Config.CHUNK_SIZE, 0, this.cz * Config.CHUNK_SIZE);
            this.world.scene.add(this.meshTranslucent);
        }

        const raycastPositions = [];
        for (let y = 0; y < Config.CHUNK_HEIGHT; y++) {
            for (let x = 0; x < Config.CHUNK_SIZE; x++) {
                for (let z = 0; z < Config.CHUNK_SIZE; z++) {
                    const blockType = this.getBlock(x, y, z);
                    const renderType = BlockRenderType[blockType];
                    if (renderType === RenderType.OPAQUE) {
                        for (const face of faces) {
                            const neighbor = this.getBlock(x + face.dir[0], y + face.dir[1], z + face.dir[2]);
                            if (TransparentBlocks.has(neighbor)) {
                                for (const corner of face.corners) {
                                    raycastPositions.push(x + corner[0], y + corner[1], z + corner[2]);
                                }
                            }
                        }
                    }
                }
            }
        }

        if (raycastPositions.length > 0) {
            const raycastGeometry = new THREE.BufferGeometry();
            raycastGeometry.setAttribute('position', new THREE.Float32BufferAttribute(raycastPositions, 3));
            this.raycastMesh = new THREE.Mesh(raycastGeometry, new THREE.MeshBasicMaterial({ visible: false }));
            this.raycastMesh.position.set(this.cx * Config.CHUNK_SIZE, 0, this.cz * Config.CHUNK_SIZE);
            this.world.scene.add(this.raycastMesh);
        }
    }
}