import { Euler, EventDispatcher } from 'three';

class SimplexNoise {
    constructor(seed = Math.random()) {
        this.p = new Uint8Array(256);
        this.perm = new Uint8Array(512);
        this.permMod12 = new Uint8Array(512);
        this.init(seed);
    }

    init(seed) {
        const random = () => {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        };
        for (let i = 0; i < 256; i++) {
            this.p[i] = Math.floor(random() * 256);
        }
        for (let i = 0; i < 512; i++) {
            this.perm[i] = this.p[i & 255];
            this.permMod12[i] = this.perm[i] % 12;
        }
    }

    noise2D(xin, yin) {
        const grad3 = [1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1];
        let n0, n1, n2;
        const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
        const s = (xin + yin) * F2;
        const i = Math.floor(xin + s);
        const j = Math.floor(yin + s);
        const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
        const t = (i + j) * G2;
        const X0 = i - t;
        const Y0 = j - t;
        const x0 = xin - X0;
        const y0 = yin - Y0;
        let i1, j1;
        if (x0 > y0) {
            i1 = 1;
            j1 = 0;
        } else {
            i1 = 0;
            j1 = 1;
        }
        const x1 = x0 - i1 + G2;
        const y1 = y0 - j1 + G2;
        const x2 = x0 - 1.0 + 2.0 * G2;
        const y2 = y0 - 1.0 + 2.0 * G2;
        const ii = i & 255;
        const jj = j & 255;
        const gi0 = this.permMod12[ii + this.perm[jj]];
        const gi1 = this.permMod12[ii + i1 + this.perm[jj + j1]];
        const gi2 = this.permMod12[ii + 1 + this.perm[jj + 1]];
        let t0 = 0.5 - x0 * x0 - y0 * y0;
        if (t0 < 0) n0 = 0.0;
        else {
            t0 *= t0;
            n0 = t0 * t0 * (grad3[gi0 * 3] * x0 + grad3[gi0 * 3 + 1] * y0);
        }
        let t1 = 0.5 - x1 * x1 - y1 * y1;
        if (t1 < 0) n1 = 0.0;
        else {
            t1 *= t1;
            n1 = t1 * t1 * (grad3[gi1 * 3] * x1 + grad3[gi1 * 3 + 1] * y1);
        }
        let t2 = 0.5 - x2 * x2 - y2 * y2;
        if (t2 < 0) n2 = 0.0;
        else {
            t2 *= t2;
            n2 = t2 * t2 * (grad3[gi2 * 3] * x2 + grad3[gi2 * 3 + 1] * y2);
        }
        return 70.0 * (n0 + n1 + n2);
    }
}

const _euler = new Euler(0, 0, 0, 'YXZ');
const _PI_2 = Math.PI / 2;

class PointerLockControls extends EventDispatcher {
    constructor(camera, domElement) {
        super();
        this.domElement = domElement;
        this.isLocked = false;
        this.camera = camera;
        const scope = this;

        function onMouseMove(event) {
            if (scope.isLocked === false) return;
            const movementX = event.movementX || 0;
            const movementY = event.movementY || 0;
            _euler.setFromQuaternion(camera.quaternion);
            _euler.y -= movementX * 0.002;
            _euler.x -= movementY * 0.002;
            _euler.x = Math.max(-_PI_2, Math.min(_PI_2, _euler.x));
            camera.quaternion.setFromEuler(_euler);
        }

        function onPointerlockChange() {
            if (scope.domElement.ownerDocument.pointerLockElement === scope.domElement) {
                scope.dispatchEvent({ type: 'lock' });
                scope.isLocked = true;
            } else {
                scope.dispatchEvent({ type: 'unlock' });
                scope.isLocked = false;
            }
        }

        this.connect = function () {
            scope.domElement.ownerDocument.addEventListener('mousemove', onMouseMove);
            scope.domElement.ownerDocument.addEventListener('pointerlockchange', onPointerlockChange);
        };

        this.lock = function () {
            this.domElement.requestPointerLock();
        };

        this.unlock = function () {
            this.domElement.ownerDocument.exitPointerLock();
        };

        this.getDirection = function(v) {
            return v.set(0, 0, -1).applyQuaternion(camera.quaternion);
        };

        this.connect();
    }
}

export { SimplexNoise, PointerLockControls };