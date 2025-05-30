// --- ENEMY_TYPES Definition (Configuration source for classes) ---
const ENEMY_TYPES = {
    chasingFish: {
        baseWidth: 7, baseHeight: 5, color: 'teal', speed: 1.5, damage: 1, health: 1,
        sprite: [
            {x:0,y:1,w:6,h:3,c:'teal'}, {x:6,y:0,w:1,h:5,c:'darkcyan'},
            {x:1,y:0,w:1,h:1,c:'white'}, {x:1.25,y:0.25,w:0.5,h:0.5,c:'black'}
        ],
        pixelSize: 3, verticalAlignThreshold: 50
    },
    stealthyOctopus: {
        baseWidth: 6, baseHeight: 6, color: '#8A2BE2', speed: 1, dashSpeed: 5, damage: 1, health: 2,
        detectionRadius: 150, revealDuration: 30, dashDuration: 20, cooldownDuration: 180,
        spriteHiding: [
            {x:0,y:2,w:6,h:4,c:'#4B0082'}, {x:1,y:1,w:1,h:1,c:'#2F4F4F'}, {x:4,y:1,w:1,h:1,c:'#2F4F4F'}
        ],
        spriteRevealed: [
            {x:0,y:2,w:6,h:4,c:'#8A2BE2'}, {x:1,y:0,w:1,h:2,c:'white'}, {x:4,y:0,w:1,h:2,c:'white'},
            {x:1.25,y:0.5,w:0.5,h:1,c:'black'}, {x:4.25,y:0.5,w:0.5,h:1,c:'black'}
        ],
        pixelSize: 4
    },
    grasailSeal: {
        baseWidth: 12, baseHeight: 8, color: '#A9A9A9', patrolSpeed: 0.8, chargeSpeed: 6, damage: 2, health: 5,
        detectionRange: 200, detectionHeight: 40, telegraphDuration: 45, chargeDuration: 30, cooldownDuration: 120,
        spritePatrol: [
            {x:0,y:2,w:12,h:4,c:'#808080'}, {x:1,y:1,w:10,h:6,c:'#A9A9A9'},
            {x:10,y:3,w:2,h:2,c:'#696969'}, {x:1,y:0,w:2,h:1,c:'black'},
        ],
        spriteTelegraph: [
            {x:0,y:1,w:12,h:5,c:'#778899'}, {x:1,y:0,w:10,h:7,c:'#B0C4DE'},
            {x:10,y:2,w:2,h:3,c:'#696969'}, {x:0,y:2,w:3,h:1,c:'white'}, {x:1,y:0,w:2,h:2,c:'red'},
        ],
        spriteCharge: [
            {x:0,y:2,w:12,h:3,c:'#696969'}, {x:1,y:1,w:10,h:4,c:'#A9A9A9'},
            {x:11,y:2,w:2,h:2,c:'#696969'}, {x:1,y:0,w:2,h:1,c:'yellow'},
        ],
        pixelSize: 5
    }
};

// --- Base Enemy Class ---
class Enemy {
    constructor(config, x, y) {
        this.type = config.type;
        this.baseWidth = config.baseWidth;
        this.baseHeight = config.baseHeight;
        this.pixelSize = config.pixelSize;
        this.width = this.baseWidth * this.pixelSize;
        this.height = this.baseHeight * this.pixelSize;
        this.x = x;
        this.y = y;
        this.dx = 0;
        this.dy = 0;
        this.damage = config.damage;
        this.currentHealth = config.health; // Max health from config
        this.maxHealth = config.health;
        this.color = config.color; // Fallback color
        this.aiState = 'patrol'; // Default state
        this.aiTimer = 0;
        this.facingRight = Math.random() < 0.5;
        this.isMarkedForRemoval = false;
    }

    // Abstract methods - to be implemented by subclasses
    getSprite() { throw new Error("getSprite() not implemented"); }
    updateAI(player, audioMgr) { throw new Error("updateAI() not implemented"); }

    draw(ctx) {
        const pSize = this.pixelSize;
        const spriteToUse = this.getSprite();

        if (!spriteToUse) {
            ctx.fillStyle = this.color || 'magenta';
            ctx.fillRect(this.x, this.y, this.width, this.height);
            return;
        }

        spriteToUse.forEach(block => {
            ctx.fillStyle = block.c;
            let drawX = this.x + block.x * pSize;
            if (this.canChangeFacing && !this.facingRight) { // canChangeFacing property to be set by subclasses
                 drawX = this.x + (this.baseWidth * pSize) - ((block.x + block.w) * pSize);
            }
            ctx.fillRect(drawX, this.y + block.y * pSize, block.w * pSize, block.h * pSize);
        });
    }

    takeDamage(amount, audioMgr) {
        this.currentHealth -= amount;
        if (this.currentHealth <= 0) {
            this.isMarkedForRemoval = true;
            audioMgr.playSound('sfxEnemyDestroy');
        } else {
            audioMgr.playSound('sfxEnemyHit');
        }
    }

