import { Config, BlockType } from './config.js';
import { SimplexNoise } from './utils.js';
import { Chunk } from './chunk.js';

export class World {
    constructor(scene, materialOpaque, materialTranslucent) {
        this.scene = scene;
        this.materialOpaque = materialOpaque;
        this.materialTranslucent = materialTranslucent;
        this.chunks = new Map();
        this.noise = new SimplexNoise(Config.SEED);
        this.chunkGenerationQueue = [];
        this.chunkMeshingQueue = new Set();
    }

    getChunkKey(cx, cz) {
        return `${cx},${cz}`;
    }

    getChunk(cx, cz) {
        return this.chunks.get(this.getChunkKey(cx, cz));
    }

    getHighestBlock(x, z) {
        const cx = Math.floor(x / Config.CHUNK_SIZE);
        const cz = Math.floor(z / Config.CHUNK_SIZE);
        const chunk = this.getChunk(cx, cz);
        if (!chunk || !chunk.isGenerated) {
            return null;
        }
        for (let y = Config.CHUNK_HEIGHT - 1; y >= 0; y--) {
            const block = this.getBlock(x, y, z);
            if (block !== BlockType.AIR) {
                return y;
            }
        }
        return 0;
    }

    getBlock(x, y, z) {
        if (y < 0 || y >= Config.CHUNK_HEIGHT) return BlockType.AIR;
        const cx = Math.floor(x / Config.CHUNK_SIZE);
        const cz = Math.floor(z / Config.CHUNK_SIZE);
        const chunk = this.getChunk(cx, cz);
        if (!chunk || !chunk.isGenerated) return BlockType.AIR;
        const lx = x & (Config.CHUNK_SIZE - 1);
        const lz = z & (Config.CHUNK_SIZE - 1);
        return chunk.data[chunk.getIndex(lx, y, lz)];
    }

    setBlock(x, y, z, blockType) {
        if (y < 1 || y >= Config.CHUNK_HEIGHT) return;
        const cx = Math.floor(x / Config.CHUNK_SIZE);
        const cz = Math.floor(z / Config.CHUNK_SIZE);
        const chunk = this.getChunk(cx, cz);
        if (!chunk) return;
        const lx = x & (Config.CHUNK_SIZE - 1);
        const lz = z & (Config.CHUNK_SIZE - 1);
        chunk.setBlock(lx, y, lz, blockType);
        this.addToMeshingQueue(chunk);
        if (lx === 0) this.regenerateChunkMesh(cx - 1, cz);
        if (lx === Config.CHUNK_SIZE - 1) this.regenerateChunkMesh(cx + 1, cz);
        if (lz === 0) this.regenerateChunkMesh(cx, cz - 1);
        if (lz === Config.CHUNK_SIZE - 1) this.regenerateChunkMesh(cx, cz + 1);
    }

    regenerateChunkMesh(cx, cz) {
        const chunk = this.getChunk(cx, cz);
        if (chunk) {
            this.addToMeshingQueue(chunk);
        }
    }

    addToMeshingQueue(chunk) {
        const key = this.getChunkKey(chunk.cx, chunk.cz);
        this.chunkMeshingQueue.add(key);
    }

    update(playerPos) {
        const currentCX = Math.floor(playerPos.x / Config.CHUNK_SIZE);
        const currentCZ = Math.floor(playerPos.z / Config.CHUNK_SIZE);
        const newChunksToLoad = [];

        for (let dx = -Config.RENDER_DISTANCE; dx <= Config.RENDER_DISTANCE; dx++) {
            for (let dz = -Config.RENDER_DISTANCE; dz <= Config.RENDER_DISTANCE; dz++) {
                const cx = currentCX + dx;
                const cz = currentCZ + dz;
                const key = this.getChunkKey(cx, cz);
                if (!this.getChunk(cx, cz) && !this.chunkGenerationQueue.includes(key)) {
                    const distance = dx * dx + dz * dz;
                    newChunksToLoad.push({ cx, cz, distance, key });
                }
            }
        }

        newChunksToLoad.sort((a, b) => a.distance - b.distance);
        newChunksToLoad.forEach(item => this.chunkGenerationQueue.push(item.key));

        this.processQueues();

        const unloadDistance = Config.RENDER_DISTANCE + 3;
        for (const [key, chunk] of this.chunks.entries()) {
            if (Math.abs(chunk.cx - currentCX) > unloadDistance || Math.abs(chunk.cz - currentCZ) > unloadDistance) {
                if (chunk.meshOpaque) {
                    this.scene.remove(chunk.meshOpaque);
                    chunk.meshOpaque.geometry.dispose();
                }
                if (chunk.meshTranslucent) {
                    this.scene.remove(chunk.meshTranslucent);
                    chunk.meshTranslucent.geometry.dispose();
                }
                this.chunks.delete(key);
                this.chunkMeshingQueue.delete(key);
            }
        }
    }

    processQueues() {
        const maxChunksToProcess = 2;
        let processedCount = 0;

        while (this.chunkGenerationQueue.length > 0 && processedCount < maxChunksToProcess) {
            const key = this.chunkGenerationQueue.shift();
            const [cxStr, czStr] = key.split(',');
            const cx = parseInt(cxStr);
            const cz = parseInt(czStr);
            if (!this.getChunk(cx, cz)) {
                const chunk = new Chunk(this, cx, cz);
                chunk.generateData();
                this.chunks.set(key, chunk);
                this.addToMeshingQueue(chunk);
                processedCount++;
            }
        }

        if (this.chunkMeshingQueue.size > 0 && processedCount < maxChunksToProcess) {
            const key = this.chunkMeshingQueue.values().next().value;
            this.chunkMeshingQueue.delete(key);
            const chunk = this.chunks.get(key);
            if (chunk && chunk.isGenerated) {
                chunk.generateMesh();
            }
        }
    }
}