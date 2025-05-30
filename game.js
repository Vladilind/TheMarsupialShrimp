// Get the canvas element and its 2D rendering context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Define canvas dimensions
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 400;

canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;
ctx.imageSmoothingEnabled = false;

// --- Core game item arrays & constants ---
const planktonItems = [];
const enemies = [];
const PLANKTON_SIZE = 10;

// --- Audio Manager (condensed) ---
const audioManager = { /* ... full definition from previous step ... */
    audioContext: null, sounds: {}, masterVolume: 0.5, musicVolume: 0.3, sfxVolume: 0.5, audioInitialized: false, currentMusic: null,
    async initAudio() { if(this.audioContext&&this.audioContext.state!=='closed')return;try{this.audioContext=new(window.AudioContext||window.webkitAudioContext)();if(this.audioContext.state==='suspended'){await this.audioContext.resume();}this.audioInitialized=true;console.log("AudioContext initialized.");}catch(e){console.error("Error initializing AudioContext:",e);this.audioInitialized=false;}},
    async loadSound(name,url,isMusic=false){if(!this.audioInitialized||!this.audioContext){return;}if(this.sounds[name])return;try{const response=await fetch(url);if(!response.ok)throw new Error(`Fetch failed: ${url}`);const arrayBuffer=await response.arrayBuffer();const audioBuffer=await this.audioContext.decodeAudioData(arrayBuffer);this.sounds[name]={buffer:audioBuffer,sourceNode:null,gainNode:null,isMusic:isMusic,name:name};console.log(`Sound loaded: ${name}`);}catch(e){console.error(`Error loading ${name}:`,e);}},
    playSound(name,loop=false){if(!this.audioInitialized||!this.sounds[name]||!this.sounds[name].buffer)return;if(this.sounds[name].isMusic){this.stopAllMusic(name);this.currentMusic=name;}else if(this.sounds[name].sourceNode&&!this.sounds[name].isMusic){try{this.sounds[name].sourceNode.stop();}catch(e){/*ignore*/}}const sourceNode=this.audioContext.createBufferSource();sourceNode.buffer=this.sounds[name].buffer;sourceNode.loop=loop;const gainNode=this.audioContext.createGain();const volume=this.sounds[name].isMusic?this.musicVolume:this.sfxVolume;gainNode.gain.setValueAtTime(volume*this.masterVolume,this.audioContext.currentTime);sourceNode.connect(gainNode).connect(this.audioContext.destination);sourceNode.start(0);this.sounds[name].sourceNode=sourceNode;this.sounds[name].gainNode=gainNode;sourceNode.onended=()=>{if(this.sounds[name]&&this.sounds[name].sourceNode===sourceNode){this.sounds[name].sourceNode=null;this.sounds[name].gainNode=null;}if(this.sounds[name]&&this.sounds[name].isMusic&&this.currentMusic===name&&!loop){this.currentMusic=null;}};},
    stopSound(name){if(this.sounds[name]&&this.sounds[name].sourceNode){try{this.sounds[name].sourceNode.stop(0);}catch(e){/*ignore*/}this.sounds[name].sourceNode=null;this.sounds[name].gainNode=null;if(this.sounds[name].isMusic&&this.currentMusic===name){this.currentMusic=null;}}},
    stopAllMusic(exceptTrackName=null){for(const soundName in this.sounds){if(this.sounds[soundName].isMusic&&this.sounds[soundName].sourceNode&&soundName!==exceptTrackName){this.stopSound(soundName);}}if(exceptTrackName===null&&this.currentMusic&&(!exceptTrackName||this.currentMusic!==exceptTrackName)){this.currentMusic=null;}else if(exceptTrackName&&this.currentMusic===exceptTrackName){}else if(this.currentMusic&&this.currentMusic!==exceptTrackName){}},
    setMasterVolume(volume){this.masterVolume=Math.max(0,Math.min(1,volume));for(const soundName in this.sounds){if(this.sounds[soundName]&&this.sounds[soundName].gainNode){const baseVolume=this.sounds[soundName].isMusic?this.musicVolume:this.sfxVolume;this.sounds[soundName].gainNode.gain.setValueAtTime(baseVolume*this.masterVolume,this.audioContext.currentTime);}}}
};

