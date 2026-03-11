export class Game {
    constructor() {
        this.state = 'MENU'; // MENU, PLAYING, GAMEOVER
        this.wave = 1;
        this.score = 0;
        this.playerHP = 100;
        this.maxPlayerHP = 100;
        this.isPointerLocked = false;
        
        // UI Elements
        this.uiMainMenu = document.getElementById('main-menu');
        this.uiHUD = document.getElementById('hud');
        this.uiGameOver = document.getElementById('game-over-screen');
        this.uiSettings = document.getElementById('settings-menu');
        this.waveDisplay = document.getElementById('wave-display');
        this.scoreDisplay = document.getElementById('score-display');
        this.healthDisplay = document.getElementById('health-display');
        this.healthBar = document.getElementById('health-bar');
        
        // Buttons
        document.getElementById('btn-play').addEventListener('click', () => this.startGame());
        document.getElementById('btn-settings').addEventListener('click', () => this.showSettings());
        document.getElementById('btn-settings-back').addEventListener('click', () => this.showMenu());
        document.getElementById('btn-exit').addEventListener('click', () => window.close()); // Might not work in browser, but good to have
        document.getElementById('btn-game-over-menu').addEventListener('click', () => window.location.reload());
    }

    setPointerLocked(locked) {
        this.isPointerLocked = locked;
        if (!locked && this.state === 'PLAYING') {
            // Pause or show menu if escaped
            // For now, let's just show cursor, but keep playing or pause?
            // Actually, if we lose pointer lock, we should pause. 
            // We'll handle full pause logic later, for now just track it.
        }
    }

    startGame() {
        if (this.state === 'PLAYING') return;
        this.state = 'PLAYING';
        this.wave = 1;
        this.score = 0;
        this.playerHP = this.maxPlayerHP;
        
        this.updateHUD();
        
        this.uiMainMenu.classList.add('hidden');
        this.uiGameOver.classList.add('hidden');
        this.uiSettings.classList.add('hidden');
        this.uiHUD.classList.remove('hidden');
        
        // Request pointer lock
        document.body.requestPointerLock = document.body.requestPointerLock || document.body.mozRequestPointerLock;
        document.body.requestPointerLock();
    }

    gameOver() {
        this.state = 'GAMEOVER';
        document.exitPointerLock = document.exitPointerLock || document.exitPointerLock;
        document.exitPointerLock();
        
        this.uiHUD.classList.add('hidden');
        this.uiGameOver.classList.remove('hidden');
        document.getElementById('game-over-wave').innerText = this.wave;
    }

    showMenu() {
        this.uiMainMenu.classList.remove('hidden');
        this.uiSettings.classList.add('hidden');
    }

    showSettings() {
        this.uiMainMenu.classList.add('hidden');
        this.uiSettings.classList.remove('hidden');
    }

    updateHealth(newHP) {
        this.playerHP = Math.max(0, newHP);
        const ratio = this.playerHP / this.maxPlayerHP;
        this.healthBar.style.width = `${ratio * 100}%`;
        this.healthDisplay.innerText = this.playerHP;
        
        if (ratio < 0.3) {
            this.healthBar.style.backgroundColor = '#ff0000';
            this.healthBar.style.boxShadow = '0 0 15px #ff0000';
        } else {
            this.healthBar.style.backgroundColor = 'var(--secondary-color)';
            this.healthBar.style.boxShadow = '0 0 15px var(--secondary-color)';
        }
        
        if (this.playerHP <= 0 && this.state === 'PLAYING') {
            this.gameOver();
        }
    }

    addScore(points) {
        this.score += points;
        this.scoreDisplay.innerText = this.score;
    }

    nextWave() {
        this.wave++;
        this.waveDisplay.innerText = this.wave;
        // Optionally give some HP back
        this.updateHealth(Math.min(this.maxPlayerHP, this.playerHP + 20));
    }

    updateHUD() {
        this.waveDisplay.innerText = this.wave;
        this.scoreDisplay.innerText = this.score;
        this.updateHealth(this.playerHP);
    }
}
