export class Pool {
    constructor(createFn, initialSize = 50) {
        this.createFn = createFn; // Function that returns a new object instance (e.g., new Bullet())
        this.active = [];         // Items currently in use
        this.inactive = [];       // Items available for reuse
        
        // Pre-allocate
        for (let i = 0; i < initialSize; i++) {
            this.inactive.push(this.createFn());
        }
    }

    get() {
        let item;
        if (this.inactive.length > 0) {
            item = this.inactive.pop();
        } else {
            // Pool exhausted, create a new one to grow the pool
            item = this.createFn();
        }
        this.active.push(item);
        return item;
    }

    release(item) {
        const index = this.active.indexOf(item);
        if (index > -1) {
            this.active.splice(index, 1);
            this.inactive.push(item);
        }
    }

    // Process logic on all active items
    update(deltaTime, ...args) {
        // Iterate backwards so we can safely remove items (release them) during the iteration
        for (let i = this.active.length - 1; i >= 0; i--) {
            const item = this.active[i];
            const isAlive = item.update(deltaTime, ...args);
            if (!isAlive || item.life <= 0) {
                if (item.onDeath) item.onDeath(); // Optional death hook (e.g., explosions, hiding mesh)
                this.release(item);
            }
        }
    }
}