// Zone Definitions
const zones = [
    {
        name: "Coral Reef",
        backgroundColor: '#70c5ce',
        planktonColor: 'lightgreen',
        initialPlanktonCount: 3,
        staticElements: [
            // Coral formations (bottom)
            { x: 50, y: 360, width: 30, height: 40, color: '#FF7F50' }, // Coral color
            { x: 80, y: 340, width: 40, height: 60, color: '#FF4500' }, // OrangeRed
            { x: 120, y: 370, width: 25, height: 30, color: '#FF7F50' },
            { x: 250, y: 350, width: 60, height: 50, color: '#DA70D6' }, // Orchid
            { x: 310, y: 365, width: 30, height: 35, color: '#FF69B4' }, // HotPink
            { x: 450, y: 330, width: 50, height: 70, color: '#FF4500' },
            { x: 500, y: 355, width: 35, height: 45, color: '#DA70D6' },
            // Seaweed (taller, thinner, greenish)
            { x: 100, y: 320, width: 10, height: 60, color: '#2E8B57' }, // SeaGreen
            { x: 110, y: 330, width: 8, height: 50, color: '#3CB371' },  // MediumSeaGreen
            { x: 350, y: 300, width: 12, height: 80, color: '#2E8B57' },
            { x: 365, y: 310, width: 10, height: 70, color: '#3CB371' },
            { x: 550, y: 340, width: 10, height: 40, color: '#2E8B57' },
        ],
        parallaxLayers: [
            { x: 0, y: 0, width: 600, height: 400, color: 'rgba(100, 180, 190, 0.5)', speedRatio: 0.1 },
            { x: 0, y: 350, width: 600, height: 50, color: 'rgba(0,0,0,0.05)', speedRatio: 0.2 }
        ],
        enemyTypes: [{ type: 'chasingFish', count: 1 }],
        musicTrackName: 'musicReef'
    },
    {
        name: "Kelp Forest",
        backgroundColor: '#2E8B57',
        planktonColor: '#FFD700',
        initialPlanktonCount: 2,
        staticElements: [
            // Kelp Stalks
            { x: 60, y: 0, width: 15, height: 350, color: '#556B2F' },
            { x: 70, y: 0, width: 10, height: 370, color: '#6B8E23' },
            { x: 150, y: 0, width: 20, height: 380, color: '#556B2F' },
            { x: 165, y: 0, width: 12, height: 330, color: '#6B8E23' },
            { x: 280, y: 0, width: 18, height: 360, color: '#556B2F' },
            { x: 400, y: 0, width: 25, height: 340, color: '#556B2F' },
            { x: 415, y: 0, width: 15, height: 375, color: '#6B8E23' },
            { x: 520, y: 0, width: 15, height: 350, color: '#556B2F' },
            // Rocks at the bottom
            { x: 0, y: 370, width: 100, height: 30, color: '#696969' },
            { x: 120, y: 360, width: 150, height: 40, color: '#808080' },
            { x: 350, y: 375, width: 120, height: 25, color: '#696969' },
            { x: 500, y: 365, width: 100, height: 35, color: '#808080' },
        ],
        parallaxLayers: [
            { x: 0, y: 0, width: 600, height: 400, color: 'rgba(0, 50, 0, 0.3)', speedRatio: 0.15 },
            { x: 0, y: 0, width: 600, height: 400, color: 'rgba(40, 60, 40, 0.4)', speedRatio: 0.25 },
            { x: 50, y: 0, width: 30, height: 400, color: 'rgba(20,40,20,0.5)', speedRatio: 0.05},
            { x: 250, y: 0, width: 40, height: 400, color: 'rgba(20,40,20,0.5)', speedRatio: 0.08},
            { x: 450, y: 0, width: 35, height: 400, color: 'rgba(20,40,20,0.5)', speedRatio: 0.06},
        ],
        enemyTypes: [{ type: 'stealthyOctopus', count: 1 }],
        musicTrackName: 'musicKelp'
    },
    {
        name: "Open Ocean",
        backgroundColor: '#4682B4',
        planktonColor: '#E0FFFF',
        initialPlanktonCount: 1,
        staticElements: [
            { x: 100, y: 385, width: 150, height: 15, color: '#336699' },
            { x: 400, y: 390, width: 100, height: 10, color: '#2C5A82' },
        ],
        parallaxLayers: [
            { x: 0, y: 0, width: 600, height: 400, color: 'rgba(173, 216, 230, 0.05)', speedRatio: 0.05 },
            { x: 50, y: 0, width: 10, height: 400, color: 'rgba(200, 220, 255, 0.08)', speedRatio: 0.1 },
            { x: 150, y: 0, width: 15, height: 400, color: 'rgba(200, 220, 255, 0.06)', speedRatio: 0.12 },
            { x: 300, y: 0, width: 8, height: 400, color: 'rgba(200, 220, 255, 0.09)', speedRatio: 0.08 },
            { x: 450, y: 0, width: 12, height: 400, color: 'rgba(200, 220, 255, 0.07)', speedRatio: 0.11 },
            { x: 0, y: 0, width: 600, height: 400, color: 'rgba(0, 0, 50, 0.05)', speedRatio: 0.2 },
            { x: 0, y: 200, width: 600, height: 200, color: 'rgba(0, 0, 0, 0.03)', speedRatio: 0.25 }
        ],
        enemyTypes: [{ type: 'grasailSeal', count: 1 }],
        musicTrackName: 'musicOcean'
    }
];
let currentZoneIndex = 0;
const BASE_PARALLAX_SCROLL_SPEED = 0.5;

const player = { /* ... existing player object ... */
    x: 50, y: CANVAS_HEIGHT / 2 - 12, width: 32, height: 24, color1: '#FF7F50', color2: '#FF6347', colorHighlight: '#FFA07A', speed: 4, dx: 0, dy: 0, pixelSize: 4, health: 3, maxHealth: 3, invulnerableTimer: 0, invulnerabilityDuration: 120
};

