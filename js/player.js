import * as THREE from 'three';
import { Config, BlockType, NonSolidBlocks, LiquidBlocks, Recipes } from './config.js';
import { PointerLockControls } from './utils.js';

export class Player {
    static heartColor = '#E02020';
    static heartEmptyColor = '#404040';
    static heartClearColor = 'rgba(0,0,0,0)';
    static heartFullPixels = [
        [0, 0, 1, 1, 0, 1, 1, 0, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 0],
        [0, 0, 1, 1, 1, 1, 1, 0, 0],
        [0, 0, 0, 1, 1, 1, 0, 0, 0],
        [0, 0, 0, 0, 1, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0]
    ];
    static heartEmptyPixels = [
        [0, 0, 1, 1, 0, 1, 1, 0, 0],
        [0, 1, 0, 0, 1, 0, 0, 1, 0],
        [0, 1, 0, 0, 0, 0, 0, 1, 0],
        [0, 1, 0, 0, 0, 0, 0, 1, 0],
        [0, 0, 1, 0, 0, 0, 1, 0, 0],
        [0, 0, 0, 1, 0, 1, 0, 0, 0],
        [0, 0, 0, 0, 1, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0]
    ];

    static drawHeart(canvas, isEmpty) {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const pixelArray = isEmpty ? Player.heartEmptyPixels : Player.heartFullPixels;
        const color = isEmpty ? Player.heartEmptyColor : Player.heartColor;
        ctx.clearRect(0, 0, 9, 9);
        for (let y = 0; y < 9; y++) {
            for (let x = 0; x < 9; x++) {
                if (pixelArray[y][x] === 1) {
                    ctx.fillStyle = color;
                } else {
                    ctx.fillStyle = Player.heartClearColor;
                }
                ctx.fillRect(x, y, 1, 1);
            }
        }
    }

    constructor(camera, world, game) {
        this.camera = camera;
        this.world = world;
        this.game = game;
        this.position = new THREE.Vector3(0, Config.CHUNK_HEIGHT + 50, 0);
        this.velocity = new THREE.Vector3();
        this.controls = new PointerLockControls(camera, document.body);
        this.raycaster = new THREE.Raycaster();
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.moveUp = false;
        this.moveDown = false;
        this.onGround = false;
        this.isInWater = false;
        this.isSubmerged = false;
        this.maxFallVelocity = 0;
        this.isWaitingForSpawn = true;
        this.health = Config.PLAYER_MAX_HEALTH;
        this.isAlive = true;
        this.isFlying = false;
        this.lastSpacePress = 0;
        this.flySpeed = Config.FLY_SPEED;
        this.inventory = new Array(36).fill(null);
        const startingItems = [BlockType.STONE, BlockType.GRASS, BlockType.DIRT, BlockType.WOOD, BlockType.SAND, BlockType.LEAVES, BlockType.COAL, BlockType.IRON, BlockType.DIAMOND, BlockType.CRAFTING_TABLE];
        for (let i = 0; i < startingItems.length; i++) {
            this.inventory[i] = startingItems[i];
        }
        this.activeSlot = 0;
        this.craftingGrid = new Array(9).fill(null);
        this.setupControls();
        this.initHealthUI();
    }

