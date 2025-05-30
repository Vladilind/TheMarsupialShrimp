// Get the canvas element and its 2D rendering context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Define canvas dimensions
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 400;

canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;
ctx.imageSmoothingEnabled = false;

// Zone Definitions
const zones = [
    {
        name: "Coral Reef", backgroundColor: '#70c5ce', planktonColor: 'lightgreen', initialPlanktonCount: 3,
        staticElements: [ { x: 100, y: CANVAS_HEIGHT - 50, width: 40, height: 50, color: '#FF7F50' } ],
        parallaxLayers: [ { x: 0, y: CANVAS_HEIGHT - 80, width: CANVAS_WIDTH * 2, height: 80, color: 'rgba(0,0,0,0.05)', speedRatio: 0.1 } ],
        enemyTypes: [{ type: 'chasingFish', count: 1 }]
    },
    {
        name: "Kelp Forest", backgroundColor: '#2E8B57', planktonColor: '#FFD700', initialPlanktonCount: 2,
        staticElements: [ { x: 50, y: 0, width: 15, height: CANVAS_HEIGHT - 20, color: '#556B2F' } ],
        parallaxLayers: [ { x: 0, y: 0, width: CANVAS_WIDTH * 2, height: CANVAS_HEIGHT, color: 'rgba(0,50,0,0.1)', speedRatio: 0.1 } ],
        enemyTypes: [{ type: 'chasingFish', count: 2 }]
    },
    {
        name: "Open Ocean", backgroundColor: '#4682B4', planktonColor: '#E0FFFF', initialPlanktonCount: 4,
        staticElements: [ { x: CANVAS_WIDTH/2-50, y:CANVAS_HEIGHT-30,width:100,height:30,color:'#808080'} ],
        parallaxLayers: [ { x: 0, y: 0, width: CANVAS_WIDTH * 2, height: CANVAS_HEIGHT, color: 'rgba(0,0,100,0.05)', speedRatio: 0.05 } ],
        enemyTypes: [{ type: 'chasingFish', count: 1 }]
    }
];
let currentZoneIndex = 0;
const BASE_PARALLAX_SCROLL_SPEED = 0.5;

const player = {
    x: 50, y: CANVAS_HEIGHT / 2 - 12, width: 32, height: 24,
    color1: '#FF7F50', color2: '#FF6347', speed: 4, dx: 0, dy: 0, pixelSize: 4,
    health: 3, maxHealth: 3, invulnerableTimer: 0, invulnerabilityDuration: 120
};

function playerTakeDamage(amount) {
    if (player.invulnerableTimer > 0 || gameOver) return;
    player.health -= amount;
    console.log("Player took damage! Health:", player.health);
    if (player.health <= 0) {
        player.health = 0;
        gameOver = true;
        zoneCleared = false; // Ensure zoneCleared is false on game over
        console.log("Player health reached 0. Game Over.");
    } else {
        player.invulnerableTimer = player.invulnerabilityDuration;
    }
}
function updatePlayerInvulnerability() { if (player.invulnerableTimer > 0) { player.invulnerableTimer--; } }
function drawPlayerHealth() {
    const heartSize = 20; const heartPadding = 5;
    const startX = CANVAS_WIDTH - (player.maxHealth * (heartSize + heartPadding)) + heartPadding - 10;
    for (let i = 0; i < player.maxHealth; i++) {
        let heartColor = (i < player.health) ? 'red' : 'lightgray';
        if (player.invulnerableTimer > 0 && (player.invulnerableTimer % 30 < 15) ) { // Flash rate adjustment
             if (i < player.health) heartColor = 'pink';
        }
        ctx.fillStyle = heartColor;
        ctx.fillRect(startX + i * (heartSize + heartPadding), 15, heartSize*0.8, heartSize*0.8);
    }
}

const keysPressed = {
    ArrowLeft:false,ArrowRight:false,ArrowUp:false,ArrowDown:false,Enter:false,KeyH:false
};
document.addEventListener('keydown', function(e) {
    if (keysPressed.hasOwnProperty(e.code)) { e.preventDefault(); keysPressed[e.code] = true; }
    else if (keysPressed.hasOwnProperty(e.key)) { e.preventDefault(); keysPressed[e.key] = true; }
});
document.addEventListener('keyup', function(e) {
    if (keysPressed.hasOwnProperty(e.code)) { keysPressed[e.code] = false; }
    else if (keysPressed.hasOwnProperty(e.key)) { keysPressed[e.key] = false; }
});

