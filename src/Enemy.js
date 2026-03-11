import * as THREE from 'three';
import { randomRange } from './utils.js';

export class Enemy {
    constructor(scene) {
        this.scene = scene;
        this.hp = 30;
        this.maxHp = 30;
        this.speed = 20;
        this.collisionRadius = 3.0; // Slightly larger hitbox than visual bounds for fairness
        this.life = 0; // 0 means inactive in pool
        this.scoreValue = 100;
        
        // Flight AI
        this.bobbingPhase = Math.random() * Math.PI * 2;
        this.bobbingSpeed = randomRange(1.0, 3.0);
        this.bobbingAmplitude = randomRange(2.0, 5.0);
        
        // Shooting
        this.fireCooldown = randomRange(1.0, 3.0);
        this.fireRate = 2.0;
        
        // Create Mesh
        this.mesh = this.createMesh();
        this.mesh.visible = false;
        this.scene.add(this.mesh);
        
        this.velocity = new THREE.Vector3();
    }
    
    createMesh() {
        const group = new THREE.Group();
        
        // Body
        const geo = new THREE.OctahedronGeometry(2);
        geo.scale(1.5, 0.5, 2.0); // Flatten and elongate
        const mat = new THREE.MeshStandardMaterial({
            color: 0xff0055,
            metalness: 0.8,
            roughness: 0.3,
            emissive: 0x440011,
            emissiveIntensity: 0.5
        });
        const body = new THREE.Mesh(geo, mat);
        group.add(body);
        
        // Core glow
        const coreGeo = new THREE.SphereGeometry(0.8);
        const coreMat = new THREE.MeshBasicMaterial({ color: 0xffaaaa });
        const core = new THREE.Mesh(coreGeo, coreMat);
        group.add(core);
        
        return group;
    }

    spawn(position, hpMultiplier = 1.0) {
        this.mesh.position.copy(position);
        this.maxHp = 30 * hpMultiplier;
        this.hp = this.maxHp;
        this.speed = 20 + (hpMultiplier * 5); // Faster enemies over time
        this.life = 1; // Mark active
        this.mesh.visible = true;
        this.fireCooldown = randomRange(1.0, 3.0); // Randomize initial shot to prevent waves firing all at once
    }

    update(deltaTime, player, bulletPool, game) {
        if (this.hp <= 0 || this.life <= 0) return false;

        if (!player || game.state !== 'PLAYING') return true;

        // --- AI Movement: Fly towards player with some evasion bobbing ---
        const dirToPlayer = new THREE.Vector3().subVectors(player.mesh.position, this.mesh.position).normalize();
        
        // Bobbing (perpendicular movement)
        this.bobbingPhase += deltaTime * this.bobbingSpeed;
        const bobOffset = Math.sin(this.bobbingPhase) * this.bobbingAmplitude;
        
        // Create a fake perpendicular vector for bobbing
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.mesh.quaternion);
        const bobDir = right.multiplyScalar(bobOffset * deltaTime);

        // Move
        this.velocity.copy(dirToPlayer).multiplyScalar(this.speed);
        this.mesh.position.add(this.velocity.clone().multiplyScalar(deltaTime));
        this.mesh.position.add(bobDir); // Add chaotic bobbing
        
        // Look at player
        // Note: Object3D.lookAt makes the local +Z axis face the target.
        // We might need to adjust rotation if the mesh was built along a different axis.
        // Our mesh is neutral, but we can smooth it.
        const targetQuat = new THREE.Quaternion().setFromRotationMatrix(
            new THREE.Matrix4().lookAt(this.mesh.position, player.mesh.position, new THREE.Vector3(0, 1, 0))
        );
        this.mesh.quaternion.slerp(targetQuat, 0.1);

        // --- AI Shooting ---
        this.fireCooldown -= deltaTime;
        if (this.fireCooldown <= 0) {
            this.shoot(bulletPool, dirToPlayer);
        }

        return true;
    }
    
    shoot(bulletPool, forwardDir) {
        this.fireCooldown = this.fireRate + randomRange(-0.5, 0.5); // Add jitter
        
        // Get bullet from pool
        const bullet = bulletPool.get();
        // Spawn slightly in front
        const spawnPos = this.mesh.position.clone().add(forwardDir.clone().multiplyScalar(3));
        
        bullet.spawn(spawnPos, this.mesh.quaternion, false, this.speed);
    }

    takeDamage(amount) {
        this.hp -= amount;
        
        // Flash white (Implementation inside loop or timeout is tricky without a dedicated renderer pass, 
        // so we just scale it down slightly as a hit reaction)
        this.mesh.scale.set(0.8, 0.8, 0.8);
        setTimeout(() => { if(this.mesh) this.mesh.scale.set(1, 1, 1); }, 100);

        if (this.hp <= 0) {
            this.destroy(); // Dies
        }
    }

    destroy() {
        this.life = 0;
        this.mesh.visible = false;
    }

    onDeath(game) {
        if (game) game.addScore(this.scoreValue);
        // Optional: Spawn explosion particles here
    }
}