    setupControls() {
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));
        document.addEventListener('mousedown', (e) => this.onMouseDown(e));
    }

    initHealthUI() {
        const heartsContainer = document.getElementById('hearts');
        heartsContainer.innerHTML = '';
        for (let i = 0; i < Config.PLAYER_MAX_HEALTH / 2; i++) {
            const heartContainer = document.createElement('div');
            heartContainer.classList.add('heart');
            const canvas = document.createElement('canvas');
            canvas.width = 9;
            canvas.height = 9;
            canvas.style.width = '18px';
            canvas.style.height = '18px';
            canvas.style.imageRendering = 'pixelated';
            canvas.style.imageRendering = 'crisp-edges';
            heartContainer.appendChild(canvas);
            heartsContainer.appendChild(heartContainer);
        }
        this.updateHealthUI();
    }

    updateHealthUI() {
        const hearts = document.querySelectorAll('.heart');
        const displayHearts = Math.ceil(this.health / 2);
        hearts.forEach((heartContainer, index) => {
            const canvas = heartContainer.querySelector('canvas');
            if (!canvas) return;
            if (index < displayHearts) {
                heartContainer.classList.remove('heart-empty');
                Player.drawHeart(canvas, false);
            } else {
                heartContainer.classList.add('heart-empty');
                Player.drawHeart(canvas, true);
            }
        });
    }

    takeDamage(amount) {
        if (!this.isAlive || amount <= 0 || this.isWaitingForSpawn || this.isFlying) return;
        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
            this.die();
        }
        this.updateHealthUI();
    }

    die() {
        if (!this.isAlive) return;
        this.isAlive = false;
        this.isFlying = false;
        this.controls.unlock();
        this.game.showDeathScreen();
    }

    respawn() {
        this.isAlive = true;
        this.health = Config.PLAYER_MAX_HEALTH;
        this.velocity.set(0, 0, 0);
        this.position.set(0, Config.CHUNK_HEIGHT + 50, 0);
        this.isWaitingForSpawn = true;
        this.isFlying = false;
        this.onGround = false;
        this.isInWater = false;
        this.isSubmerged = false;
        this.maxFallVelocity = 0;
        this.updateHealthUI();
        this.game.hideDeathScreen();
        this.game.updateFog(false);
        this.game.showLoading("Возрождение: Ожидание генерации мира...");
    }

    toggleFlyMode() {
        this.isFlying = !this.isFlying;
        console.log("Режим полета:", this.isFlying);
        if (this.isFlying) {
            this.velocity.y = 0;
            this.onGround = false;
        } else {
            this.maxFallVelocity = 0;
        }
    }

    updateHotbarUI() {
        const slots = document.querySelectorAll('.slot');
        slots.forEach(slot => {
            if (parseInt(slot.dataset.slot) === this.activeSlot) {
                slot.classList.add('active');
            } else {
                slot.classList.remove('active');
            }
        });
    }

    onKeyDown(event) {
        if (!this.isAlive || this.isWaitingForSpawn) return;
        switch (event.code) {
            case 'KeyW':
                this.moveForward = true;
                break;
            case 'KeyA':
                this.moveLeft = true;
                break;
            case 'KeyS':
                this.moveBackward = true;
                break;
            case 'KeyD':
                this.moveRight = true;
                break;
            case 'Space':
                const now = performance.now();
                if (now - this.lastSpacePress < 300) {
                    this.toggleFlyMode();
                }
                this.lastSpacePress = now;
                this.moveUp = true;
                break;
            case 'ShiftLeft':
                this.moveDown = true;
                break;
            case 'Digit1':
                this.activeSlot = 0;
                this.updateHotbarUI();
                break;
            case 'Digit2':
                this.activeSlot = 1;
                this.updateHotbarUI();
                break;
            case 'Digit3':
                this.activeSlot = 2;
                this.updateHotbarUI();
                break;
            case 'Digit4':
                this.activeSlot = 3;
                this.updateHotbarUI();
                break;
            case 'Digit5':
                this.activeSlot = 4;
                this.updateHotbarUI();
                break;
            case 'Digit6':
                this.activeSlot = 5;
                this.updateHotbarUI();
                break;
            case 'Digit7':
                this.activeSlot = 6;
                this.updateHotbarUI();
                break;
            case 'Digit8':
                this.activeSlot = 7;
                this.updateHotbarUI();
                break;
            case 'Digit9':
                this.activeSlot = 8;
                this.updateHotbarUI();
                break;
        }
    }

    onKeyUp(event) {
        switch (event.code) {
            case 'KeyW':
                this.moveForward = false;
                break;
            case 'KeyA':
                this.moveLeft = false;
                break;
            case 'KeyS':
                this.moveBackward = false;
                break;
            case 'KeyD':
                this.moveRight = false;
                break;
            case 'Space':
                this.moveUp = false;
                break;
            case 'ShiftLeft':
                this.moveDown = false;
                break;
        }
    }

    onMouseDown(event) {
        if (!this.isAlive) {
            if (this.controls.isLocked) {
                this.respawn();
            }
            return;
        }
        if (!this.controls.isLocked || this.isWaitingForSpawn) return;
        event.preventDefault();
        if (event.button === 2) {
            document.addEventListener('contextmenu', function(e) {
                e.preventDefault();
            }, { once: true });
        }
        const intersection = this.getIntersection();
        if (intersection) {
            const { point, normal, face } = intersection;
            if (event.button === 0) {
                const blockPos = point.clone().sub(normal.multiplyScalar(0.5));
                this.world.setBlock(Math.floor(blockPos.x), Math.floor(blockPos.y), Math.floor(blockPos.z), BlockType.AIR);
            } else if (event.button === 2) {
                const blockType = this.world.getBlock(Math.floor(point.x - normal.x * 0.5), Math.floor(point.y - normal.y * 0.5), Math.floor(point.z - normal.z * 0.5));
                if (blockType === BlockType.CRAFTING_TABLE) {
                    this.game.ui.showCrafting();
                    this.controls.unlock();
                    return;
                }

                const blockPos = point.clone().add(normal.multiplyScalar(0.5));
                const bx = Math.floor(blockPos.x);
                const by = Math.floor(blockPos.y);
                const bz = Math.floor(blockPos.z);
                if (!this.checkIntersectionWithPlayer(bx, by, bz)) {
                    const blockToPlace = this.inventory[this.activeSlot];
                    this.world.setBlock(bx, by, bz, blockToPlace);
                }
            }
        }
    }

    checkIntersectionWithPlayer(bx, by, bz) {
        const p = this.position;
        const r = Config.PLAYER_RADIUS;
        const h = Config.PLAYER_HEIGHT;
        const blockX = bx + 0.5;
        const blockY = by + 0.5;
        const blockZ = bz + 0.5;
        const intersectX = Math.abs(p.x - blockX) < (r + 0.5);
        const intersectZ = Math.abs(p.z - blockZ) < (r + 0.5);
        const eyeOffset = h - 0.2;
        const playerBottom = p.y - eyeOffset;
        const playerTop = p.y + 0.2;
        const blockBottom = blockY - 0.5;
        const blockTop = blockY + 0.5;
        const intersectY = playerBottom < blockTop && playerTop > blockBottom;
        return intersectX && intersectY && intersectZ;
    }

    getIntersection() {
        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
        this.raycaster.far = Config.INTERACTION_DISTANCE;
        const meshes = [];
        this.world.chunks.forEach(chunk => {
            if (chunk.raycastMesh) meshes.push(chunk.raycastMesh);
            if (chunk.meshTranslucent) meshes.push(chunk.meshTranslucent);
        });
        const intersects = this.raycaster.intersectObjects(meshes);
        if (intersects.length > 0) {
            const intersect = intersects[0];
            const normal = intersect.face.normal.clone();
            normal.transformDirection(intersect.object.matrixWorld);
            return { point: intersect.point, normal: normal, face: intersect.face };
        }
        return null;
    }

    checkCollision(position) {
        const r = Config.PLAYER_RADIUS;
        const h = Config.PLAYER_HEIGHT;
        const eyeOffset = h - 0.2;
        const minX = Math.floor(position.x - r);
        const maxX = Math.floor(position.x + r);
        const minY = Math.floor(position.y - eyeOffset);
        const maxY = Math.floor(position.y + 0.2 - 0.01);
        const minZ = Math.floor(position.z - r);
        const maxZ = Math.floor(position.z + r);
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                for (let z = minZ; z <= maxZ; z++) {
                    const block = this.world.getBlock(x, y, z);
                    if (block !== BlockType.AIR && !NonSolidBlocks.has(block)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    updateEnvironmentState() {
        const px = Math.floor(this.position.x);
        const py = Math.floor(this.position.y);
        const pz = Math.floor(this.position.z);
        const eyeOffset = Config.PLAYER_HEIGHT - 0.2;
        const feetY = Math.floor(this.position.y - eyeOffset + 0.1);
        const blockAtFeet = this.world.getBlock(px, feetY, pz);
        this.isInWater = LiquidBlocks.has(blockAtFeet);
        const blockAtHead = this.world.getBlock(px, py, pz);
        const wasSubmerged = this.isSubmerged;
        this.isSubmerged = LiquidBlocks.has(blockAtHead);
        if (wasSubmerged !== this.isSubmerged) {
            this.game.updateFog(this.isSubmerged);
        }
    }

    handleLanding() {
        if (this.isInWater || this.isFlying) {
            this.maxFallVelocity = 0;
            return;
        }
        if (this.maxFallVelocity < Config.SAFE_FALL_SPEED) {
            const impactSpeed = Math.abs(this.maxFallVelocity);
            const safeSpeed = Math.abs(Config.SAFE_FALL_SPEED);
            const damage = Math.floor((impactSpeed - safeSpeed) * Config.FALL_DAMAGE_MULTIPLIER);
            if (damage > 0) {
                this.takeDamage(damage);
            }
        }
        this.maxFallVelocity = 0;
    }

    updatePhysics(delta) {
        if (!this.isAlive) return;
        if (this.isWaitingForSpawn) {
            const groundY = this.world.getHighestBlock(Math.floor(this.position.x), Math.floor(this.position.z));
            if (groundY !== null) {
                const eyeOffset = Config.PLAYER_HEIGHT - 0.2;
                this.position.y = groundY + 1 + eyeOffset;
                this.velocity.set(0, 0, 0);
                this.isWaitingForSpawn = false;
                this.game.hideLoading();
                console.log("Игрок появился на высоте Y:", this.position.y.toFixed(2));
            } else {
                this.position.y = Config.CHUNK_HEIGHT + 50;
                this.velocity.set(0, 0, 0);
                this.camera.position.copy(this.position);
                this.game.showLoading("Ожидание генерации мира...");
                return;
            }
        }
        this.updateEnvironmentState();
        if (this.isFlying) {
            this.velocity.y = 0;
            if (this.moveUp) {
                this.velocity.y = Config.MOVE_SPEED;
            } else if (this.moveDown) {
                this.velocity.y = -Config.MOVE_SPEED;
            }
            this.onGround = false;
        } else {
            const currentGravity = this.isInWater ? Config.WATER_GRAVITY : Config.GRAVITY;
            this.velocity.y -= currentGravity * delta;
            const terminalVelocity = this.isInWater ? Config.MAX_FALL_SPEED_WATER : Config.TERMINAL_VELOCITY;
            if (this.velocity.y < terminalVelocity) {
                this.velocity.y = terminalVelocity;
            }
            if (this.moveUp) {
                if (this.isInWater) {
                    if (!this.isSubmerged) {
                        if (this.velocity.y < Config.JUMP_FORCE_WATER_EXIT * 0.5) {
                            this.velocity.y = Config.JUMP_FORCE_WATER_EXIT;
                        }
                    } else {
                        this.velocity.y += Config.SWIM_FORCE_Y * 5 * delta;
                    }
                } else if (this.onGround) {
                    this.velocity.y = Config.JUMP_FORCE;
                    this.onGround = false;
                    this.maxFallVelocity = 0;
                }
            }
            if (this.moveDown && this.isInWater) {
                this.velocity.y -= Config.SWIM_FORCE_Y * 5 * delta;
            }
        }
        const inputDirection = new THREE.Vector3();
        inputDirection.z = Number(this.moveForward) - Number(this.moveBackward);
        inputDirection.x = Number(this.moveRight) - Number(this.moveLeft);
        inputDirection.normalize();
        const cameraDirection = new THREE.Vector3();
        this.controls.getDirection(cameraDirection);
        if (!this.isSubmerged && !this.isFlying) {
            cameraDirection.y = 0;
        }
        cameraDirection.normalize();
        const right = new THREE.Vector3(0, 1, 0).cross(cameraDirection).normalize();
        const moveVector = new THREE.Vector3();
        moveVector.addScaledVector(cameraDirection, inputDirection.z);
        moveVector.addScaledVector(right, -inputDirection.x);
        let damping;
        let moveSpeed;
        if (this.isFlying) {
            damping = 15.0;
            moveSpeed = this.flySpeed;
        } else if (this.isInWater) {
            damping = Config.WATER_DRAG;
            moveSpeed = Config.SWIM_SPEED;
        } else {
            damping = this.onGround ? 20.0 : 8.0;
            moveSpeed = Config.MOVE_SPEED;
        }
        this.velocity.x -= this.velocity.x * damping * delta;
        this.velocity.z -= this.velocity.z * damping * delta;
        if (this.isInWater && !this.isFlying) {
            this.velocity.y -= this.velocity.y * damping * delta;
        }
        const acceleration = moveSpeed * damping * delta;
        this.velocity.x += moveVector.x * acceleration;
        this.velocity.z += moveVector.z * acceleration;
        if (this.isSubmerged || this.isFlying) {
            this.velocity.y += moveVector.y * acceleration;
        }
        if (this.isFlying) {
            this.maxFallVelocity = 0;
        } else if (this.onGround || this.isInWater) {
            this.maxFallVelocity = 0;
        } else {
            if (this.velocity.y < this.maxFallVelocity) {
                this.maxFallVelocity = this.velocity.y;
            }
        }
        const potentialPosition = this.position.clone();
        const prevOnGround = this.onGround;
        potentialPosition.y += this.velocity.y * delta;
        if (this.checkCollision(potentialPosition)) {
            potentialPosition.y = this.position.y;
            if (this.velocity.y < 0 && !this.isFlying) {
                this.onGround = true;
            }
            this.velocity.y = 0;
        } else {
            if (!this.isFlying) {
                this.onGround = false;
            }
        }
        if (!prevOnGround && this.onGround) {
            this.handleLanding();
        }
        potentialPosition.x += this.velocity.x * delta;
        if (this.checkCollision(potentialPosition)) {
            potentialPosition.x = this.position.x;
            this.velocity.x = 0;
        }
        potentialPosition.z += this.velocity.z * delta;
        if (this.checkCollision(potentialPosition)) {
            potentialPosition.z = this.position.z;
            this.velocity.z = 0;
        }
        this.position.copy(potentialPosition);
        this.camera.position.copy(this.position);
        if (this.position.y < -50) {
            this.takeDamage(100);
        }
    }

    craft() {
        const recipe = this.findRecipe();
        if (recipe) {
            this.removeIngredients(recipe.ingredients);
            this.addCraftedItem(recipe.produces, recipe.quantity);
        }
    }

    findRecipe() {
        for (const blockType in Recipes) {
            const recipe = Recipes[blockType];
            let match = true;
            for (const ingredient in recipe.ingredients) {
                const count = this.countInCraftingGrid(ingredient);
                if (count < recipe.ingredients[ingredient]) {
                    match = false;
                    break;
                }
            }
            if (match) {
                return recipe;
            }
        }
        return null;
    }

    countInCraftingGrid(blockType) {
        return this.craftingGrid.filter(b => b === parseInt(blockType)).length;
    }

    removeIngredients(ingredients) {
        for (const ingredient in ingredients) {
            for (let i = 0; i < ingredients[ingredient]; i++) {
                const index = this.craftingGrid.findIndex(b => b === parseInt(ingredient));
                this.craftingGrid[index] = null;
            }
        }
    }

    addCraftedItem(blockType, quantity) {
        for (let i = 0; i < quantity; i++) {
            const index = this.inventory.findIndex(b => b === null);
            if (index !== -1) {
                this.inventory[index] = blockType;
            }
        }
    }
}