const enemies = [];
const ENEMY_TYPES = {
    chasingFish: { width:21,height:15,color:'teal',speed:1.5,damage:1,health:1,sprite:[{x:0,y:1,w:6,h:3,c:'teal'},{x:6,y:0,w:1,h:5,c:'darkcyan'},{x:1,y:0,w:1,h:1,c:'white'},{x:1.25,y:0.25,w:0.5,h:0.5,c:'black'}],pixelSize:3}
};
// Recalculate width/height based on sprite and pixelSize for ChasingFish
ENEMY_TYPES.chasingFish.width = 7 * ENEMY_TYPES.chasingFish.pixelSize;
ENEMY_TYPES.chasingFish.height = 5 * ENEMY_TYPES.chasingFish.pixelSize;


function spawnEnemy(enemyConfig) {
    const template = ENEMY_TYPES[enemyConfig.type]; if (!template) { console.error("Unknown enemy type:", enemyConfig.type); return; }
    const enemy = { ...template, type: enemyConfig.type, x: Math.random()*(CANVAS_WIDTH-template.width), y: Math.random()*(CANVAS_HEIGHT-template.height-40)+20, dx: template.speed*(Math.random()<0.5?1:-1), currentHealth: template.health };
    enemies.push(enemy);
}
function drawEnemies() {
    enemies.forEach(enemy => {
        const pSize = enemy.pixelSize;
        enemy.sprite.forEach(block => {
            ctx.fillStyle = block.c; let drawX = enemy.x + block.x * pSize;
            if (enemy.dx < 0) { drawX = enemy.x + (enemy.width - (block.x + block.w) * pSize); }
            ctx.fillRect(drawX, enemy.y + block.y * pSize, block.w * pSize, block.h * pSize);
        });
    });
}
function updateEnemies() {
    if (gameOver) return; // Stop enemy updates if game is over

    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        enemy.x += enemy.dx;
        if (enemy.x <= 0 || enemy.x + enemy.width >= CANVAS_WIDTH) {
            enemy.dx *= -1; enemy.x = Math.max(0, Math.min(enemy.x, CANVAS_WIDTH - enemy.width));
        }
        // Chase logic
        const verticalAlignThreshold = 50;
        const typeSpeed = ENEMY_TYPES[enemy.type].speed; // Get base speed for this enemy type
        if (Math.abs(player.y + player.height/2 - (enemy.y + enemy.height/2)) < verticalAlignThreshold) {
            if (player.x < enemy.x) enemy.dx = -typeSpeed; // Player is to the left
            else enemy.dx = typeSpeed; // Player is to the right
        } else { // Revert to patrol speed if player not in chase alignment
            enemy.dx = Math.sign(enemy.dx) * typeSpeed;
        }

        if (checkCollision(player, enemy)) {
            playerTakeDamage(enemy.damage);
            enemy.currentHealth--;
            if (enemy.currentHealth <= 0) {
                enemies.splice(i, 1);
                console.log("Enemy destroyed.");
            }
        }
    }
}

