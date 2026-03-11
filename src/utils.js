/**
 * Math and utility helpers
 */

// Linearly interpolate between two values
export function lerp(start, end, amt) {
    return (1 - amt) * start + amt * end;
}

// Spherical linear interpolation between two quaternions (Three.js already has slerp but this is generic)
// For Three.js objects we can use object.quaternion.slerp()

export function randomRange(min, max) {
    return Math.random() * (max - min) + min;
}

export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

// Generate random direction vector for scattering asteroids
export function randomSpherePoint(radius) {
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    
    // Convert spherical coordinates to Cartesian coordinates
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);
    
    
    return { x, y, z };
}

// Generate random circular spawn point around a target
export function randomRadialPoint(centerX, centerZ, minRadius, maxRadius) {
    const angle = Math.random() * Math.PI * 2;
    const radius = minRadius + Math.random() * (maxRadius - minRadius);
    return {
        x: centerX + Math.cos(angle) * radius,
        z: centerZ + Math.sin(angle) * radius
    };
}