// --- ENEMY_TYPES Definition ---
const ENEMY_TYPES = {
    chasingFish: { baseWidth: 7, baseHeight: 5, color: 'teal', speed: 1.5, damage: 1, health: 1, sprite: [
        // Body
        {x:1, y:1, w:5, h:3, c:'teal'},         // Main body
        {x:0, y:2, w:1, h:1, c:'teal'},         // Snout extension
        // Fins
        {x:2, y:0, w:3, h:1, c:'darkcyan'},     // Dorsal fin
        {x:6, y:1, w:1, h:3, c:'darkcyan'},     // Tail fin (vertical part)
        {x:5, y:2, w:1, h:1, c:'darkcyan'},     // Tail fin connection to body
        // Pectoral fin
        {x:2, y:3, w:1, h:1, c:'darkcyan'},     // Small pectoral fin
        // Eye
        {x:1, y:1, w:1, h:1, c:'white'},        // Eye white
        {x:1.25, y:1.25, w:0.5, h:0.5, c:'black'} // Eye pupil
    ], pixelSize: 3 },
    stealthyOctopus: { baseWidth: 6, baseHeight: 6, color: '#8A2BE2', speed: 1, dashSpeed: 5, damage: 1, health: 2, detectionRadius: 150, revealDuration: 30, dashDuration: 20, cooldownDuration: 180,
        spriteHiding: [
            {x:1, y:2, w:4, h:3, c:'#4B0082'}, // Main blob
            {x:2, y:1, w:2, h:1, c:'#4B0082'}, // Top part of blob
            {x:0, y:3, w:1, h:2, c:'#400060'}, // Darker shade for bottom edge
            {x:5, y:3, w:1, h:2, c:'#400060'}, // Darker shade for bottom edge
            {x:2, y:2, w:1, h:1, c:'#3A005A'}, // Subtle "closed" eyes or texture
            {x:3, y:2, w:1, h:1, c:'#3A005A'},
        ],
        spriteRevealed: [
            // Head
            {x:1, y:0, w:4, h:3, c:'#8A2BE2'}, // Main head shape (rounded top)
            {x:2, y:0, w:2, h:1, c:'#9932CC'}, // Darker top for head (MediumOrchid)
            // Eyes
            {x:1, y:1, w:1, h:1, c:'white'},
            {x:1.25, y:1.25, w:0.5, h:0.5, c:'black'},
            {x:4, y:1, w:1, h:1, c:'white'},
            {x:4.25, y:1.25, w:0.5, h:0.5, c:'black'},
            // Tentacles
            {x:0, y:3, w:2, h:1, c:'#8A2BE2'}, // Left tentacle
            {x:1, y:4, w:1, h:2, c:'#7B1FA2'}, // Left tentacle underside / shadow
            {x:4, y:3, w:2, h:1, c:'#8A2BE2'}, // Right tentacle
            {x:4, y:4, w:1, h:2, c:'#7B1FA2'}, // Right tentacle underside / shadow
            {x:2, y:3, w:2, h:2, c:'#8A2BE2'}, // Middle tentacles
            {x:2, y:5, w:2, h:1, c:'#7B1FA2'}, // Underside of middle tentacles
        ],
        pixelSize: 4
    },
    grasailSeal: {
        baseWidth: 12, baseHeight: 8, // Larger sprite
        color: '#A9A9A9', // DarkGray, fallback
        patrolSpeed: 0.8,
        chargeSpeed: 6,
        damage: 2, // Higher damage
        health: 5, // Higher health
        detectionRange: 200, // How far it can "see"
        detectionHeight: 40, // How tall its line of sight is (relative to its center)
        telegraphDuration: 45, // Frames to telegraph (~0.75s)
        chargeDuration: 30,    // Frames charge lasts (~0.5s)
        cooldownDuration: 120, // Frames to cooldown (2s)
        spritePatrol: [
            // Head
            {x:9, y:2, w:3, h:2, c:'#808080'},  // Head main shape
            {x:10, y:1, w:1, h:1, c:'#808080'}, // Head top curve
            {x:11, y:2, w:1, h:1, c:'black'},   // Eye
            {x:10, y:3, w:2, h:1, c:'#A9A9A9'}, // Snout/lower head highlight
            // Body
            {x:2, y:2, w:7, h:4, c:'#808080'},  // Main body
            {x:1, y:3, w:1, h:2, c:'#808080'},  // Body front curve
            {x:3, y:1, w:6, h:1, c:'#A9A9A9'},  // Top highlight strip
            {x:3, y:5, w:6, h:1, c:'#696969'},  // Bottom shadow strip
            // Flippers & Tail
            {x:0, y:4, w:2, h:2, c:'#696969'},  // Rear flippers/tail base
            {x:0, y:3, w:1, h:1, c:'#696969'},  // Top of tail
            {x:6, y:5, w:2, h:1, c:'#696969'},  // Front flipper (resting)
            {x:5, y:4, w:1, h:1, c:'#808080'},  // Connect flipper to body
        ],
        spriteTelegraph: [
            // Head (reared back, mouth open)
            {x:9, y:1, w:3, h:3, c:'#778899'},  // Head main shape
            {x:10, y:0, w:1, h:1, c:'#778899'}, // Head top
            {x:11, y:1, w:1, h:1, c:'red'},     // Eye (angry)
            {x:9, y:3, w:2, h:1, c:'white'},    // Open mouth
            // Body (arched, more upright)
            {x:2, y:2, w:7, h:5, c:'#778899'},  // Main body arched
            {x:1, y:4, w:1, h:2, c:'#778899'},  // Lower body curve
            {x:3, y:1, w:5, h:1, c:'#B0C4DE'},  // Top highlight on back
            {x:3, y:6, w:5, h:1, c:'#696969'},  // Shadow underneath
            // Flippers (more prominent, ready to push)
            {x:0, y:5, w:2, h:3, c:'#696969'},  // Rear flippers spread/down
            {x:7, y:5, w:2, h:2, c:'#778899'},  // Front flipper base
            {x:8, y:6, w:2, h:1, c:'#696969'},  // Front flipper extended
        ],
        spriteCharge: [
            // Head (pointed forward)
            {x:10, y:2, w:2, h:2, c:'#696969'}, // Head front
            {x:11, y:2, w:1, h:1, c:'yellow'},  // Eye (focused)
            // Body (streamlined)
            {x:1, y:2, w:9, h:3, c:'#696969'},  // Main body, sleek
            {x:2, y:1, w:8, h:1, c:'#A9A9A9'},  // Top highlight strip (narrower)
            {x:0, y:3, w:1, h:1, c:'#696969'},  // Body front tip
            // Flippers & Tail (tucked or trailing)
            {x:0, y:2, w:2, h:1, c:'#696969'},  // Tail/Rear flippers trailing
            {x:1, y:1, w:1, h:1, c:'#696969'},  // Top of tail
            {x:5, y:4, w:3, h:1, c:'#606060'},  // Front flippers tucked underneath (darker shade)
        ],
        pixelSize: 5, // Larger pixels for a bigger enemy
    }
};
for (const type in ENEMY_TYPES) { ENEMY_TYPES[type].width = ENEMY_TYPES[type].baseWidth * ENEMY_TYPES[type].pixelSize; ENEMY_TYPES[type].height = ENEMY_TYPES[type].baseHeight * ENEMY_TYPES[type].pixelSize; }