function getCurrentZone() { return zones[currentZoneIndex]; }
function updateParallaxBackgrounds() {
    const zone = getCurrentZone(); if(!zone.parallaxLayers) return;
    zone.parallaxLayers.forEach(layer => { layer.x -= BASE_PARALLAX_SCROLL_SPEED * layer.speedRatio; if (layer.x <= -CANVAS_WIDTH) { layer.x += CANVAS_WIDTH; }});
}
function drawParallaxBackgrounds() {
    const zone = getCurrentZone(); if(!zone.parallaxLayers) return;
    zone.parallaxLayers.forEach(layer => { ctx.fillStyle = layer.color; ctx.fillRect(layer.x, layer.y, layer.width, layer.height); });
}
function drawZoneStaticElements() {
    const zone = getCurrentZone(); if(!zone.staticElements) return;
    zone.staticElements.forEach(element => { ctx.fillStyle = element.color; ctx.fillRect(element.x, element.y, element.width, element.height); });
}
function spawnPlankton() {
    const zone = getCurrentZone(); const plankton = { x:Math.random()*(CANVAS_WIDTH-PLANKTON_SIZE),y:Math.random()*(CANVAS_HEIGHT-PLANKTON_SIZE),width:PLANKTON_SIZE,height:PLANKTON_SIZE,color:zone.planktonColor}; planktonItems.push(plankton);
}
function initEntitiesForZone() {
    planktonItems.length = 0;
    enemies.length = 0;
    const zone = getCurrentZone();
    for (let i = 0; i < zone.initialPlanktonCount; i++) { spawnPlankton(); }
    if (zone.enemyTypes) { // Check if enemyTypes is defined
        zone.enemyTypes.forEach(enemyConfig => {
            for (let i = 0; i < enemyConfig.count; i++) { spawnEnemy(enemyConfig); }
        });
    }
    zoneCleared = false;
    if (zone.parallaxLayers) { zone.parallaxLayers.forEach(layer => layer.x = 0); }
    console.log("Initialized entities for zone:", zone.name);
}
function drawPlankton() { planktonItems.forEach(item => { ctx.fillStyle = item.color; ctx.fillRect(item.x, item.y, item.width, item.height); }); }
function checkCollision(rect1, rect2) { return rect1.x < rect2.x + rect2.width && rect1.x + rect1.width > rect2.x && rect1.y < rect2.y + rect2.height && rect1.y + rect1.height > rect2.y; }
function updateCollectibles() {
    if (gameOver || zoneCleared) return;
    for (let i = planktonItems.length - 1; i >= 0; i--) {
        if (checkCollision(player, planktonItems[i])) { score++; planktonItems.splice(i, 1); console.log(`Plankton collected! Score: ${score}`); if (planktonItems.length === 0) { console.log(`Zone cleared.`); zoneCleared = true;}}
    }
}
function drawScore() { ctx.fillStyle = 'black'; ctx.font = '20px Arial'; ctx.fillText('Score: '+score,10,25); ctx.fillText(`Zone: ${getCurrentZone().name}`,10,50); }
function drawPlayer() {
    const pSize = player.pixelSize; const shrimpPixelBlocks = [[2,1,4,3,player.color1],[1,2,1,2,player.color1],[6,2,1,2,player.color1],[3,4,2,1,player.color2],[2,5,1,1,player.color2],[5,5,1,1,player.color2],[3,0,1,1,'white'],[4,0,1,1,'black'],[5,0,1,1,'white'],[6,0,1,1,'black']];
    shrimpPixelBlocks.forEach(block => {
        let actualColor;
        if (block[4] === player.color1) actualColor = player.color1;
        else if (block[4] === player.color2) actualColor = player.color2;
        else actualColor = block[4];
        if (player.invulnerableTimer > 0 && (player.invulnerableTimer % 30 < 15) ) { if (block[4] === player.color1 || block[4] === player.color2) actualColor = 'white'; else if (block[4] === 'black') actualColor = 'grey';}
        ctx.fillStyle = actualColor; ctx.fillRect(player.x+block[0]*pSize, player.y+block[1]*pSize, block[2]*pSize, block[3]*pSize);
    });
}
function updatePlayer() {
    if (gameOver) { 
        if (keysPressed.Enter) startGameAndRunLoop(); 
        return; // Only process Enter for restart if game is over
    }
    updatePlayerInvulnerability();
    if (keysPressed.KeyH) { playerTakeDamage(1); keysPressed.KeyH = false; }
    
    let previousX = player.x; player.dx = 0; player.dy = 0;
    // Allow movement if zone is cleared (for transition) or if not cleared
    // Simplified movement logic: always allow movement if not game over. Transitions handle edge cases.
    if (keysPressed.ArrowLeft) player.dx = -player.speed;
    if (keysPressed.ArrowRight) player.dx = player.speed;
    if (keysPressed.ArrowUp) player.dy = -player.speed;
    if (keysPressed.ArrowDown) player.dy = player.speed;
    
    player.x += player.dx; player.y += player.dy;
    if (player.y < 0) player.y = 0; if (player.y + player.height > CANVAS_HEIGHT) player.y = CANVAS_HEIGHT - player.height;

    if (zoneCleared) { // Handle transitions if zone is cleared
        if (player.x + player.width > CANVAS_WIDTH && previousX + player.width <= CANVAS_WIDTH) { currentZoneIndex = (currentZoneIndex + 1) % zones.length; player.x = 5; initEntitiesForZone(); }
        else if (player.x < 0 && previousX >= 0) { currentZoneIndex = (currentZoneIndex - 1 + zones.length) % zones.length; player.x = CANVAS_WIDTH - player.width - 5; initEntitiesForZone(); }
        else { // Boundary if zone cleared but not at edge
            if (player.x < 0) player.x = 0; if (player.x + player.width > CANVAS_WIDTH) player.x = CANVAS_WIDTH - player.width;
        }
    } else { // Normal boundary collision if zone not cleared
        if (player.x < 0) player.x = 0; if (player.x + player.width > CANVAS_WIDTH) player.x = CANVAS_WIDTH - player.width;
    }
    // Removed Enter key consumption for zoneCleared message, as Enter is now primarily for game restart.
}
function drawGameMessages() {
    if (zoneCleared && !gameOver) { ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(0,CANVAS_HEIGHT/3,CANVAS_WIDTH,CANVAS_HEIGHT/3); ctx.font='bold 30px Arial';ctx.fillStyle='white';ctx.textAlign='center'; ctx.fillText(`${getCurrentZone().name} Cleared!`,CANVAS_WIDTH/2,CANVAS_HEIGHT/2-10); ctx.font='20px Arial';ctx.fillText('Move to edge for next zone.',CANVAS_WIDTH/2,CANVAS_HEIGHT/2+30); ctx.textAlign='left'; }
    else if (gameOver) { ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(0,CANVAS_HEIGHT/3,CANVAS_WIDTH,CANVAS_HEIGHT/3); ctx.font='bold 40px Arial';ctx.fillStyle='red';ctx.textAlign='center'; ctx.fillText('GAME OVER',CANVAS_WIDTH/2,CANVAS_HEIGHT/2-10); ctx.font='20px Arial';ctx.fillText('Press Enter to Restart',CANVAS_WIDTH/2,CANVAS_HEIGHT/2+30); ctx.textAlign='left'; }
}
function clearCanvas() { const zone = getCurrentZone(); ctx.fillStyle = zone.backgroundColor; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT); }

