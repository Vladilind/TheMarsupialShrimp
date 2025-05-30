// Zones array and related functions
let zones = []; // This will be populated from main.js or gameSetup.js content
let currentZoneIndex = 0;

// BASE_PARALLAX_SCROLL_SPEED is defined in config.js, ensure it's accessible.

// Example Zone Structure from gameSetup.js (to be populated by defineZones in main.js)
/*
zones = [
    { name: "Coral Reef", backgroundColor: '#70c5ce', planktonColor: 'lightgreen', initialPlanktonCount: 3, staticElements: [], parallaxLayers: [], enemyTypes: [{ type: 'chasingFish', count: 1 }], musicTrackName: 'musicReef' },
    { name: "Kelp Forest", backgroundColor: '#2E8B57', planktonColor: '#FFD700', initialPlanktonCount: 2, staticElements: [], parallaxLayers: [], enemyTypes: [{ type: 'stealthyOctopus', count: 1 }], musicTrackName: 'musicKelp' },
    { name: "Open Ocean", backgroundColor: '#4682B4', planktonColor: '#E0FFFF', initialPlanktonCount: 1, staticElements: [], parallaxLayers: [], enemyTypes: [{ type: 'grasailSeal', count: 1 }], musicTrackName: 'musicOcean' }
];
*/

function getCurrentZone() {
    if (zones.length === 0) {
        // console.error("Zones array is empty!"); // This can be noisy if called before zones are defined
        // Return a default or empty zone object to prevent errors if called too early
        return {
            name: "Default Empty Zone",
            backgroundColor: '#cccccc',
            planktonColor: 'grey',
            initialPlanktonCount: 0,
            staticElements: [],
            parallaxLayers: [],
            enemyTypes: [],
            musicTrackName: null
        };
    }
    return zones[currentZoneIndex];
}

function updateParallaxBackgrounds() {
    const zone = getCurrentZone();
    // The version in gameSetup.js uses parallaxLayers with x, speedRatio, color, y, width, height
    if (!zone.parallaxLayers || zone.parallaxLayers.length === 0) return;

    zone.parallaxLayers.forEach(layer => {
        // BASE_PARALLAX_SCROLL_SPEED should be available from config.js
        layer.x -= BASE_PARALLAX_SCROLL_SPEED * layer.speedRatio;
        // Loop the parallax layer
        if (layer.x <= -CANVAS_WIDTH) { // Assuming layers are at least CANVAS_WIDTH
            layer.x += CANVAS_WIDTH; // Reset to the right, effectively creating a loop effect
                                     // This might need adjustment if layers have varying widths that are not CANVAS_WIDTH multiples.
                                     // For simple colored rectangles filling the screen, this is fine.
        }
    });
}

function drawParallaxBackgrounds(ctx) { // Requires ctx from main.js
    const zone = getCurrentZone();
    if (!zone.parallaxLayers || zone.parallaxLayers.length === 0) return;

    zone.parallaxLayers.forEach(layer => {
        ctx.fillStyle = layer.color;
        ctx.fillRect(layer.x, layer.y, layer.width, layer.height);
        // To make seamless looping visible for layers that are CANVAS_WIDTH wide:
        if (layer.x < 0) { // If the layer has started to move off screen to the left
            ctx.fillRect(layer.x + layer.width, layer.y, layer.width, layer.height);
        }
    });
}

function drawZoneStaticElements(ctx) { // Requires ctx from main.js
    const zone = getCurrentZone();
    if (!zone.staticElements || zone.staticElements.length === 0) return;

    zone.staticElements.forEach(element => {
        ctx.fillStyle = element.color;
        ctx.fillRect(element.x, element.y, element.width, element.height);
    });
}

// initEntitiesForZone from gameSetup.js
// Dependencies: planktonItems (collectibleService), enemies (enemyService),
// spawnPlankton (collectibleService), spawnEnemy (enemyService),
// zoneCleared (main.js), audioManager (audio.js)
// These should be passed or managed carefully.
function initEntitiesForZone(currentZone, planktonArr, enemiesArr, spawnPlanktonFn, spawnEnemyFn, audioMgr, zoneStatus) {
    planktonArr.length = 0; // Clear existing plankton
    enemiesArr.length = 0;  // Clear existing enemies

    // const zone = getCurrentZone(); // Use passed currentZone instead
    if (!currentZone || !currentZone.name) {
        console.error("initEntitiesForZone called with invalid zone data");
        return;
    }


    for (let i = 0; i < currentZone.initialPlanktonCount; i++) {
        spawnPlanktonFn(currentZone); // Pass currentZone to spawnPlankton if it needs planktonColor etc.
    }

    if (currentZone.enemyTypes) {
        currentZone.enemyTypes.forEach(enemyConfig => { // enemyConfig is { type: 'name', count: N }
            for (let i = 0; i < enemyConfig.count; i++) {
                spawnEnemyFn(enemyConfig); // spawnEnemy from enemyService.js expects {type: 'name'}
            }
        });
    }

    zoneStatus.cleared = false; // Reset zoneCleared flag (passed as an object {cleared: false})

    // Reset parallax layer positions
    if (currentZone.parallaxLayers) {
        currentZone.parallaxLayers.forEach(layer => layer.x = 0);
    }

    // Play music for the zone
    if (audioMgr && audioMgr.audioInitialized && currentZone.musicTrackName) {
        audioMgr.playSound(currentZone.musicTrackName, true); // Loop music
    } else if (audioMgr && audioMgr.audioInitialized && !currentZone.musicTrackName) {
        audioMgr.stopAllMusic(); // Stop music if zone has no specific track
    }
    console.log("Entities initialized for zone:", currentZone.name);
}
// The initEntitiesForZone function above is the old one and is not used by main.js.
// main.js now has its own initEntitiesForZone. This can be removed.


// The following functions are also not actively used by main.js as the logic
// is handled directly there or is no longer part of the current design.
// function checkZoneCompletion(planktonArr) { ... }
// function advanceToNextZone(playerRef) { ... }
// function loadZoneAssets() { ... }