// (Player functions, keysPressed, event listeners - condensed)
function playerTakeDamage(amount) { if(player.invulnerableTimer>0||gameOver)return;player.health-=amount;audioManager.playSound('sfxPlayerHurt');if(player.health<=0){player.health=0;gameOver=true;zoneCleared=false;}else{player.invulnerableTimer=player.invulnerabilityDuration;}}
function updatePlayerInvulnerability(){if(player.invulnerableTimer>0){player.invulnerableTimer--;}}
function drawPlayerHealth(){const hS=20,hP=5,sX=CANVAS_WIDTH-(player.maxHealth*(hS+hP))+hP-10;for(let i=0;i<player.maxHealth;i++){let hC=(i<player.health)?'red':'lightgray';if(player.invulnerableTimer>0&&(player.invulnerableTimer%30<15)){if(i<player.health)hC='pink';}ctx.fillStyle=hC;ctx.fillRect(sX+i*(hS+hP),15,hS*0.8,hS*0.8);}}
const keysPressed={ArrowLeft:!1,ArrowRight:!1,ArrowUp:!1,ArrowDown:!1,Enter:!1,KeyH:!1};document.addEventListener('keydown',async e=>{if(!audioManager.audioInitialized)await audioManager.initAudio();if(keysPressed.hasOwnProperty(e.code)){e.preventDefault();keysPressed[e.code]=!0;}else if(keysPressed.hasOwnProperty(e.key)){e.preventDefault();keysPressed[e.key]=!0;}});document.addEventListener('keyup',e=>{if(keysPressed.hasOwnProperty(e.code))keysPressed[e.code]=!1;else if(keysPressed.hasOwnProperty(e.key))keysPressed[e.key]=!1;});

function spawnEnemy(enemyConfig) {
    const template = ENEMY_TYPES[enemyConfig.type];
    if (!template) { console.error("Unknown enemy type:", enemyConfig.type); return; }
    const enemy = {
        ...template, type: enemyConfig.type,
        x: Math.random() * (CANVAS_WIDTH - template.width),
        y: Math.random() * (CANVAS_HEIGHT - template.height - 60) + 30, // Spawn a bit away from very edges
        dx: 0, dy: 0, currentHealth: template.health,
        aiState: 'patrol', aiTimer: 0, dashTargetX: null, dashTargetY: null, facingRight: Math.random() < 0.5
    };
    if (enemy.type === 'chasingFish' || enemy.type === 'grasailSeal') { // Initialize patrol direction
        enemy.dx = (enemy.type === 'grasailSeal' ? template.patrolSpeed : template.speed) * (enemy.facingRight ? 1 : -1);
        if (enemy.type === 'chasingFish') {
            enemy.aiTimer = 0;
        }
        if (enemy.type === 'grasailSeal') { // Initialization for grasailSeal
            enemy.patrolCycle = 0;
            enemy.currentPatrolDuration = 180 + Math.random() * 120; // 3-5 seconds
        }
    }
    if (enemy.type === 'stealthyOctopus') {
        enemy.alpha = 0.5; // Initial alpha for stealthyOctopus
    }
    enemies.push(enemy);
}

function drawEnemies() {
    enemies.forEach(enemy => {
        const pSize = enemy.pixelSize;
        let spriteToUse;
        if (enemy.type === 'stealthyOctopus') {
            // Sprite selection is based on state, alpha is for transparency
            spriteToUse = (enemy.aiState === 'hiding') ? enemy.spriteHiding : enemy.spriteRevealed;
        } else if (enemy.type === 'grasailSeal') {
            if (enemy.aiState === 'telegraph') spriteToUse = enemy.spriteTelegraph;
            else if (enemy.aiState === 'dashing') spriteToUse = enemy.spriteCharge;
            else spriteToUse = enemy.spritePatrol; // Includes patrol and cooldown
        } else { // Default for chasingFish or others
            spriteToUse = enemy.sprite;
        }

        let originalGlobalAlpha = ctx.globalAlpha;
        if (enemy.type === 'stealthyOctopus') {
            ctx.globalAlpha = enemy.alpha; // Apply current alpha for octopus
        }

        spriteToUse.forEach(block => {
            ctx.fillStyle = block.c;
            let drawX = enemy.x + block.x * pSize;
            // Flipping logic (for enemies that patrol/charge horizontally)
            if ((enemy.type === 'chasingFish' || enemy.type === 'grasailSeal') && !enemy.facingRight) {
                 drawX = enemy.x + (enemy.baseWidth * pSize) - ((block.x + block.w) * pSize);
            }
            ctx.fillRect(drawX, enemy.y + block.y * pSize, block.w * pSize, block.h * pSize);
        });

        if (enemy.type === 'stealthyOctopus') {
            ctx.globalAlpha = originalGlobalAlpha; // Reset globalAlpha
        }
    });
}

