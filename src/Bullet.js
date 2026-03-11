import * as THREE from 'three';

export class Bullet {
    constructor(scene) {
        this.scene = scene;
        this.speed = 400; // Fast moving projectiles
        this.damage = 10;
        this.isPlayerBullet = true;
        this.life = 0;
        this.maxLife = 2.0; // Seconds before self-destructing
        this.collisionRadius = 2.0;

        // Visuals
        const geo = new THREE.CylinderGeometry(0.1, 0.1, 4, 8);
        geo.rotateX(Math.PI / 2);
        
        // We leave material color creation to spawn() to color them differently
        this.material = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
        this.mesh = new THREE.Mesh(geo, this.material);
        this.mesh.visible = false; // Hide initially
        
        this.scene.add(this.mesh);

        this.velocity = new THREE.Vector3();
    }

    spawn(position, rotationQuat, isPlayerBullet, speedOffset = 0) {
        this.isPlayerBullet = isPlayerBullet;
        this.life = this.maxLife;

        // Position & Rotate
        this.mesh.position.copy(position);
        this.mesh.quaternion.copy(rotationQuat);
        
        // Determine Velocity (forward relative to rotation)
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(rotationQuat);
        this.velocity.copy(forward).multiplyScalar(this.speed + Math.max(0, speedOffset));

        // Colors
        if (isPlayerBullet) {
            this.material.color.setHex(0x00f0ff);
            this.damage = 50; // Player does 50 dmg per hit
        } else {
            this.material.color.setHex(0xff0055); // Red enemy bullets
            this.damage = 5; // Enemies do 5 damage per hit
        }

        this.mesh.visible = true;
    }

    update(deltaTime, player, enemyPool) {
        if (this.life <= 0) return false;

        this.life -= deltaTime;
        this.mesh.position.add(this.velocity.clone().multiplyScalar(deltaTime));

        // Collision logic
        if (this.isPlayerBullet) {
            // Check collision with enemies
            if (enemyPool) {
                for (let enemy of enemyPool.active) {
                    if (enemy.hp > 0 && this.mesh.position.distanceTo(enemy.mesh.position) < enemy.collisionRadius + this.collisionRadius) {
                        enemy.takeDamage(this.damage);
                        this.destroy();
                        return false;
                    }
                }
            }
        } else {
            // Check collision with player
            if (player && this.mesh.position.distanceTo(player.mesh.position) < 4.0 + this.collisionRadius) {
                // Approximate player radius is 4.0
                if (!player.isDodging) { // Dodging gives i-frames!
                    player.takeDamage(this.damage);
                    this.destroy(); // Hit!
                    return false;
                }
            }
        }

        return this.life > 0;
    }

    destroy() {
        this.life = 0;
        this.mesh.visible = false;
        // Optionally trigger small particle effect here
    }

    onDeath() {
        this.destroy();
    }
}
