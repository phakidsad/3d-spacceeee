import * as THREE from 'three';
import { randomSpherePoint, randomRange } from './utils.js';

export class Environment {
    constructor(scene) {
        this.scene = scene;
        this.asteroids = [];
        this.createStarfield();
        this.createAsteroids(200);
    }

    createStarfield() {
        // Create a particle system for stars
        const starsGeometry = new THREE.BufferGeometry();
        const starsMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 1.5,
            sizeAttenuation: true,
            transparent: true,
            opacity: 0.8
        });

        const numStars = 5000;
        const positions = new Float32Array(numStars * 3);

        for (let i = 0; i < numStars; i++) {
            // Distribute points uniformly on a large sphere
            const r = randomRange(500, 2000);
            const p = randomSpherePoint(r);
            
            positions[i * 3] = p.x;
            positions[i * 3 + 1] = p.y;
            positions[i * 3 + 2] = p.z;
        }

        starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const starField = new THREE.Points(starsGeometry, starsMaterial);
        
        // Let it rotate slowly in the game loop if we want, but it's fine static
        this.scene.add(starField);
    }

    createAsteroids(numAsteroids) {
        // We'll use instanced mesh if possible, but for simplicity and diverse shapes, 
        // we can just use a shared geometry with some random scaling, or a few templates.
        
        const asteroidGeos = [
            new THREE.DodecahedronGeometry(1, 1),
            new THREE.IcosahedronGeometry(1, 0),
            new THREE.TetrahedronGeometry(1, 2)
        ];
        
        const asteroidMat = new THREE.MeshStandardMaterial({
            color: 0x888888,
            roughness: 0.8,
            metalness: 0.2
        });

        for (let i = 0; i < numAsteroids; i++) {
            const geo = asteroidGeos[Math.floor(Math.random() * asteroidGeos.length)];
            const mesh = new THREE.Mesh(geo, asteroidMat);
            
            // Random position in a wide area around center, excluding near origin
            const radius = randomRange(100, 1000);
            const pos = randomSpherePoint(radius);
            mesh.position.set(pos.x, pos.y, pos.z);
            
            // Random Scale
            const scale = randomRange(5, 40);
            mesh.scale.set(
                scale * randomRange(0.8, 1.2),
                scale * randomRange(0.8, 1.2),
                scale * randomRange(0.8, 1.2)
            );
            
            // Random Rotation
            mesh.rotation.set(
                randomRange(0, Math.PI * 2),
                randomRange(0, Math.PI * 2),
                randomRange(0, Math.PI * 2)
            );
            
            this.scene.add(mesh);
            this.asteroids.push({
                mesh: mesh,
                rotSpeedX: randomRange(-0.5, 0.5),
                rotSpeedY: randomRange(-0.5, 0.5),
                rotSpeedZ: randomRange(-0.5, 0.5)
            });
        }
    }

    update(deltaTime) {
        // Slowly rotate asteroids
        for (let a of this.asteroids) {
            a.mesh.rotateX(a.rotSpeedX * deltaTime);
            a.mesh.rotateY(a.rotSpeedY * deltaTime);
            a.mesh.rotateZ(a.rotSpeedZ * deltaTime);
        }
    }
}
