import * as THREE from 'three';
import { clamp } from './utils.js';

export class CameraFollow {
    constructor(camera, target) {
        this.camera = camera;
        this.target = target; // The player mesh

        // Camera offset relative to the ship (3rd person)
        // Positioned behind and slightly above
        this.idealOffset = new THREE.Vector3(0, 3, 10);
        this.currentOffset = new THREE.Vector3().copy(this.idealOffset);
        
        // Smoothing factors
        this.positionDamping = 0.05; // Lower is smoother but more delayed
        this.rotationDamping = 0.05; // Lower is extremely smooth jitter-free rotation

        // Pitch/Yaw accumulated from mouse
        this.yaw = 0;
        this.pitch = 0;
        
        // Limits
        this.minPitch = -Math.PI / 4;
        this.maxPitch = Math.PI / 3;
        
        // Sensitivity
        this.mouseSensitivity = 0.002;
    }

    updateMouseLook(movementX, movementY) {
        // Apply sensitivity
        this.yaw -= movementX * this.mouseSensitivity;
        this.pitch -= movementY * this.mouseSensitivity;
        
        // Clamp pitch so we can't look fully upside down
        this.pitch = clamp(this.pitch, this.minPitch, this.maxPitch);
    }

    update(deltaTime) {
        if (!this.target) return;

        // Calculate the target's rotation based on yaw/pitch (The ship aims where the camera looks)
        // 1. Calculate ideal camera position
        // Build a rotation matrix purely from yaw and pitch
        const euler = new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ');
        const cameraRotation = new THREE.Quaternion().setFromEuler(euler);
        
        // Offset is rotated by the camera rotation, then added to the target position
        const rotatedOffset = this.idealOffset.clone().applyQuaternion(cameraRotation);
        const idealPosition = this.target.position.clone().add(rotatedOffset);
        
        // 2. Smoothly interpolate position using frame-rate independent lerp
        // Math.pow with a small epsilon avoids jitter
        const posLerpFactor = 1.0 - Math.pow(this.positionDamping, deltaTime * 60);
        this.camera.position.lerp(idealPosition, posLerpFactor);
        
        // 3. Smoothly interpolate rotation using spherical linear interpolation
        const rotLerpFactor = 1.0 - Math.pow(this.rotationDamping, deltaTime * 60);
        this.camera.quaternion.slerp(cameraRotation, rotLerpFactor);
    }
}
