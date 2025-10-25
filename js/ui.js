import { Config, BlockTextures, BlockType } from './config.js';

export class UI {
    constructor(game, player) {
        this.game = game;
        this.player = player;
        this.isPaused = false;
        this.inventoryVisible = false;
        this.settingsVisible = false;
        this.craftingVisible = false;
        this.setupEventListeners();
        this.initHotbarIcons();
        this.initInventory();
        this.initCrafting();
    }

    setupEventListeners() {
        const ui = document.getElementById('ui');
        const crosshair = document.getElementById('crosshair');
        const hud = document.getElementById('hud');
        const infoPanel = document.getElementById('info');
        const deathScreen = document.getElementById('deathScreen');
        const pauseMenu = document.getElementById('pause');
        const resumeButton = document.getElementById('resume');
        const controlsButton = document.getElementById('controls');
        const settingsMenu = document.getElementById('settings');
        const renderDistanceSlider = document.getElementById('render-distance');
        const renderDistanceValue = document.getElementById('render-distance-value');
        const craftingOutput = document.getElementById('crafting-output');
        const skipLoadingButton = document.getElementById('skip-loading');

        ui.addEventListener('click', () => {
            if (this.player.isAlive && !this.player.isWaitingForSpawn) {
                this.player.controls.lock();
            }
        });

        deathScreen.addEventListener('click', () => {
            if (!this.player.isAlive) {
                this.player.respawn();
                this.player.controls.lock();
            }
        });

        skipLoadingButton.addEventListener('click', () => {
            this.hideLoading();
            this.player.isWaitingForSpawn = false;
        });

        this.player.controls.addEventListener('lock', () => {
            if (this.player.isAlive && !this.player.isWaitingForSpawn) {
                ui.style.display = 'none';
                crosshair.style.display = 'block';
                hud.style.display = 'flex';
                infoPanel.style.display = 'block';
                this.hidePauseMenu();
                this.hideInventory();
                this.hideSettings();
                this.hideCrafting();
            }
        });

        this.player.controls.addEventListener('unlock', () => {
            if (this.player.isAlive && !this.player.isWaitingForSpawn) {
                if (!this.inventoryVisible && !this.settingsVisible && !this.craftingVisible) {
                    this.showPauseMenu();
                }
            }
            crosshair.style.display = 'none';
            hud.style.display = 'none';
            infoPanel.style.display = 'none';
        });

        resumeButton.addEventListener('click', () => {
            this.player.controls.lock();
        });

        controlsButton.addEventListener('click', () => {
            this.hidePauseMenu();
            this.showSettings();
        });

        renderDistanceSlider.addEventListener('input', () => {
            const value = parseInt(renderDistanceSlider.value);
            renderDistanceValue.textContent = value;
            Config.RENDER_DISTANCE = value;
        });

        craftingOutput.addEventListener('click', () => {
            this.player.craft();
            this.renderCrafting();
            this.renderInventory();
        });

        document.addEventListener('keydown', (event) => {
            if (event.code === 'Escape') {
                if (this.craftingVisible) {
                    this.hideCrafting();
                    this.player.controls.lock();
                } else if (this.settingsVisible) {
                    this.hideSettings();
                    this.showPauseMenu();
                } else if (this.inventoryVisible) {
                    this.hideInventory();
                    this.player.controls.lock();
                } else if (this.player.controls.isLocked) {
                    this.player.controls.unlock();
                } else if (this.player.isAlive && !this.player.isWaitingForSpawn) {
                    this.player.controls.lock();
                }
            } else if (event.code === 'KeyE') {
                if (this.player.controls.isLocked) {
                    this.showInventory();
                    this.player.controls.unlock();
                } else if (this.inventoryVisible) {
                    this.hideInventory();
                    this.player.controls.lock();
                }
            }
        });
    }

