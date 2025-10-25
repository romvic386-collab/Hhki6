import * as THREE from 'three';
import { Config } from './js/config.js';
import { World } from './js/world.js';
import { Player } from './js/player.js';
import { UI } from './js/ui.js';

function generateProceduralTextureAtlas() {
    console.log("Генерация процедурного текстурного атласа...");
    const canvas = document.createElement('canvas');
    const tileSize = Config.ATLAS_SIZE_PX;
    canvas.width = tileSize * Config.ATLAS_COUNT_X;
    canvas.height = tileSize;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const colors = {
        grass: { r: 100, g: 180, b: 70 },
        dirt: { r: 130, g: 100, b: 60 },
        stone: { r: 120, g: 120, b: 120 },
        wood: { r: 160, g: 120, b: 60 },
        leaves: { r: 50, g: 150, b: 40 },
        sand: { r: 230, g: 220, b: 170 },
        water: { r: 60, g: 120, b: 220 },
        coal: { r: 40, g: 40, b: 40 },
        iron: { r: 210, g: 180, b: 160 },
        diamond: { r: 180, g: 220, b: 220 },
        craftingTable: { r: 180, g: 140, b: 80 }
    };

    function applyNoise(xOffset, baseColor, variation, alpha = 1) {
        for (let y = 0; y < tileSize; y++) {
            for (let x = 0; x < tileSize; x++) {
                const noise = (Math.random() - 0.5) * variation;
                const r = Math.max(0, Math.min(255, baseColor.r + noise));
                const g = Math.max(0, Math.min(255, baseColor.g + noise));
                const b = Math.max(0, Math.min(255, baseColor.b + noise));
                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
                ctx.fillRect(xOffset + x, y, 1, 1);
            }
        }
    }

    applyNoise(0 * tileSize, colors.grass, 30);
    applyNoise(1 * tileSize, colors.dirt, 25);
    applyNoise(2 * tileSize, colors.dirt, 25);
    for (let y = 0; y < 5; y++) {
        for (let x = 0; x < tileSize; x++) {
            const noise = (Math.random() - 0.5) * 30;
            const r = Math.max(0, Math.min(255, colors.grass.r + noise));
            const g = Math.max(0, Math.min(255, colors.grass.g + noise));
            const b = Math.max(0, Math.min(255, colors.grass.b + noise));
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 1)`;
            ctx.fillRect(2 * tileSize + x, y, 1, 1);
        }
    }
    applyNoise(3 * tileSize, colors.stone, 20);
    const xOffsetWood = 4 * tileSize;
    for (let x = 0; x < tileSize; x++) {
        const grainNoise = (Math.random() - 0.5) * 30;
        for (let y = 0; y < tileSize; y++) {
            const pixelNoise = (Math.random() - 0.5) * 10;
            const noise = grainNoise + pixelNoise;
            const r = Math.max(0, Math.min(255, colors.wood.r + noise));
            const g = Math.max(0, Math.min(255, colors.wood.g + noise));
            const b = Math.max(0, Math.min(255, colors.wood.b + noise));
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 1)`;
            ctx.fillRect(xOffsetWood + x, y, 1, 1);
        }
    }
    const xOffsetLeaves = 5 * tileSize;
    for (let y = 0; y < tileSize; y++) {
        for (let x = 0; x < tileSize; x++) {
            if (Math.random() > 0.8) continue;
            const noise = (Math.random() - 0.5) * 40;
            const r = Math.max(0, Math.min(255, colors.leaves.r + noise));
            const g = Math.max(0, Math.min(255, colors.leaves.g + noise));
            const b = Math.max(0, Math.min(255, colors.leaves.b + noise));
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 1)`;
            ctx.fillRect(xOffsetLeaves + x, y, 1, 1);
        }
    }
    applyNoise(6 * tileSize, colors.sand, 15);
    applyNoise(7 * tileSize, colors.water, 20, 0.8);
    applyNoise(8 * tileSize, colors.coal, 10);
    applyNoise(9 * tileSize, colors.iron, 15);
    applyNoise(10 * tileSize, colors.diamond, 20);
    applyNoise(11 * tileSize, colors.craftingTable, 20);


    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.format = THREE.RGBAFormat;
    texture.needsUpdate = true;
    return texture;
}

class Game {
    constructor(textureAtlas) {
        this.textureAtlas = textureAtlas;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.world = null;
        this.player = null;
        this.ui = null;
        this.prevTime = performance.now();
        this.fps = 0;
        this.fpsCounter = 0;
        this.lastFpsUpdate = 0;
        this.timeOfDay = 0.25; // Start at sunrise
        this.init();
    }

    init() {
        this.showLoading("Инициализация движка...");
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(Config.COLOR_SKY);
        this.scene.fog = new THREE.Fog(Config.COLOR_SKY, 0, 1);
        this.updateFog(false);
        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
        const materialOpaque = new THREE.MeshStandardMaterial({
            map: this.textureAtlas,
            side: THREE.FrontSide,
            transparent: false,
            alphaTest: 0.5
        });
        const materialTranslucent = new THREE.MeshStandardMaterial({
            map: this.textureAtlas,
            side: THREE.FrontSide,
            transparent: true,
        });
        this.world = new World(this.scene, materialOpaque, materialTranslucent);
        this.player = new Player(this.camera, this.world, this);
        this.ui = new UI(this, this.player);
        this.ambientLight = new THREE.AmbientLight(0xaaaaaa);
        this.scene.add(this.ambientLight);
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        this.directionalLight.position.set(1, 1.5, 0.5).normalize();
        this.scene.add(this.directionalLight);
        this.renderer = new THREE.WebGLRenderer({ antialias: false });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);
        window.addEventListener('resize', () => this.onWindowResize());
        this.animate();
    }

    updateFog(isUnderwater) {
        if (!this.scene || !this.scene.fog || !this.scene.background) return;
        const fogDistance = Config.RENDER_DISTANCE * Config.CHUNK_SIZE;
        if (isUnderwater) {
            this.scene.fog.color.setHex(Config.COLOR_UNDERWATER);
            this.scene.background.setHex(Config.COLOR_UNDERWATER);
            this.scene.fog.near = 0.1;
            this.scene.fog.far = 35;
        } else {
            const time = this.timeOfDay;
            const dayColor = new THREE.Color(Config.COLOR_SKY);
            const nightColor = new THREE.Color(0x0a0a2a);
            const color = dayColor.lerp(nightColor, Math.max(0, Math.sin(time * Math.PI * 2 - Math.PI / 2)));
            this.scene.fog.color.set(color);
            this.scene.background.set(color);
            this.scene.fog.near = fogDistance * 0.6;
            this.scene.fog.far = fogDistance * 1.1;
        }
    }

    showLoading(message) {
        this.ui.showLoading(message);
    }

    hideLoading() {
        this.ui.hideLoading();
    }

    showDeathScreen() {
        this.ui.showDeathScreen();
    }

    hideDeathScreen() {
        this.ui.hideDeathScreen();
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    updateDaylight() {
        const time = this.timeOfDay;
        const sinTime = Math.sin(time * Math.PI * 2);
        this.directionalLight.intensity = Math.max(0, sinTime) * 0.8;
        this.ambientLight.intensity = Math.max(0.2, sinTime * 0.5);
        this.directionalLight.position.set(Math.cos(time * Math.PI * 2), Math.sin(time * Math.PI * 2), 0.5).normalize();
        this.updateFog(this.player.isSubmerged);
    }

    animate() {
        if (!this.renderer) return;
        requestAnimationFrame(() => this.animate());
        const time = performance.now();
        const delta = Math.min((time - this.prevTime) / 1000, 0.1);
        this.fpsCounter++;
        if (time > this.lastFpsUpdate + 1000) {
            this.fps = this.fpsCounter;
            this.fpsCounter = 0;
            this.lastFpsUpdate = time;
        }

        this.timeOfDay += delta / 600; // 10 minute day/night cycle
        if (this.timeOfDay >= 1) {
            this.timeOfDay = 0;
        }

        this.updateDaylight();

        if (this.player.isAlive) {
            this.player.updatePhysics(delta);
        }
        const updatePos = (this.player.isWaitingForSpawn || !this.player.isAlive) ? new THREE.Vector3(0, 0, 0) : this.player.position;
        this.world.update(updatePos);
        if (this.player.controls.isLocked === true && !this.player.isWaitingForSpawn) {
            this.ui.updateInfo();
        }
        this.world.processQueues();
        this.prevTime = time;
        this.renderer.render(this.scene, this.camera);
    }
}

function launchGame() {
    if (typeof THREE === 'undefined') {
        document.getElementById('loading-text').innerHTML = "<h1>Ошибка</h1><p>Не удалось загрузить библиотеку Three.js...</p>";
        document.getElementById('loading').style.display = 'flex';
        return;
    }
    try {
        const textureAtlas = generateProceduralTextureAtlas();
        new Game(textureAtlas);
    } catch (e) {
        console.error("Критическая ошибка инициализации игры:", e);
        document.getElementById('loading-text').innerHTML = "<h1>Ошибка инициализации</h1><p>Произошла ошибка при запуске игры. Проверьте консоль (F12).</p>";
        document.getElementById('loading').style.display = 'flex';
    }
}

launchGame();