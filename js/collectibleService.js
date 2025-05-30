// Plankton items array and related functions
let planktonItems = []; // Holds all plankton objects

// spawnPlankton from gameSetup.js
// It needs access to the current zone's planktonColor.
// And PLANKTON_SIZE from config.js
function spawnPlankton(currentZone) { // Pass currentZone object
    if (!currentZone) {
        console.error("spawnPlankton: currentZone is undefined.");
        return;
    }
    const p = {
        x: Math.random() * (CANVAS_WIDTH - PLANKTON_SIZE),
        y: Math.random() * (CANVAS_HEIGHT - PLANKTON_SIZE),
        width: PLANKTON_SIZE, // From config.js
        height: PLANKTON_SIZE, // From config.js
        color: currentZone.planktonColor || 'lightgreen', // Fallback color
        // value: 1 // gameSetup.js didn't explicitly have a 'value' for score, score was just incremented
    };
    planktonItems.push(p);
}

// drawPlankton from gameSetup.js
function drawPlankton(ctx) { // Requires ctx from main.js
    planktonItems.forEach(item => {
        ctx.fillStyle = item.color;
        ctx.fillRect(item.x, item.y, item.width, item.height); // gameSetup.js uses fillRect
    });
}

// updateCollectibles from gameSetup.js
// Dependencies: player (player.js), checkCollision (main.js), score (main.js),
// audioManager (audio.js), zoneCleared (main.js)
// These should be passed as parameters.
function updateCollectibles(playerRef, checkCollisionFn, scoreObj, audioMgr, zoneStatusRef) {
    // if (gameOver || zoneCleared) return; // Check these conditions in main.js before calling
    // zoneCleared is a global in gameSetup.js, here it's passed via zoneStatusRef {cleared: bool}

    for (let i = planktonItems.length - 1; i >= 0; i--) {
        if (checkCollisionFn(playerRef, planktonItems[i])) {
            scoreObj.value++; // Modify score in main.js via passed object {value: score}
            planktonItems.splice(i, 1);
            audioMgr.playSound('sfxCollect'); // Assumes sfxCollect is loaded

            if (planktonItems.length === 0) {
                // Signal that the zone might be cleared (all plankton collected)
                // The actual zoneCleared flag in main.js should be set based on this.
                // In gameSetup.js, this directly set the global zoneCleared = true.
                // Here, we'll rely on checkZoneCompletion in zoneService or main.js.
                // For now, let's assume main.js checks planktonItems.length via checkZoneCompletion.
                // This function's responsibility is just to update collectibles and score.
                // However, gameSetup.js did set zoneCleared here. So we might need to signal it.
                if(zoneStatusRef) zoneStatusRef.cleared = true; // Update status passed from main.js
            }
        }
        // Plankton in gameSetup.js do not move on their own, they are static.
        // If they were to move (e.g. with parallax):
        // item.x -= item.speed;
        // if (item.x + item.width < 0) { planktonItems.splice(i, 1); }
    }
}