    showLoading(message) {
        document.getElementById('loading-text').textContent = message;
        document.getElementById('loading').style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loading').style.display = 'none';
        if (document.getElementById('ui').style.display === 'none' && this.player.isAlive && !this.player.controls.isLocked) {
            document.getElementById('ui').style.display = 'flex';
        }
    }

    showDeathScreen() {
        document.getElementById('deathScreen').style.display = 'flex';
    }

    hideDeathScreen() {
        document.getElementById('deathScreen').style.display = 'none';
    }

    showPauseMenu() {
        this.isPaused = true;
        document.getElementById('pause').style.display = 'flex';
    }

    hidePauseMenu() {
        this.isPaused = false;
        document.getElementById('pause').style.display = 'none';
    }

    showInventory() {
        this.inventoryVisible = true;
        document.getElementById('inventory').style.display = 'flex';
        this.renderInventory();
    }

    hideInventory() {
        this.inventoryVisible = false;
        document.getElementById('inventory').style.display = 'none';
    }

    showSettings() {
        this.settingsVisible = true;
        document.getElementById('settings').style.display = 'flex';
    }

    hideSettings() {
        this.settingsVisible = false;
        document.getElementById('settings').style.display = 'none';
    }

    showCrafting() {
        this.craftingVisible = true;
        document.getElementById('crafting').style.display = 'flex';
        this.renderCrafting();
    }

    hideCrafting() {
        this.craftingVisible = false;
        document.getElementById('crafting').style.display = 'none';
    }

    initHotbarIcons() {
        const hotbarEl = document.getElementById('hotbar');
        const atlasCanvas = this.game.textureAtlas.image;
        if (!atlasCanvas) return;

        const getTextureIndex = (blockType) => {
            const textures = BlockTextures[blockType];
            if (!textures) return 1;
            if (blockType === BlockType.GRASS) return textures.side;
            return (textures.side !== undefined) ? textures.side : textures.top;
        };

        for (let i = 0; i < 9; i++) {
            const blockType = this.player.inventory[i];
            const slot = document.createElement('div');
            slot.classList.add('slot');
            slot.dataset.slot = i;
            if (blockType) {
                const canvas = document.createElement('canvas');
                canvas.width = 32;
                canvas.height = 32;
                canvas.classList.add('block-icon');
                const ctx = canvas.getContext('2d');
                ctx.imageSmoothingEnabled = false;
                const textureIndex = getTextureIndex(blockType);
                const sourceX = textureIndex * Config.ATLAS_SIZE_PX;
                try {
                    ctx.drawImage(atlasCanvas, sourceX, 0, Config.ATLAS_SIZE_PX, Config.ATLAS_SIZE_PX, 0, 0, 32, 32);
                } catch (e) {
                    console.error("Ошибка при отрисовке иконки хотбара:", e, "BlockType:", blockType);
                }
                slot.appendChild(canvas);
            }
            hotbarEl.appendChild(slot);
        }

        this.player.updateHotbarUI();
    }

    initInventory() {
        const inventoryGrid = document.getElementById('inventory-grid');
        for (let i = 0; i < 36; i++) {
            const slot = document.createElement('div');
            slot.classList.add('slot');
            slot.dataset.slot = i;
            inventoryGrid.appendChild(slot);
        }
    }

    renderInventory() {
        const inventoryGrid = document.getElementById('inventory-grid');
        const atlasCanvas = this.game.textureAtlas.image;
        if (!atlasCanvas) return;

        const getTextureIndex = (blockType) => {
            const textures = BlockTextures[blockType];
            if (!textures) return 1;
            if (blockType === BlockType.GRASS) return textures.side;
            return (textures.side !== undefined) ? textures.side : textures.top;
        };

        for (let i = 0; i < 36; i++) {
            const slot = inventoryGrid.children[i];
            slot.innerHTML = '';
            const blockType = this.player.inventory[i];
            if (blockType) {
                const canvas = document.createElement('canvas');
                canvas.width = 32;
                canvas.height = 32;
                canvas.classList.add('block-icon');
                const ctx = canvas.getContext('2d');
                ctx.imageSmoothingEnabled = false;
                const textureIndex = getTextureIndex(blockType);
                const sourceX = textureIndex * Config.ATLAS_SIZE_PX;
                try {
                    ctx.drawImage(atlasCanvas, sourceX, 0, Config.ATLAS_SIZE_PX, Config.ATLAS_SIZE_PX, 0, 0, 32, 32);
                } catch (e) {
                    console.error("Ошибка при отрисовке иконки инвентаря:", e, "BlockType:", blockType);
                }
                slot.appendChild(canvas);
            }
        }
    }