let gameLoopId = null;
function mainGameLoop() {
    clearCanvas();
    updateParallaxBackgrounds(); drawParallaxBackgrounds();
    drawZoneStaticElements();

    if (gameOver) {
        updatePlayer(); // Only for restart logic and H key test (if not game over yet)
    } else { // Gameplay active (zoneCleared or normal play)
        updatePlayer();
        updateEnemies(); 
        if (!zoneCleared) {
            updateCollectibles();
        }
    }
    
    drawPlankton(); drawEnemies(); drawPlayer();
    drawScore(); drawPlayerHealth();
    drawGameMessages();

    gameLoopId = requestAnimationFrame(mainGameLoop);
}

function startGameAndRunLoop() {
    console.log('Game starting/restarting...');
    currentZoneIndex = 0;
    gameOver = false;
    zoneCleared = false;
    score = 0;
    
    player.health = player.maxHealth;
    player.invulnerableTimer = 0;
    player.x = 50; player.y = CANVAS_HEIGHT / 2 - player.height / 2;
    
    for (let key in keysPressed) { keysPressed[key] = false; }
    
    if (!gameLoopId) {
        zones.forEach(zone => {
            if (zone.parallaxLayers) { zone.parallaxLayers.forEach(layer => layer.x = 0); }
        });
    }
    
    initEntitiesForZone();
    
    if (!gameLoopId) {
        console.log("Starting main game loop for the first time.");
        mainGameLoop();
    } else {
        console.log("Game state reset. Loop is already running.");
    }
}

startGameAndRunLoop();
