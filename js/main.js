// Main game logic file

// Canvas setup (will be initialized in startGameAndRunLoop)
let canvas;
let ctx;

// Player instance (will be created in startGameAndRunLoop)
let playerInstance;

// --- Core game state variables ---
let score = 0;
let gameOver = false; // Master game over flag
let zoneCleared = false; // Flag indicating current zone objectives are met
let gameLoopId = null; // For requestAnimationFrame
let gameHasStarted = false; // To prevent multiple initializations of event listeners or game start logic

// --- Utility Functions ---
// Make checkCollision globally accessible for tests if running in test mode
if (typeof window !== 'undefined' && window.isRunningTests) {
    window.checkCollision = function(rect1, rect2) {
        if (!rect1 || !rect2 || typeof rect1.x === 'undefined' || typeof rect2.x === 'undefined') {
            return false;
        }
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    };
}
// Define it normally for the game
function checkCollision(rect1, rect2) {
    // Ensure rect1 and rect2 are valid objects with x, y, width, height
    if (!rect1 || !rect2 || typeof rect1.x === 'undefined' || typeof rect2.x === 'undefined') {
        // console.warn("Invalid object passed to checkCollision:", rect1, rect2);
        return false;
    }
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

function clearCanvas() {
    const currentZoneData = getCurrentZone();
    ctx.fillStyle = currentZoneData.backgroundColor || '#000000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function defineAllZones() {
    zones.length = 0;
    zones.push({
        name: "Coral Reef", backgroundColor: '#70c5ce', planktonColor: 'lightgreen', initialPlanktonCount: 3,
        staticElements: [],
        parallaxLayers: [
            { x:0, y:0, width:CANVAS_WIDTH, height:CANVAS_HEIGHT, color: 'rgba(0,0,100,0.1)', speedRatio: 0.1 },
            { x:0, y:0, width:CANVAS_WIDTH, height:CANVAS_HEIGHT, color: 'rgba(0,100,100,0.1)', speedRatio: 0.3 },
            { x:0, y:0, width:CANVAS_WIDTH, height:CANVAS_HEIGHT, color: 'rgba(100,100,0,0.1)', speedRatio: 0.6 }
        ],
        enemyTypes: [{ type: 'chasingFish', count: 2 }],
        musicTrackName: 'musicReef'
    });
    zones.push({
        name: "Kelp Forest", backgroundColor: '#2E8B57', planktonColor: '#FFD700', initialPlanktonCount: 2,
        staticElements: [], parallaxLayers: [
            { x:0, y:0, width:CANVAS_WIDTH, height:CANVAS_HEIGHT, color: 'rgba(0,50,0,0.2)', speedRatio: 0.2 },
            { x:0, y:0, width:CANVAS_WIDTH, height:CANVAS_HEIGHT, color: 'rgba(0,70,0,0.2)', speedRatio: 0.5 }
        ],
        enemyTypes: [{ type: 'stealthyOctopus', count: 1 }], musicTrackName: 'musicKelp'
    });
    zones.push({
        name: "Open Ocean", backgroundColor: '#4682B4', planktonColor: '#E0FFFF', initialPlanktonCount: 1,
        staticElements: [], parallaxLayers: [
             { x:0, y:0, width:CANVAS_WIDTH, height:CANVAS_HEIGHT, color: 'rgba(0,0,50,0.3)', speedRatio: 0.15 }
        ],
        enemyTypes: [{ type: 'grasailSeal', count: 1 }], musicTrackName: 'musicOcean'
    });
    currentZoneIndex = 0;
    console.log("Zones defined and pushed to zoneService.zones");
}

// Initialize entities for the current zone
function initEntitiesForZone(currentZ, pItems, ens, spawnP_Fn, spawnE_Fn, audioMgr, zStatus) {
    pItems.length = 0; // Clear plankton items from collectibleService
    ens.length = 0;    // Clear enemies from enemyService

    // Spawn plankton
    if (currentZ && typeof currentZ.initialPlanktonCount === 'number') {
        for (let i = 0; i < currentZ.initialPlanktonCount; i++) {
            spawnP_Fn(currentZ); // spawnP_Fn is (cz) => spawnPlankton(cz) from collectibleService
        }
    }

    // Spawn enemies
    if (currentZ && currentZ.enemyTypes) {
        currentZ.enemyTypes.forEach(enemyConfig => {
            // enemyConfig is { type: 'name', count: N }
            if (typeof enemyConfig.count === 'number') {
                for (let i = 0; i < enemyConfig.count; i++) {
                    spawnE_Fn(enemyConfig); // spawnE_Fn is spawnEnemy from enemyService
                }
            }
        });
    }

    if(zStatus) zStatus.cleared = false; // Reset zoneCleared flag for the new zone

    // Reset parallax layer positions
    if (currentZ && currentZ.parallaxLayers) {
        currentZ.parallaxLayers.forEach(layer => layer.x = 0);
    }

    // Play music for the zone
    if (currentZ && audioMgr && audioMgr.audioInitialized && currentZ.musicTrackName) {
        audioMgr.playSound(currentZ.musicTrackName, true); // Loop music
    } else if (audioMgr && audioMgr.audioInitialized && (!currentZ || !currentZ.musicTrackName)) {
        // Stop music if zone has no specific track or if currentZ is undefined
        audioMgr.stopAllMusic();
    }
    console.log("Entities initialized for zone:", currentZ ? currentZ.name : "undefined zone");
}

function mainGameLoop() {
    if (gameLoopId === null && gameOver) {
        console.log("Game Over. Loop halted.");
        clearCanvas();
        drawParallaxBackgrounds(ctx);
        drawZoneStaticElements(ctx);
        drawPlankton(ctx);
        if (playerInstance) playerInstance.draw(ctx); // Use playerInstance
        drawEnemies(ctx);
        drawScore(ctx, score, getCurrentZone());
        if (playerInstance) playerInstance.drawHealth(ctx); // Use playerInstance
        drawGameMessages(ctx, zoneCleared, gameOver, getCurrentZone().name);
        return;
    }

    clearCanvas();
    updateParallaxBackgrounds();
    drawParallaxBackgrounds(ctx);
    drawZoneStaticElements(ctx);

    const playerOldX = playerInstance ? playerInstance.x : 0; // Store old X for zone transition

    if (!gameOver && playerInstance) {
        // Pass keysPressed from player.js and current game state
        playerInstance.updateMovement(keysPressed, { gameOver, zoneCleared });
    }

    if (!gameOver) {
        // Pass playerInstance to updateEnemies
        // The old updateEnemies expected a function to set gameOver.
        // Now, playerInstance.takeDamage returns true if health <= 0.
        // We'll need to adapt how updateEnemies signals that player took fatal damage.
        // For now, let's assume updateEnemies calls playerInstance.takeDamage internally (needs playerInstance passed).
        updateEnemies(playerInstance, checkCollision, audioManager, () => gameOver = true );
                                                                        // ^ Callback for enemy to directly signal game over
                                                                        // This is if an enemy action itself causes game over, not player health.
                                                                        // Or, updateEnemies can return a status.

        // If player health reached 0 due to enemy action (checked after updateEnemies)
        if (playerInstance && playerInstance.health <= 0 && !gameOver) {
            gameOver = true;
            console.log("Game Over detected from player health in main loop.");
        }

        let scoreRef = { value: score };
        let zoneStatusRef = { cleared: zoneCleared };

        if (!zoneCleared) {
             updateCollectibles(playerInstance, checkCollision, scoreRef, audioManager, zoneStatusRef);
             score = scoreRef.value;
             if (zoneStatusRef.cleared && !zoneCleared) {
                zoneCleared = true;
                console.log("Zone cleared by collecting all plankton!");
             }
        }
    }

    drawPlankton(ctx);
    drawEnemies(ctx);
    if (playerInstance) playerInstance.draw(ctx);
    drawScore(ctx, score, getCurrentZone());
    if (playerInstance) playerInstance.drawHealth(ctx);

    if (!gameOver && zoneCleared && playerInstance) {
        let prevZoneIndex = currentZoneIndex;
        // Zone transition logic based on playerInstance properties
        if (playerInstance.x + playerInstance.width > CANVAS_WIDTH && playerOldX + playerInstance.width <= CANVAS_WIDTH) {
            currentZoneIndex = (currentZoneIndex + 1) % zones.length;
            playerInstance.x = 5;
        } else if (playerInstance.x < 0 && playerOldX >= 0) {
             playerInstance.x = 0;
        }

        if (currentZoneIndex !== prevZoneIndex) {
            console.log(`Transitioning from zone ${prevZoneIndex} to ${currentZoneIndex}`);
            let zoneStatus = { cleared: false }; // Ensure cleared is false for the new zone.
            initEntitiesForZone(getCurrentZone(), planktonItems, enemies,
                                (cz) => spawnPlankton(cz), spawnEnemy,
                                audioManager, zoneStatus);
            zoneCleared = zoneStatus.cleared; // This will now be false.
            // Reset player's vertical position for new zone, or any other zone-specific player setup
            playerInstance.y = CANVAS_HEIGHT / 2 - playerInstance.height / 2;
        }
    }

    drawGameMessages(ctx, zoneCleared, gameOver, getCurrentZone().name);

    if (gameOver) {
        if (gameLoopId) {
            cancelAnimationFrame(gameLoopId);
            gameLoopId = null;
        }
        drawGameMessages(ctx, zoneCleared, gameOver, getCurrentZone().name);
        console.log("Game Over sequence in loop finished.");
        return;
    }

    gameLoopId = requestAnimationFrame(mainGameLoop);
}

async function startGameAndRunLoop() {
    console.log('Attempting to start/restart game...');
    if (gameLoopId && !gameOver) {
        console.log("Game is already running."); return;
    }
    if (gameLoopId && gameOver) {
        console.log("Restarting after game over.");
        cancelAnimationFrame(gameLoopId); gameLoopId = null;
    }

    canvas = document.getElementById('gameCanvas');
    if (!canvas) { console.error("Canvas element not found!"); return; }
    ctx = canvas.getContext('2d');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    ctx.imageSmoothingEnabled = false;

    // Create Player instance here, after CANVAS_HEIGHT is defined
    if (!playerInstance) { // Create only if it doesn't exist (first start)
        playerInstance = new Player(50, CANVAS_HEIGHT / 2 - (24 / 2)); // 24 is player height
    } else { // Reset state for subsequent starts
        playerInstance.resetState(50, CANVAS_HEIGHT / 2 - (playerInstance.height / 2), playerInstance.maxHealth);
    }

    if (!gameHasStarted) {
        initializeInputListeners(audioManager); // Pass audioManager from audio.js
    }

    score = 0;
    gameOver = false;
    zoneCleared = false;
    // Player state reset is now handled by playerInstance.resetState() above.

    for (let key in keysPressed) {
        keysPressed[key] = false;
    }

    if (!audioManager.audioInitialized) {
        await audioManager.initAudio();
    }
    if (audioManager.audioInitialized) {
        await preloadGameAudio();
    } else {
        console.warn("Audio could not be initialized. Game will run without sound.");
    }

    defineAllZones();

    // Initialize entities for the starting zone
    // Pass an object for zoneStatus so initEntitiesForZone can set 'cleared' to false
    let zoneStatusOnStart = { cleared: false }; // Start with cleared as false
    initEntitiesForZone(getCurrentZone(), planktonItems, enemies,
                        (cz) => spawnPlankton(cz), // spawnPlankton from collectibleService
                        spawnEnemy,                // spawnEnemy from enemyService
                        audioManager,
                        zoneStatusOnStart);
    zoneCleared = zoneStatusOnStart.cleared; // Should be false after init

    if (!gameHasStarted && !gameOver) {
         window.addEventListener('keydown', function gameControlKeyListener(e) {
            if (gameOver && (e.key === 'Enter' || e.code === 'Enter')) {
                startGameAndRunLoop();
            }
        });
    }

    gameHasStarted = true;

    if (!gameLoopId) {
        console.log("Starting main game loop now.");
        mainGameLoop();
    }
    console.log("Game state reset and loop started/restarted.");
}

window.addEventListener('load', () => {
    canvas = document.getElementById('gameCanvas');
    if (!canvas) { console.error("Canvas not found on load for initial screen."); return; }
    ctx = canvas.getContext('2d');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    ctx.fillStyle = 'black';
    ctx.fillRect(0,0,CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = 'white';
    ctx.font = '30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Press Enter to Start', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    ctx.textAlign = 'left';

    // Only add the initial start listener if not running tests
    if (typeof window.isRunningTests === 'undefined' || !window.isRunningTests) {
        function initialStartListener(e) {
            if (e.key === 'Enter' || e.code === 'Enter') {
                window.removeEventListener('keydown', initialStartListener);
                startGameAndRunLoop();
            }
        }
        window.addEventListener('keydown', initialStartListener);
    } else {
        console.log("Test mode: Game auto-start disabled.");
        // In test mode, game objects like playerInstance might need to be initialized
        // for some tests, but the game loop shouldn't start automatically.
        // Test setup functions can call parts of startGameAndRunLoop if needed.
    }
});