    initCrafting() {
        const craftingGrid = document.getElementById('crafting-grid');
        for (let i = 0; i < 9; i++) {
            const slot = document.createElement('div');
            slot.classList.add('slot');
            slot.dataset.slot = i;
            slot.addEventListener('click', () => {
                const blockType = this.player.inventory[this.player.activeSlot];
                if (blockType) {
                    this.player.craftingGrid[i] = blockType;
                    this.player.inventory[this.player.activeSlot] = null;
                    this.renderCrafting();
                    this.renderInventory();
                }
            });
            craftingGrid.appendChild(slot);
        }
    }

    renderCrafting() {
        const craftingGrid = document.getElementById('crafting-grid');
        const craftingOutput = document.getElementById('crafting-output');
        const atlasCanvas = this.game.textureAtlas.image;
        if (!atlasCanvas) return;

        const getTextureIndex = (blockType) => {
            const textures = BlockTextures[blockType];
            if (!textures) return 1;
            if (blockType === BlockType.GRASS) return textures.side;
            return (textures.side !== undefined) ? textures.side : textures.top;
        };

        for (let i = 0; i < 9; i++) {
            const slot = craftingGrid.children[i];
            slot.innerHTML = '';
            const blockType = this.player.craftingGrid[i];
            if (blockType) {
                const canvas = document.createElement('canvas');
                canvas.width = 32;
                canvas.height = 32;
                canvas.classList.add('block-icon');
                const ctx = canvas.getContext('2d');
                ctx.imageSmoothingEnabled = false;
                const textureIndex = getTextureIndex(blockType);
                const sourceX = textureIndex * Config.ATLAS_SIZE_PX;
                try {
                    ctx.drawImage(atlasCanvas, sourceX, 0, Config.ATLAS_SIZE_PX, Config.ATLAS_SIZE_PX, 0, 0, 32, 32);
                } catch (e) {
                    console.error("Ошибка при отрисовке иконки крафта:", e, "BlockType:", blockType);
                }
                slot.appendChild(canvas);
            }
        }

        const recipe = this.player.findRecipe();
        craftingOutput.innerHTML = '';
        if (recipe) {
            const blockType = recipe.produces;
            const canvas = document.createElement('canvas');
            canvas.width = 32;
            canvas.height = 32;
            canvas.classList.add('block-icon');
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = false;
            const textureIndex = getTextureIndex(blockType);
            const sourceX = textureIndex * Config.ATLAS_SIZE_PX;
            try {
                ctx.drawImage(atlasCanvas, sourceX, 0, Config.ATLAS_SIZE_PX, Config.ATLAS_SIZE_PX, 0, 0, 32, 32);
            } catch (e) {
                console.error("Ошибка при отрисовке иконки крафта:", e, "BlockType:", blockType);
            }
            craftingOutput.appendChild(canvas);
        }
    }

    updateInfo() {
        const pos = this.player.position;
        document.getElementById('pos').textContent = `${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)}`;
        const cx = Math.floor(pos.x / Config.CHUNK_SIZE);
        const cz = Math.floor(pos.z / Config.CHUNK_SIZE);
        document.getElementById('chunkPos').textContent = `${cx}, ${cz}`;
        document.getElementById('fps').textContent = this.game.fps;
        document.getElementById('chunkCount').textContent = this.game.world.chunks.size;
        document.getElementById('velocityY').textContent = this.player.velocity.y.toFixed(2);
    }
}