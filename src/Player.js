import * as THREE from 'three';

export class Player {
    constructor(scene, game) {
        this.scene = scene;
        this.game = game;
        this.mesh = this.createShipParams();
        this.scene.add(this.mesh);

        // Movement variables
        this.velocity = new THREE.Vector3();
        this.acceleration = new THREE.Vector3();
        this.maxSpeed = 60;
        this.friction = 0.92; // Slightly lower friction for more "slide" / inertia
        this.thrust = 120;
        
        // Dodging
        this.isDodging = false;
        this.dodgeCooldown = 0;
        this.dodgeDuration = 0.2;
        this.dodgeTimer = 0;
        this.dodgeSpeed = 150;
        
        // Weapon
        this.fireCooldown = 0;
        this.fireRate = 0.15; // Time between shots in seconds

        // Bullet Pool reference (injected from main.js)
        this.bulletPool = null;
    }

    createShipParams() {
        // Create a stylized futuristic spaceship using simple geometry
        const group = new THREE.Group();
        
        // Main fuselage
        const bodyGeo = new THREE.ConeGeometry(1, 4, 8);
        bodyGeo.rotateX(Math.PI / 2); // Point forward (Z axis in Three.js)
        const bodyMat = new THREE.MeshStandardMaterial({ 
            color: 0x00f0ff, 
            metalness: 0.8, 
            roughness: 0.2,
            emissive: 0x002244,
            emissiveIntensity: 0.5
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        group.add(body);
        
        // Wings
        const wingGeo = new THREE.BoxGeometry(6, 0.2, 2);
        const wingMat = new THREE.MeshStandardMaterial({ 
            color: 0x222222, 
            metalness: 0.9, 
            roughness: 0.1 
        });
        const wings = new THREE.Mesh(wingGeo, wingMat);
        wings.position.set(0, 0, 1);
        group.add(wings);
        
        // Engine thrusters (glow)
        const engineGeo = new THREE.CylinderGeometry(0.3, 0.5, 0.5, 8);
        engineGeo.rotateX(Math.PI / 2);
        const engineMat = new THREE.MeshBasicMaterial({ color: 0xff0055 });
        const engine = new THREE.Mesh(engineGeo, engineMat);
        engine.position.set(0, 0, 2.2);
        group.add(engine);

        return group;
    }

    update(deltaTime, inputManager, cameraController) {
        if (!this.mesh || this.game.state !== 'PLAYING') return;

        // Decrease cooldowns
        if (this.dodgeCooldown > 0) this.dodgeCooldown -= deltaTime;
        if (this.fireCooldown > 0) this.fireCooldown -= deltaTime;
        
        // 1. Determine Input Direction relative to Camera orientation
        // We only care about Yaw (Y-axis rotation) for movement direction
        const yawEuler = new THREE.Euler(0, cameraController.yaw, 0, 'YXZ');
        const forward = new THREE.Vector3(0, 0, -1).applyEuler(yawEuler);
        const right = new THREE.Vector3(1, 0, 0).applyEuler(yawEuler);
        
            // Reset acceleration
        this.acceleration.set(0,0,0);
        
        let inputMagnitude = 0;

        if (!this.isDodging) {
            // Horizontal/Forward thrust
            if (inputManager.keys.w) {
                this.acceleration.add(forward.clone().multiplyScalar(this.thrust));
                inputMagnitude++;
            }
            if (inputManager.keys.s) {
                this.acceleration.add(forward.clone().multiplyScalar(-this.thrust));
                inputMagnitude++;
            }
            if (inputManager.keys.a) {
                this.acceleration.add(right.clone().multiplyScalar(-this.thrust));
                inputMagnitude++;
            }
            if (inputManager.keys.d) {
                this.acceleration.add(right.clone().multiplyScalar(this.thrust));
                inputMagnitude++;
            }
            
            // Vertical thrust
            const upBuffer = new THREE.Vector3(0, 1, 0);
            if (inputManager.keys.shift) {
                this.acceleration.add(upBuffer.clone().multiplyScalar(this.thrust));
                inputMagnitude++;
            }
            if (inputManager.keys.control) {
                this.acceleration.add(upBuffer.clone().multiplyScalar(-this.thrust));
                inputMagnitude++;
            }
            
            // Normalize acceleration if diagonal
            if (inputMagnitude > 0) {
                this.acceleration.normalize().multiplyScalar(this.thrust);
            }

            // Check dodge
            if (inputManager.keys.space && this.dodgeCooldown <= 0) {
                this.isDodging = true;
                this.dodgeTimer = this.dodgeDuration;
                this.dodgeCooldown = 2.0; // 2 seconds between dodges
                
                // Dash in the direction of current input, or forward if None
                if (inputMagnitude === 0) {
                    this.velocity.copy(forward.clone().multiplyScalar(this.dodgeSpeed));
                } else {
                    const dashDir = this.acceleration.clone().normalize();
                    this.velocity.copy(dashDir.multiplyScalar(this.dodgeSpeed));
                }
            }
        } else {
            // Processing Dodge
            this.dodgeTimer -= deltaTime;
            if (this.dodgeTimer <= 0) {
                this.isDodging = false;
                // Cap speed immediately after dodge
                if (this.velocity.length() > this.maxSpeed) {
                    this.velocity.normalize().multiplyScalar(this.maxSpeed);
                }
            }
        }

        // Apply physics
        if (!this.isDodging) {
            this.velocity.add(this.acceleration.clone().multiplyScalar(deltaTime));
            
            // Apply friction
            this.velocity.multiplyScalar(this.friction);
            
            // Limit max speed
            if (this.velocity.length() > this.maxSpeed) {
                this.velocity.normalize().multiplyScalar(this.maxSpeed);
            }
        }

        this.mesh.position.add(this.velocity.clone().multiplyScalar(deltaTime));
        
        // Set Ship Rotation to match camera (with optional pitch banking)
        // For a true 3rd person feel, the ship should point where the camera aims
        const fullRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(cameraController.pitch, cameraController.yaw, 0, 'YXZ'));
        this.mesh.quaternion.slerp(fullRotation, 0.2); // Smoothly match the camera look direction
        
        // Banking effect based on A/D keys
        if (inputManager.keys.a) {
            this.mesh.rotateZ(Math.PI / 8); 
        } else if (inputManager.keys.d) {
            this.mesh.rotateZ(-Math.PI / 8);
        }

        // Shooting
        if (inputManager.isShooting && this.fireCooldown <= 0) {
            this.shoot(fullRotation);
        }
    }
    
    shoot(directionQuat) {
        if (!this.bulletPool) return;
        
        this.fireCooldown = this.fireRate;
        
        // Determine exact spawn points (e.g. from the wings)
        // For simplicity, spawn one from the center front
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(directionQuat);
        const spawnPos = this.mesh.position.clone().add(forward.clone().multiplyScalar(4)); 
        
        const bullet = this.bulletPool.get();
        bullet.spawn(spawnPos, directionQuat, true, this.velocity.length());
    }

    takeDamage(amount) {
        this.game.updateHealth(this.game.playerHP - amount);
    }
}
