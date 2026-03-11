import * as THREE from 'three';
import { randomRadialPoint } from './utils.js';
import { Game } from './Game.js';
import { InputManager } from './InputManager.js';
import { CameraFollow } from './CameraFollow.js';
import { Player } from './Player.js';
import { Pool } from './Pool.js';
import { Bullet } from './Bullet.js';
import { Enemy } from './Enemy.js';
import { Environment } from './Environment.js';

let scene, camera, renderer;
let game, inputManager, cameraFollow, player, environment;
let bulletPool, enemyPool;
let lastTime = 0;
let waveTimer = 0; // Delay between waves

function init() {
    // 1. Initialize Scene
    const gameContainer = document.getElementById('game-container');
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x02050e); // Deep space blue/black
    // In next steps we'll add a starry skybox

    // 2. Initialize Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
    // Position doesn't matter much yet, CameraFollow will handle it

    // 3. Initialize Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(renderer.domElement); // Appended behind UI thanks to absolute positioning

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5); // Soft white light
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(100, 200, 50);
    scene.add(directionalLight);
    
    const bluePointLight = new THREE.PointLight(0x00f0ff, 2, 100);
    bluePointLight.position.set(-50, 0, -50);
    scene.add(bluePointLight);

    const pinkPointLight = new THREE.PointLight(0xff0055, 2, 100);
    pinkPointLight.position.set(50, 0, 50);
    scene.add(pinkPointLight);

    // 5. Game Managers
    game = new Game();
    inputManager = new InputManager(game);
    player = new Player(scene, game);
    cameraFollow = new CameraFollow(camera, player.mesh);

    // Initialize Pools
    bulletPool = new Pool(() => new Bullet(scene), 100);
    enemyPool = new Pool(() => new Enemy(scene), 50);

    // Give player access to bullet pool
    player.bulletPool = bulletPool;

    environment = new Environment(scene);
    const gridHelper = new THREE.GridHelper(500, 50, 0x00f0ff, 0x444444);
    gridHelper.position.y = -20;
    scene.add(gridHelper);

    // 6. Event Listeners
    window.addEventListener('resize', onWindowResize, false);
    
    // Pointer lock mouse input forwarding
    document.addEventListener('mousemove', (e) => {
        if (game.isPointerLocked) {
            cameraFollow.updateMouseLook(
                e.movementX || e.mozMovementX || e.webkitMovementX || 0,
                e.movementY || e.mozMovementY || e.webkitMovementY || 0
            );
        }
    });

    // Start Loop
    requestAnimationFrame(animate);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate(time) {
    requestAnimationFrame(animate);

    // Convert time to seconds
    time *= 0.001; 
    const deltaTime = time - lastTime;
    lastTime = time;

    // Cap deltaTime to prevent huge jumps on tab switch
    const cappedDelta = Math.min(deltaTime, 0.1);

    // Update game logic if playing
    if (game.state === 'PLAYING') {
        player.update(cappedDelta, inputManager, cameraFollow);
        cameraFollow.update(cappedDelta);
        environment.update(cappedDelta);
        
        // Update Combat Entities
        bulletPool.update(cappedDelta, player, enemyPool);
        
        // Update Enemies, manually handling loop so we can pass things cleanly, 
        // Note: Pool.update signature in our Pool class passes args down to item.update
        // item.update(deltaTime, player, bulletPool, game)
        for (let i = enemyPool.active.length - 1; i >= 0; i--) {
            const enemy = enemyPool.active[i];
            const isAlive = enemy.update(cappedDelta, player, bulletPool, game);
            
            // Check manual destruction criteria returned
            if (enemy.hp <= 0) {
                enemy.onDeath(game); 
                enemyPool.release(enemy);
            } else if (!isAlive) {
                enemyPool.release(enemy);
            }
        }

        // Wave Management
        manageWaves(cappedDelta);
    }

    inputManager.resetMouseMovement();

    // Render scene
    renderer.render(scene, camera);
}

// Start everything when DOM is ready
window.onload = init;

function manageWaves(deltaTime) {
    // If no active enemies, start a timer for the next wave
    if (enemyPool.active.length === 0) {
        waveTimer -= deltaTime;
        
        // Setup initial wave or transition
        if (waveTimer <= 0) {
            if (game.score > 0 || game.wave > 1) { // Don't advance on very first load until they kill wave 1
                game.nextWave();
            }
            spawnWave(game.wave);
            waveTimer = 3.0; // 3 seconds between waves
        }
    }
}

function spawnWave(waveNum) {
    const numEnemies = 3 + waveNum * 2; // Increase enemy count per wave
    const hpMultiplier = 1.0 + (waveNum * 0.2); // 20% more hp per wave

    for (let i = 0; i < numEnemies; i++) {
        // Spawn in a wide circle around the player using helper
        const radialPos = randomRadialPoint(player.mesh.position.x, player.mesh.position.z, 50, 100);
        const spy = player.mesh.position.y + (Math.random() - 0.5) * 40; // Random height variation
        
        const spawnPos = new THREE.Vector3(radialPos.x, spy, radialPos.z);
        
        const enemy = enemyPool.get();
        enemy.spawn(spawnPos, hpMultiplier);
    }
}