function updateEnemies() {
    if (gameOver) return;
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        const typeTemplate = ENEMY_TYPES[enemy.type];

        if (enemy.type === 'chasingFish') {

            // Vertical movement tendency
            const yDiff = (player.y + player.height / 2) - (enemy.y + enemy.height / 2);
            if (Math.abs(yDiff) > 5) { // Only adjust if not too close vertically
                enemy.y += Math.sign(yDiff) * typeTemplate.speed * 0.25; // Slow vertical adjustment
            }

            const vAT = 60; // verticalAlignThreshold, slightly increased
            const isPlayerAligned = Math.abs(yDiff) < vAT;

            if (isPlayerAligned) {
                // Chasing player
                let chaseSpeed = typeTemplate.speed * (1 + (Math.random() - 0.5) * 0.4); // Speed varies by +/- 20%
                if (player.x < enemy.x) {
                    enemy.dx = -chaseSpeed;
                } else {
                    enemy.dx = chaseSpeed;
                }
                enemy.facingRight = enemy.dx > 0;
            } else {
                // Patrolling
                if (enemy.aiTimer === undefined) enemy.aiTimer = 0; // Initialize aiTimer if not present (should be by spawn)
                enemy.aiTimer--;

                if (enemy.aiTimer <= 0) {
                    const actionRoll = Math.random();
                    if (actionRoll < 0.1) { // 10% chance to pause
                        enemy.dx = 0;
                        enemy.aiTimer = 60 + Math.random() * 60; // Pause for 1-2 seconds
                    } else if (actionRoll < 0.25) { // 15% chance to reverse direction (total 25% for action)
                        // Ensure dx is not zero before reversing to prevent getting stuck if current speed is 0
                        enemy.dx = (enemy.dx === 0 ? typeTemplate.speed * (enemy.facingRight ? -1 : 1) : -enemy.dx);
                        enemy.facingRight = !enemy.facingRight; // Flip direction
                        enemy.aiTimer = 120 + Math.random() * 120; // Continue in new direction for 2-4 seconds
                    } else {
                        // Continue patrolling
                        enemy.dx = (enemy.facingRight ? 1 : -1) * typeTemplate.speed;
                        enemy.aiTimer = 180 + Math.random() * 120; // Continue for 3-5 seconds before new decision
                    }
                }
            }

            enemy.x += enemy.dx;

            // Wall collision and turning
            if (enemy.x <= 0 && enemy.dx < 0) {
                enemy.x = 0;
                enemy.dx *= -1;
                enemy.facingRight = true;
                if (isPlayerAligned) enemy.aiTimer = 0; // Re-evaluate if was chasing and hit wall
            } else if (enemy.x + enemy.width >= CANVAS_WIDTH && enemy.dx > 0) {
                enemy.x = CANVAS_WIDTH - enemy.width;
                enemy.dx *= -1;
                enemy.facingRight = false;
                if (isPlayerAligned) enemy.aiTimer = 0; // Re-evaluate
            }

            // Clamp Y position
            enemy.y = Math.max(0, Math.min(enemy.y, CANVAS_HEIGHT - enemy.height));

        } else if (enemy.type === 'stealthyOctopus') {
            // const typeTemplate = ENEMY_TYPES[enemy.type]; // Already defined
            enemy.aiTimer--;
            const distToPlayer = Math.sqrt(Math.pow(player.x - enemy.x, 2) + Math.pow(player.y - enemy.y, 2));

            if (enemy.aiState === 'hiding') {
                enemy.alpha = 0.5; // Camouflaged
                if (distToPlayer < enemy.detectionRadius) {
                    enemy.aiState = 'revealing';
                    enemy.aiTimer = enemy.revealDuration;
                }
            } else if (enemy.aiState === 'revealing') {
                // Interpolate alpha from 0.5 to 1 during revealDuration
                enemy.alpha = 0.5 + (1 - (enemy.aiTimer / Math.max(1, enemy.revealDuration))) * 0.5;
                enemy.alpha = Math.min(1, Math.max(0.5, enemy.alpha)); // Clamp between 0.5 and 1

                if (enemy.aiTimer <= 0) {
                    enemy.aiState = 'dashing';
                    enemy.aiTimer = enemy.dashDuration;

                    const offsetX = (Math.random() - 0.5) * player.width * 1.5;
                    const offsetY = (Math.random() - 0.5) * player.height * 1.5;
                    enemy.dashTargetX = player.x + offsetX;
                    enemy.dashTargetY = player.y + offsetY;

                    const angle = Math.atan2(enemy.dashTargetY - (enemy.y + enemy.height / 2), enemy.dashTargetX - (enemy.x + enemy.width / 2));
                    const currentDashSpeed = enemy.dashSpeed * (1 + (Math.random() - 0.5) * 0.3);

                    enemy.dx = Math.cos(angle) * currentDashSpeed;
                    enemy.dy = Math.sin(angle) * currentDashSpeed;
                    enemy.alpha = 1; // Fully visible for dash
                }
            } else if (enemy.aiState === 'dashing') {
                enemy.alpha = 1;
                enemy.x += enemy.dx;
                enemy.y += enemy.dy;

                let stoppedByWall = false;
                if (enemy.x <= 0 || enemy.x + enemy.width >= CANVAS_WIDTH || enemy.y <= 0 || enemy.y + enemy.height >= CANVAS_HEIGHT) {
                    enemy.x = Math.max(0, Math.min(enemy.x, CANVAS_WIDTH - enemy.width));
                    enemy.y = Math.max(0, Math.min(enemy.y, CANVAS_HEIGHT - enemy.height));
                    stoppedByWall = true;
                }

                if (enemy.aiTimer <= 0 || stoppedByWall) {
                    enemy.aiState = 'cooldown';
                    enemy.aiTimer = enemy.cooldownDuration;
                    enemy.dx = 0;
                    enemy.dy = 0;
                    enemy.alpha = 1;
                }
            } else if (enemy.aiState === 'cooldown') {
                enemy.alpha = 1;
                if (enemy.aiTimer <= 0) {
                    enemy.aiState = 'relocating';
                    enemy.aiTimer = 30; // Relocate duration (frames)
                    enemy.relocateTargetX = Math.random() * (CANVAS_WIDTH - enemy.width);
                    enemy.relocateTargetY = Math.random() * (CANVAS_HEIGHT - enemy.height);
                }
            } else if (enemy.aiState === 'relocating') {
                // Interpolate alpha from 1 down to 0.5 during relocate
                enemy.alpha = 1 - (0.5 * (1 - (enemy.aiTimer / Math.max(1, 30)))); // 30 is relocate duration
                enemy.alpha = Math.min(1, Math.max(0.5, enemy.alpha)); // Clamp

                const moveSpeed = 10; // Relocation speed
                const rdx = enemy.relocateTargetX - enemy.x;
                const rdy = enemy.relocateTargetY - enemy.y;
                const rDist = Math.sqrt(rdx*rdx + rdy*rdy);

                if (rDist < moveSpeed || enemy.aiTimer <= 0) {
                    enemy.x = enemy.relocateTargetX;
                    enemy.y = enemy.relocateTargetY;
                    enemy.aiState = 'hiding';
                    enemy.alpha = 0.5;
                } else {
                    enemy.x += (rdx / rDist) * moveSpeed;
                    enemy.y += (rdy / rDist) * moveSpeed;
                }
            }
        } else if (enemy.type === 'grasailSeal') {
            // const typeTemplate = ENEMY_TYPES[enemy.type]; // Already defined
            enemy.aiTimer--;

            // Initialize properties if they don't exist
            if (enemy.patrolCycle === undefined) enemy.patrolCycle = 0;
            if (enemy.currentPatrolDuration === undefined) enemy.currentPatrolDuration = 180 + Math.random() * 120;


            if (enemy.aiState === 'patrol') {
                // Vertical oscillation
                enemy.patrolCycle += 0.05;
                const verticalOscillation = Math.sin(enemy.patrolCycle) * 15;
                enemy.y += verticalOscillation * 0.05;

                enemy.x += enemy.dx;
                enemy.currentPatrolDuration--;

                if (enemy.x <= 0 || enemy.x + enemy.width >= CANVAS_WIDTH || enemy.currentPatrolDuration <= 0) {
                    enemy.dx *= -1;
                    enemy.facingRight = !enemy.facingRight;
                    enemy.x = Math.max(0, Math.min(enemy.x, CANVAS_WIDTH - enemy.width));
                    enemy.currentPatrolDuration = 180 + Math.random() * 120; // 3-5 seconds
                }

                const detectionYMin = (enemy.y + enemy.height / 2) - typeTemplate.detectionHeight / 2;
                const detectionYMax = (enemy.y + enemy.height / 2) + typeTemplate.detectionHeight / 2;
                const playerCenterY = player.y + player.height / 2;

                if (playerCenterY > detectionYMin && playerCenterY < detectionYMax) {
                    if (enemy.facingRight && player.x > enemy.x && player.x < enemy.x + typeTemplate.detectionRange) {
                        enemy.aiState = 'telegraph';
                        enemy.aiTimer = typeTemplate.telegraphDuration * (1 + (Math.random() - 0.5) * 0.4); // +/- 20%
                        enemy.dx = 0;
                    } else if (!enemy.facingRight && player.x < enemy.x && player.x > enemy.x - typeTemplate.detectionRange) {
                        enemy.aiState = 'telegraph';
                        enemy.aiTimer = typeTemplate.telegraphDuration * (1 + (Math.random() - 0.5) * 0.4); // +/- 20%
                        enemy.dx = 0;
                    }
                }
            } else if (enemy.aiState === 'telegraph') {
                if (enemy.aiTimer <= 0) {
                    enemy.aiState = 'dashing';
                    const baseChargeDuration = typeTemplate.chargeDuration;
                    enemy.aiTimer = baseChargeDuration * (1 + (Math.random() - 0.5) * 0.4); // +/- 20% duration

                    const baseChargeSpeed = typeTemplate.chargeSpeed;
                    const currentChargeSpeed = baseChargeSpeed * (1 + (Math.random() - 0.5) * 0.3); // +/- 15% speed

                    enemy.dx = (enemy.facingRight ? 1 : -1) * currentChargeSpeed;
                }
            } else if (enemy.aiState === 'dashing') {
                enemy.x += enemy.dx;
                if (enemy.aiTimer <= 0 || enemy.x <= 0 || enemy.x + enemy.width >= CANVAS_WIDTH) {
                    enemy.aiState = 'cooldown';
                    enemy.aiTimer = typeTemplate.cooldownDuration * (1 + (Math.random() - 0.5) * 0.4); // +/- 20%
                    enemy.dx = 0;
                    enemy.x = Math.max(0, Math.min(enemy.x, CANVAS_WIDTH - enemy.width));
                }
            } else if (enemy.aiState === 'cooldown') {
                if (enemy.aiTimer <= 0) {
                    enemy.aiState = 'patrol';
                    enemy.facingRight = Math.random() < 0.5;
                    enemy.dx = typeTemplate.patrolSpeed * (enemy.facingRight ? 1 : -1);
                    enemy.currentPatrolDuration = 180 + Math.random() * 120;
                    enemy.patrolCycle = 0;
                }
            }

            enemy.y = Math.max(1, Math.min(enemy.y, CANVAS_HEIGHT - enemy.height - 1));
        }

        if (checkCollision(player, enemy)) {
            playerTakeDamage(enemy.damage);
            enemy.currentHealth--;
            if (enemy.currentHealth <= 0) {
                enemies.splice(i, 1); audioManager.playSound('sfxEnemyDestroy');
            } else {
                // audioManager.playSound('sfxEnemyHit'); // Seal might have a different hit sound or none if it's a boss
            }
        }
    }
}

