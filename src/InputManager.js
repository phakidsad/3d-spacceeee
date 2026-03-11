export class InputManager {
    constructor(game) {
        this.game = game;
        this.keys = {
            w: false,
            a: false,
            s: false,
            d: false,
            space: false,
            shift: false,
            control: false
        };
        
        // Mouse look accumulator
        this.movementX = 0;
        this.movementY = 0;
        
        // Mouse click
        this.isShooting = false;
        
        this._initListeners();
    }

    _initListeners() {
        window.addEventListener('keydown', (e) => this._onKeyDown(e));
        window.addEventListener('keyup', (e) => this._onKeyUp(e));
        
        // Pointer lock setup
        document.addEventListener('pointerlockchange', () => this._onPointerLockChange(), false);
        document.addEventListener('mozpointerlockchange', () => this._onPointerLockChange(), false);
        
        // Mouse movement (only track if locked)
        window.addEventListener('mousemove', (e) => this._onMouseMove(e));
        
        // Mouse clicks
        window.addEventListener('mousedown', (e) => {
            if (e.button === 0 && this.game.state === 'PLAYING' && this.game.isPointerLocked) {
                this.isShooting = true;
            } else if (e.button === 0 && this.game.state === 'PLAYING' && !this.game.isPointerLocked) {
                // Clicking in game requests lock again
                document.body.requestPointerLock();
            }
        });
        
        window.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                this.isShooting = false;
            }
        });
    }

    _onKeyDown(e) {
        const key = e.key.toLowerCase();
        if (key === ' ') {
            this.keys.space = true;
        } else if (key === 'shift') {
            this.keys.shift = true;
        } else if (key === 'control') {
            this.keys.control = true;
        } else if (this.keys.hasOwnProperty(key)) {
            this.keys[key] = true;
        }
    }

    _onKeyUp(e) {
        const key = e.key.toLowerCase();
        if (key === ' ') {
            this.keys.space = false;
        } else if (key === 'shift') {
            this.keys.shift = false;
        } else if (key === 'control') {
            this.keys.control = false;
        } else if (this.keys.hasOwnProperty(key)) {
            this.keys[key] = false;
        }
    }

    _onPointerLockChange() {
        if (document.pointerLockElement === document.body || document.mozPointerLockElement === document.body) {
            this.game.setPointerLocked(true);
        } else {
            this.game.setPointerLocked(false);
            this.isShooting = false; // Stop shooting if lock lost
        }
    }

    _onMouseMove(e) {
        if (this.game.isPointerLocked) {
            this.movementX += e.movementX || e.mozMovementX || e.webkitMovementX || 0;
            this.movementY += e.movementY || e.mozMovementY || e.webkitMovementY || 0;
        }
    }

    // Call this at the end of the frame to reset accumulators
    resetMouseMovement() {
        this.movementX = 0;
        this.movementY = 0;
    }
}
