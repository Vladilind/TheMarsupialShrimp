class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 32; // from sprite baseWidth * pixelSize, effectively
        this.height = 24; // from sprite baseHeight * pixelSize, effectively
        this.color1 = '#FF7F50'; // Main body color
        this.color2 = '#FF6347'; // Accent color
        this.speed = 4;
        this.dx = 0; // For movement calculation
        this.dy = 0; // For movement calculation
        this.pixelSize = 4; // For drawing the sprite
        this.health = 3;
        this.maxHealth = 3;
        this.invulnerableTimer = 0; // Frames remaining for invulnerability
        this.invulnerabilityDuration = 120; // Duration in frames (e.g., 2 seconds at 60fps)

        // Sprite definition for the player
        this.spriteBlocks = [
            [2, 1, 4, 3, this.color1], [1, 2, 1, 2, this.color1],
            [6, 2, 1, 2, this.color1], [3, 4, 2, 1, this.color2],
            [2, 5, 1, 1, this.color2], [5, 5, 1, 1, this.color2],
            [3, 0, 1, 1, 'white'], [4, 0, 1, 1, 'black'],
            [5, 0, 1, 1, 'white'], [6, 0, 1, 1, 'black']
        ];
    }

    takeDamage(amount, audioMgr, setGameOverCallback) {
        if (this.invulnerableTimer > 0) return false; // Don't take damage if already invulnerable

        this.health -= amount;
        // Note: sfxPlayerHurt is played below only if not defeated.
        // Consider if it should always play on hit, or if defeat has a different sound.

        if (this.health <= 0) {
            this.health = 0;
            setGameOverCallback(); // Call the callback to set gameOver in main.js
            // audioMgr.playSound('sfxPlayerDefeat'); // Optional: distinct defeat sound
            console.log("Player defeated (reported by Player.takeDamage).");
            return true; // Signal that player is defeated
        } else {
            this.invulnerableTimer = this.invulnerabilityDuration;
            audioMgr.playSound('sfxPlayerHurt'); // Play sound if damaged but not defeated
            return false; // Player took damage but not defeated
        }
    }

    updateInvulnerability() {
        if (this.invulnerableTimer > 0) {
            this.invulnerableTimer--;
        }
    }

    drawHealth(ctx) { // Requires ctx from main.js, CANVAS_WIDTH from config.js
        const heartSize = 20;
        const heartPadding = 5;
        const startX = CANVAS_WIDTH - (this.maxHealth * (heartSize + heartPadding)) + heartPadding - 10;

        for (let i = 0; i < this.maxHealth; i++) {
            let heartColor = (i < this.health) ? 'red' : 'lightgray';
            if (this.invulnerableTimer > 0 && (this.invulnerableTimer % 30 < 15)) {
                if (i < this.health) heartColor = 'pink';
            }
            ctx.fillStyle = heartColor;
            ctx.fillRect(startX + i * (heartSize + heartPadding), 15, heartSize * 0.8, heartSize * 0.8);
        }
    }

    draw(ctx) { // Requires ctx from main.js
        const pSize = this.pixelSize;
        this.spriteBlocks.forEach(blockData => {
            let blockColorProperty = blockData[4];
            let actualColor;

            if (blockColorProperty === this.color1) actualColor = this.color1;
            else if (blockColorProperty === this.color2) actualColor = this.color2;
            else actualColor = blockColorProperty; // Direct color string

            if (this.invulnerableTimer > 0 && (this.invulnerableTimer % 30 < 15)) {
                if (blockColorProperty === this.color1 || blockColorProperty === this.color2) {
                    actualColor = 'white';
                } else if (blockColorProperty === 'black') {
                    actualColor = 'grey';
                }
            }
            ctx.fillStyle = actualColor;
            ctx.fillRect(this.x + blockData[0] * pSize, this.y + blockData[1] * pSize, blockData[2] * pSize, blockData[3] * pSize);
        });
    }

    updateMovement(keysPressedObj, currentGameState) { // Pass keysPressed and necessary game state like zoneCleared
        // currentGameState could be an object { gameOver, zoneCleared, CANVAS_WIDTH, CANVAS_HEIGHT }
        // For now, assumes CANVAS_WIDTH/HEIGHT are global from config.js for boundary checks.
        // Assumes keysPressedObj is the global keysPressed object.

        if (currentGameState.gameOver) return;

        this.updateInvulnerability();

        // Example debug key for taking damage - can be handled in main.js if preferred
        // if (keysPressedObj.KeyH) {
        //     this.takeDamage(1, audioManager, () => { /* set gameOver in main */});
        //     keysPressedObj.KeyH = false;
        // }

        this.dx = 0;
        this.dy = 0;

        if (keysPressedObj.ArrowLeft) this.dx = -this.speed;
        if (keysPressedObj.ArrowRight) this.dx = this.speed;
        if (keysPressedObj.ArrowUp) this.dy = -this.speed;
        if (keysPressedObj.ArrowDown) this.dy = this.speed;

        this.x += this.dx;
        this.y += this.dy;

        // Boundary checks for player position
        if (this.y < 0) this.y = 0;
        if (this.y + this.height > CANVAS_HEIGHT) this.y = CANVAS_HEIGHT - this.height;

        // Zone transition logic is removed from here and will be handled in main.js
        // Clamping x position will also be handled by main.js based on zoneCleared status
        if (!currentGameState.zoneCleared) { // If zone is not cleared, clamp player to screen edges
            if (this.x < 0) this.x = 0;
            if (this.x + this.width > CANVAS_WIDTH) this.x = CANVAS_WIDTH - this.width;
        }
        // If zone IS cleared, main.js will handle logic for allowing player to exit screen edges for transition
    }

    resetState(initialX, initialY, initialHealth) {
        this.x = initialX;
        this.y = initialY;
        this.health = initialHealth || this.maxHealth;
        this.invulnerableTimer = 0;
        this.dx = 0;
        this.dy = 0;
    }
}