    // Common update logic (movement, boundary checks)
    update(player, audioMgr) {
        this.updateAI(player, audioMgr); // Call subclass-specific AI

        this.x += this.dx;
        this.y += this.dy;

        // Basic boundary clamping (can be overridden by specific AI if needed)
        if (this.aiState !== 'dashing') { // Dashing enemies might handle their own boundaries
            if (this.x <= 0 || this.x + this.width >= CANVAS_WIDTH) {
                if (this.canChangeFacing) { // e.g. ChasingFish, Seal
                    this.dx *= -1;
                    this.facingRight = !this.facingRight;
                    this.x = Math.max(0, Math.min(this.x, CANVAS_WIDTH - this.width));
                } else { // For enemies that don't turn at walls but might be pushed
                    this.x = Math.max(0, Math.min(this.x, CANVAS_WIDTH - this.width));
                }
            }
            // Vertical clamping for non-dashing states if needed
            // this.y = Math.max(0, Math.min(this.y, CANVAS_HEIGHT - this.height));
        }
    }
}

// --- Specific Enemy Classes ---
class ChasingFish extends Enemy {
    constructor(x, y) {
        const config = ENEMY_TYPES.chasingFish;
        super({ ...config, type: 'chasingFish' }, x, y); // Pass type explicitly
        this.speed = config.speed;
        this.sprite = config.sprite;
        this.verticalAlignThreshold = config.verticalAlignThreshold;
        this.dx = this.speed * (this.facingRight ? 1 : -1);
        this.canChangeFacing = true;
    }

    getSprite() { return this.sprite; }

    updateAI(player, audioMgr) {
        if (Math.abs(player.y + player.height / 2 - (this.y + this.height / 2)) < this.verticalAlignThreshold) {
            if (player.x < this.x) this.dx = -this.speed;
            else this.dx = this.speed;
            this.facingRight = player.x > this.x;
        } else {
            this.dx = Math.sign(this.dx) * this.speed; // Maintain current direction
        }
    }
}

class StealthyOctopus extends Enemy {
    constructor(x, y) {
        const config = ENEMY_TYPES.stealthyOctopus;
        super({ ...config, type: 'stealthyOctopus' }, x, y);
        this.detectionRadius = config.detectionRadius;
        this.revealDuration = config.revealDuration;
        this.dashDuration = config.dashDuration;
        this.cooldownDuration = config.cooldownDuration;
        this.dashSpeed = config.dashSpeed;
        this.spriteHiding = config.spriteHiding;
        this.spriteRevealed = config.spriteRevealed;
        this.aiState = 'hiding'; // Initial state for octopus
        this.canChangeFacing = false; // Octopus doesn't flip sprite based on dx
    }

    getSprite() {
        return (this.aiState === 'hiding' || this.aiState === 'cooldown') ? this.spriteHiding : this.spriteRevealed;
    }

    updateAI(player, audioMgr) {
        this.aiTimer--;
        const distanceToPlayer = Math.sqrt(Math.pow(player.x - this.x, 2) + Math.pow(player.y - this.y, 2));

        if (this.aiState === 'hiding') {
            if (distanceToPlayer < this.detectionRadius) {
                this.aiState = 'revealing'; this.aiTimer = this.revealDuration;
            }
        } else if (this.aiState === 'revealing') {
            if (this.aiTimer <= 0) {
                this.aiState = 'dashing'; this.aiTimer = this.dashDuration;
                const angle = Math.atan2((player.y + player.height / 2) - (this.y + this.height / 2), (player.x + player.width/2) - (this.x + this.width / 2));
                this.dx = Math.cos(angle) * this.dashSpeed;
                this.dy = Math.sin(angle) * this.dashSpeed;
            }
        } else if (this.aiState === 'dashing') {
            // Movement is handled by base update. Check for end of dash:
            if (this.aiTimer <= 0 || this.x <= 0 || this.x + this.width >= CANVAS_WIDTH || this.y <= 0 || this.y + this.height >= CANVAS_HEIGHT) {
                this.aiState = 'cooldown'; this.aiTimer = this.cooldownDuration;
                this.dx = 0; this.dy = 0;
                this.x = Math.max(0, Math.min(this.x, CANVAS_WIDTH - this.width));
                this.y = Math.max(0, Math.min(this.y, CANVAS_HEIGHT - this.height));
            }
        } else if (this.aiState === 'cooldown') {
            if (this.aiTimer <= 0) { this.aiState = 'hiding'; }
        }
    }
}