// (Rest of functions: getCurrentZone, parallax, static elements, plankton, initEntitiesForZone, collectibles, score, player drawing/update, messages, clearCanvas, game loop, start function)
// ... (Full code from previous step, ensuring function names are correct)
function getCurrentZone() { return zones[currentZoneIndex]; }
function updateParallaxBackgrounds(){const z=getCurrentZone();if(!z.parallaxLayers)return;z.parallaxLayers.forEach(l=>{l.x-=BASE_PARALLAX_SCROLL_SPEED*l.speedRatio;if(l.x<=-CANVAS_WIDTH){l.x+=CANVAS_WIDTH;}});}
function drawParallaxBackgrounds(){const z=getCurrentZone();if(!z.parallaxLayers)return;z.parallaxLayers.forEach(l=>{ctx.fillStyle=l.color;ctx.fillRect(l.x,l.y,l.width,l.height);});}
function drawZoneStaticElements(){const z=getCurrentZone();if(!z.staticElements)return;z.staticElements.forEach(e=>{ctx.fillStyle=e.color;ctx.fillRect(e.x,e.y,e.width,e.height);});}
function spawnPlankton(){const z=getCurrentZone();const p={x:Math.random()*(CANVAS_WIDTH-PLANKTON_SIZE),y:Math.random()*(CANVAS_HEIGHT-PLANKTON_SIZE),width:PLANKTON_SIZE,height:PLANKTON_SIZE,color:z.planktonColor};planktonItems.push(p);}
function initEntitiesForZone() { planktonItems.length = 0; enemies.length = 0; const zone = getCurrentZone(); for (let i = 0; i < zone.initialPlanktonCount; i++) { spawnPlankton(); } if (zone.enemyTypes) { zone.enemyTypes.forEach(enemyConfig => { for (let i = 0; i < enemyConfig.count; i++) { spawnEnemy(enemyConfig); } }); } zoneCleared = false; if (zone.parallaxLayers) { zone.parallaxLayers.forEach(layer => layer.x = 0); } if (audioManager.audioInitialized && zone.musicTrackName) { audioManager.playSound(zone.musicTrackName, true); } else if (audioManager.audioInitialized && !zone.musicTrackName) { audioManager.stopAllMusic(); } console.log("Init entities for:", zone.name); }
function drawPlankton(){planktonItems.forEach(item=>{ctx.fillStyle=item.color;ctx.fillRect(item.x,item.y,item.width,item.height);});}
function checkCollision(r1,r2){return r1.x<r2.x+r2.width&&r1.x+r1.width>r2.x&&r1.y<r2.y+r2.height&&r1.y+r1.height>r2.y;}
function updateCollectibles(){if(gameOver||zoneCleared)return;for(let i=planktonItems.length-1;i>=0;i--){if(checkCollision(player,planktonItems[i])){score++;planktonItems.splice(i,1);audioManager.playSound('sfxCollect');if(planktonItems.length===0){zoneCleared=true;}}}}
function drawScore(){ctx.fillStyle='black';ctx.font='20px Arial';ctx.fillText('Score: '+score,10,25);ctx.fillText(`Zone: ${getCurrentZone().name}`,10,50);}
function drawPlayer(){
    const pS = player.pixelSize;
    // New sprite definition for a more dolphin-like appearance
    const sPB = [
        // Body
        [2, 1, 5, 1, player.colorHighlight], // Top highlight
        [1, 2, 6, 2, player.color1],         // Main body middle section
        [2, 4, 5, 1, player.color2],         // Bottom shadow/curve

        // Dorsal Fin
        [4, 0, 1, 1, player.color1],
        [3, 1, 1, 1, player.color1],

        // Tail Fin
        [0, 2, 1, 1, player.color1],
        [0, 3, 1, 1, player.color1],
        [7, 1, 1, 1, player.colorHighlight],
        [7, 2, 1, 2, player.color1],
        [7, 4, 1, 1, player.color2],

        // Eye
        [6, 1, 1, 1, 'white'],
        [5, 1, 1, 1, 'black']
    ];

    sPB.forEach(b => {
        let aC;
        // Correctly assign actual color from player object or direct string
        if (b[4] === player.color1) aC = player.color1;
        else if (b[4] === player.color2) aC = player.color2;
        else if (b[4] === player.colorHighlight) aC = player.colorHighlight; // Added for highlight
        else aC = b[4]; // For 'white', 'black', etc.

        if (player.invulnerableTimer > 0 && (player.invulnerableTimer % 30 < 15)) {
            // Flash effect: if original color was one of player's main colors, flash white.
            // If it was black (like eye pupil), flash grey. Other colors (like highlight) remain.
            if (b[4] === player.color1 || b[4] === player.color2) aC = 'white';
            else if (b[4] === 'black') aC = 'grey';
            // player.colorHighlight will not flash to white/grey, which is fine.
        }
        ctx.fillStyle = aC;
        ctx.fillRect(player.x + b[0] * pS, player.y + b[1] * pS, b[2] * pS, b[3] * pS);
    });
}
function updatePlayer(){if(gameOver){if(keysPressed.Enter)startGameAndRunLoop();return;}updatePlayerInvulnerability();if(keysPressed.KeyH){playerTakeDamage(1);keysPressed.KeyH=false;}let pX=player.x;player.dx=0;player.dy=0;if(keysPressed.ArrowLeft)player.dx=-player.speed;if(keysPressed.ArrowRight)player.dx=player.speed;if(keysPressed.ArrowUp)player.dy=-player.speed;if(keysPressed.ArrowDown)player.dy=player.speed;player.x+=player.dx;player.y+=player.dy;if(player.y<0)player.y=0;if(player.y+player.height>CANVAS_HEIGHT)player.y=CANVAS_HEIGHT-player.height;if(zoneCleared){if(player.x+player.width>CANVAS_WIDTH&&pX+player.width<=CANVAS_WIDTH){currentZoneIndex=(currentZoneIndex+1)%zones.length;player.x=5;initEntitiesForZone();}else if(player.x<0&&pX>=0){currentZoneIndex=(currentZoneIndex-1+zones.length)%zones.length;player.x=CANVAS_WIDTH-player.width-5;initEntitiesForZone();}else{if(player.x<0)player.x=0;if(player.x+player.width>CANVAS_WIDTH)player.x=CANVAS_WIDTH-player.width;}}else{if(player.x<0)player.x=0;if(player.x+player.width>CANVAS_WIDTH)player.x=CANVAS_WIDTH-player.width;}}
function drawGameMessages(){if(zoneCleared&&!gameOver){ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(0,CANVAS_HEIGHT/3,CANVAS_WIDTH,CANVAS_HEIGHT/3);ctx.font='bold 30px Arial';ctx.fillStyle='white';ctx.textAlign='center';ctx.fillText(`${getCurrentZone().name} Cleared!`,CANVAS_WIDTH/2,CANVAS_HEIGHT/2-10);ctx.font='20px Arial';ctx.fillText('Move to edge for next zone.',CANVAS_WIDTH/2,CANVAS_HEIGHT/2+30);ctx.textAlign='left';}else if(gameOver){ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(0,CANVAS_HEIGHT/3,CANVAS_WIDTH,CANVAS_HEIGHT/3);ctx.font='bold 40px Arial';ctx.fillStyle='red';ctx.textAlign='center';ctx.fillText('GAME OVER',CANVAS_WIDTH/2,CANVAS_HEIGHT/2-10);ctx.font='20px Arial';ctx.fillText('Press Enter to Restart',CANVAS_WIDTH/2,CANVAS_HEIGHT/2+30);ctx.textAlign='left';}}
function clearCanvas(){const z=getCurrentZone();ctx.fillStyle=z.backgroundColor;ctx.fillRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);}
let score=0;let gameOver=false;let zoneCleared=false;let gameLoopId=null;
async function preloadGameAudio(){if(!audioManager.audioInitialized){await audioManager.initAudio();}if(!audioManager.audioInitialized){return;}await audioManager.loadSound('musicReef','sounds/music_reef.mp3',!0);await audioManager.loadSound('musicKelp','sounds/music_kelp.mp3',!0);await audioManager.loadSound('musicOcean','sounds/music_ocean.mp3',!0);await audioManager.loadSound('sfxCollect','sounds/sfx_collect.mp3',!1);await audioManager.loadSound('sfxPlayerHurt','sounds/sfx_player_hurt.mp3',!1);await audioManager.loadSound('sfxEnemyHit','sounds/sfx_enemy_hit.mp3',!1);await audioManager.loadSound('sfxEnemyDestroy','sounds/sfx_enemy_destroy.mp3',!1);/* await audioManager.loadSound('sfxSealCharge', 'sounds/sfx_seal_charge.mp3', false); */ console.log("Audio preloading attempted.");}
function mainGameLoop(){clearCanvas();updateParallaxBackgrounds();drawParallaxBackgrounds();drawZoneStaticElements();if(gameOver){updatePlayer();}else{updatePlayer();updateEnemies();if(!zoneCleared){updateCollectibles();}}drawPlankton();drawEnemies();drawPlayer();drawScore();drawPlayerHealth();drawGameMessages();gameLoopId=requestAnimationFrame(mainGameLoop);}
async function startGameAndRunLoop(){console.log('Starting/restarting game...');currentZoneIndex=0;gameOver=!1;zoneCleared=!1;score=0;player.health=player.maxHealth;player.invulnerableTimer=0;player.x=50;player.y=CANVAS_HEIGHT/2-player.height/2;for(let key in keysPressed)keysPressed[key]=!1;if(!gameLoopId){zones.forEach(zone=>{if(zone.parallaxLayers){zone.parallaxLayers.forEach(layer=>layer.x=0);}});if(!audioManager.audioInitialized)await audioManager.initAudio();await preloadGameAudio();console.log("Starting main game loop.");mainGameLoop();}initEntitiesForZone();console.log("Game state reset.");}
startGameAndRunLoop();