// keysPressed object remains global within this module's scope, or could be part of a GameInput class.
const keysPressed = {
    ArrowLeft: false, ArrowRight: false, ArrowUp: false, ArrowDown: false,
    Enter: false, KeyH: false
};

function initializeInputListeners(audioMgr) { // Pass audioManager
    document.addEventListener('keydown', async e => {
        if (!audioMgr.audioInitialized) {
            await audioMgr.initAudio();
        }
        if (keysPressed.hasOwnProperty(e.code)) {
            e.preventDefault(); keysPressed[e.code] = true;
        } else if (keysPressed.hasOwnProperty(e.key)) {
            e.preventDefault(); keysPressed[e.key] = true;
        }
    });

    document.addEventListener('keyup', e => {
        if (keysPressed.hasOwnProperty(e.code)) keysPressed[e.code] = false;
        else if (keysPressed.hasOwnProperty(e.key)) keysPressed[e.key] = false;
    });
    console.log("Input listeners initialized.");
}

// Instantiate the player - this instance will be used by main.js
// This makes player a singleton accessible via playerInstance.
// Alternatively, main.js could import the class and instantiate it there.
// For this refactor, let's export the instance as it's simpler for now.
// const playerInstance = new Player(50, CANVAS_HEIGHT / 2 - 12); // CANVAS_HEIGHT needs to be defined or passed
// Initial position will be set in main.js during startGameAndRunLoop

// It's better to let main.js create the instance because CANVAS_HEIGHT might not be loaded yet.
// So, this file will export the Player class and input handling utilities.
// No instance is created here.
// Global player functions are now methods of the Player class.
// Global variables like `player` (the object) are removed.
// `gameOver` and `zoneCleared` will be managed in `main.js`.
// `audioManager` will be passed where needed.
// `CANVAS_WIDTH` and `CANVAS_HEIGHT` are assumed to be accessible from `config.js`.

// Functions to be exported or used by main.js:
// - Player class
// - keysPressed object
// - initializeInputListeners function
// The old global functions drawPlayer, updatePlayer, playerTakeDamage, etc., are now methods.
// drawPlayerHealth is now player.drawHealth(ctx).
// updatePlayerInvulnerability is now player.updateInvulnerability().
// The old global `player` object is now replaced by an instance of the `Player` class created in `main.js`.