class GrasailSeal extends Enemy {
    constructor(x, y) {
        const config = ENEMY_TYPES.grasailSeal;
        super({ ...config, type: 'grasailSeal' }, x, y);
        this.patrolSpeed = config.patrolSpeed;
        this.chargeSpeed = config.chargeSpeed;
        this.detectionRange = config.detectionRange;
        this.detectionHeight = config.detectionHeight;
        this.telegraphDuration = config.telegraphDuration;
        this.chargeDuration = config.chargeDuration;
        this.cooldownDuration = config.cooldownDuration;
        this.spritePatrol = config.spritePatrol;
        this.spriteTelegraph = config.spriteTelegraph;
        this.spriteCharge = config.spriteCharge;
        this.dx = this.patrolSpeed * (this.facingRight ? 1 : -1);
        this.canChangeFacing = true;
    }

    getSprite() {
        if (this.aiState === 'telegraph') return this.spriteTelegraph;
        if (this.aiState === 'dashing') return this.spriteCharge;
        return this.spritePatrol; // Covers patrol and cooldown
    }

    updateAI(player, audioMgr) {
        this.aiTimer--;
        if (this.aiState === 'patrol') {
            // Base class handles movement and wall collision. Detection logic:
            const detectionYMin = this.y + this.height / 2 - this.detectionHeight / 2;
            const detectionYMax = this.y + this.height / 2 + this.detectionHeight / 2;
            const playerCenterY = player.y + player.height / 2;

            if (playerCenterY > detectionYMin && playerCenterY < detectionYMax) {
                if (this.facingRight && player.x > this.x && player.x < this.x + this.detectionRange) {
                    this.aiState = 'telegraph'; this.aiTimer = this.telegraphDuration; this.dx = 0;
                } else if (!this.facingRight && player.x < this.x && player.x > this.x - this.detectionRange) {
                    this.aiState = 'telegraph'; this.aiTimer = this.telegraphDuration; this.dx = 0;
                }
            }
        } else if (this.aiState === 'telegraph') {
            if (this.aiTimer <= 0) {
                this.aiState = 'dashing'; this.aiTimer = this.chargeDuration;
                this.dx = (this.facingRight ? 1 : -1) * this.chargeSpeed;
                // audioMgr.playSound('sfxSealCharge');
            }
        } else if (this.aiState === 'dashing') {
             if (this.aiTimer <= 0 || this.x <= -this.width || this.x >= CANVAS_WIDTH) {
                this.aiState = 'cooldown'; this.aiTimer = this.cooldownDuration;
                this.dx = 0;
                this.x = Math.max(0, Math.min(this.x, CANVAS_WIDTH - this.width));
            }
        } else if (this.aiState === 'cooldown') {
            if (this.aiTimer <= 0) {
                this.aiState = 'patrol';
                this.facingRight = Math.random() < 0.5;
                this.dx = this.patrolSpeed * (this.facingRight ? 1 : -1);
            }
        }
    }
}

// --- Global enemies array and service functions ---
let enemies = []; // Holds instances of enemy classes

const enemyClassMap = {
    chasingFish: ChasingFish,
    stealthyOctopus: StealthyOctopus,
    grasailSeal: GrasailSeal
};

function spawnEnemy(enemyConfig) { // enemyConfig from zone: { type: 'name', ... }
    const EnemyClass = enemyClassMap[enemyConfig.type];
    if (!EnemyClass) {
        console.error("Unknown enemy type in spawnEnemy:", enemyConfig.type);
        return;
    }
    // Random initial position
    const initialX = Math.random() * (CANVAS_WIDTH - (ENEMY_TYPES[enemyConfig.type].baseWidth * ENEMY_TYPES[enemyConfig.type].pixelSize));
    const initialY = Math.random() * (CANVAS_HEIGHT - (ENEMY_TYPES[enemyConfig.type].baseHeight * ENEMY_TYPES[enemyConfig.type].pixelSize) - 60) + 30;

    enemies.push(new EnemyClass(initialX, initialY));
}

function drawEnemies(ctx) {
    enemies.forEach(enemy => enemy.draw(ctx));
}

function updateEnemies(playerRef, checkCollisionFn, audioMgr, mainGameOverFn) {
    // `gameOver` (global) is checked in main.js before calling this.
    // `playerRef` is the instance of the Player class.
    // `checkCollisionFn` is the utility from main.js.
    // `audioMgr` is the audioManager instance.
    // `mainGameOverFn` is a callback to set `gameOver = true` in main.js.

    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        enemy.update(playerRef, audioMgr); // Calls enemy's own AI and movement logic

        if (checkCollisionFn(playerRef, enemy)) {
            // Player takes damage. playerRef.takeDamage calls setGameOverCallback if health <= 0.
            playerRef.takeDamage(enemy.damage, audioMgr, mainGameOverFn);

            // Enemy takes damage
            // Assuming enemy takes 1 damage from collision as a simple example of recoil/mutual damage.
            // This could be enemy.type.recoilDamage or similar if defined.
            enemy.takeDamage(1, audioMgr);
        }

        if (enemy.isMarkedForRemoval) {
            enemies.splice(i, 1);
        }
    }
}
