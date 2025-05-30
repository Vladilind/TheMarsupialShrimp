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
    { name: "Coral Reef", backgroundColor: '#70c5ce', planktonColor: 'lightgreen', initialPlanktonCount: 3, staticElements: [], parallaxLayers: [], enemyTypes: [{ type: 'chasingFish', count: 1 }], musicTrackName: 'musicReef' }, // Simplified for testing seal
    { name: "Kelp Forest", backgroundColor: '#2E8B57', planktonColor: '#FFD700', initialPlanktonCount: 2, staticElements: [], parallaxLayers: [], enemyTypes: [{ type: 'stealthyOctopus', count: 1 }], musicTrackName: 'musicKelp' },
    { name: "Open Ocean", backgroundColor: '#4682B4', planktonColor: '#E0FFFF', initialPlanktonCount: 1, staticElements: [], parallaxLayers: [], enemyTypes: [{ type: 'grasailSeal', count: 1 }], musicTrackName: 'musicOcean' } // Seal in Open Ocean
];
let currentZoneIndex = 0;
const BASE_PARALLAX_SCROLL_SPEED = 0.5;

const player = { /* ... existing player object ... */
    x: 50, y: CANVAS_HEIGHT / 2 - 12, width: 32, height: 24, color1: '#FF7F50', color2: '#FF6347', speed: 4, dx: 0, dy: 0, pixelSize: 4, health: 3, maxHealth: 3, invulnerableTimer: 0, invulnerabilityDuration: 120
};

// --- ENEMY_TYPES Definition ---
const ENEMY_TYPES = {
    chasingFish: { baseWidth: 7, baseHeight: 5, color: 'teal', speed: 1.5, damage: 1, health: 1, sprite: [{x:0,y:1,w:6,h:3,c:'teal'},{x:6,y:0,w:1,h:5,c:'darkcyan'},{x:1,y:0,w:1,h:1,c:'white'},{x:1.25,y:0.25,w:0.5,h:0.5,c:'black'}], pixelSize: 3 },
    stealthyOctopus: { baseWidth: 6, baseHeight: 6, color: '#8A2BE2', speed: 1, dashSpeed: 5, damage: 1, health: 2, detectionRadius: 150, revealDuration: 30, dashDuration: 20, cooldownDuration: 180, spriteHiding: [{x:0,y:2,w:6,h:4,c:'#4B0082'},{x:1,y:1,w:1,h:1,c:'#2F4F4F'},{x:4,y:1,w:1,h:1,c:'#2F4F4F'}], spriteRevealed: [{x:0,y:2,w:6,h:4,c:'#8A2BE2'},{x:1,y:0,w:1,h:2,c:'white'},{x:4,y:0,w:1,h:2,c:'white'},{x:1.25,y:0.5,w:0.5,h:1,c:'black'},{x:4.25,y:0.5,w:0.5,h:1,c:'black'}], pixelSize: 4 },
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
        spritePatrol: [ // A simple, somewhat rounded grey shape
            {x:0,y:2,w:12,h:4,c:'#808080'}, // Main body (Gray)
            {x:1,y:1,w:10,h:6,c:'#A9A9A9'}, // Lighter Gray inner body
            {x:10,y:3,w:2,h:2,c:'#696969'}, // Tail fin (DimGray)
            {x:1,y:0,w:2,h:1,c:'black'}, // Eye (simple)
        ],
        spriteTelegraph: [ // e.g. rears back, mouth open, eyes wider
            {x:0,y:1,w:12,h:5,c:'#778899'}, // Body slightly up (LightSlateGray)
            {x:1,y:0,w:10,h:7,c:'#B0C4DE'}, // Inner body (LightSteelBlue)
            {x:10,y:2,w:2,h:3,c:'#696969'}, // Tail fin
            {x:0,y:2,w:3,h:1,c:'white'}, // Mouth open (white part)
            {x:1,y:0,w:2,h:2,c:'red'},   // Eye (angry red)
        ],
        // Charge sprite could be more streamlined or same as patrol
        spriteCharge: [
            {x:0,y:2,w:12,h:3,c:'#696969'}, // Streamlined body (DimGray)
            {x:1,y:1,w:10,h:4,c:'#A9A9A9'}, // Inner
            {x:11,y:2,w:2,h:2,c:'#696969'}, // Tail fin extended
            {x:1,y:0,w:2,h:1,c:'yellow'}, // Eye (focused yellow)
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
    }
    enemies.push(enemy);
}

function drawEnemies() {
    enemies.forEach(enemy => {
        const pSize = enemy.pixelSize;
        let spriteToUse;
        if (enemy.type === 'stealthyOctopus') {
            spriteToUse = (enemy.aiState === 'hiding' || enemy.aiState === 'cooldown') ? enemy.spriteHiding : enemy.spriteRevealed;
        } else if (enemy.type === 'grasailSeal') {
            if (enemy.aiState === 'telegraph') spriteToUse = enemy.spriteTelegraph;
            else if (enemy.aiState === 'dashing') spriteToUse = enemy.spriteCharge;
            else spriteToUse = enemy.spritePatrol; // Includes patrol and cooldown
        } else { // Default for chasingFish or others
            spriteToUse = enemy.sprite;
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
    });
}

function updateEnemies() {
    if (gameOver) return;
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        const typeTemplate = ENEMY_TYPES[enemy.type];

        if (enemy.type === 'chasingFish') { /* ... existing fish AI ... */
            enemy.x+=enemy.dx;if(enemy.x<=0||enemy.x+enemy.width>=CANVAS_WIDTH){enemy.dx*=-1;enemy.x=Math.max(0,Math.min(enemy.x,CANVAS_WIDTH-enemy.width));}
            const vAT=50;if(Math.abs(player.y+player.height/2-(enemy.y+enemy.height/2))<vAT){if(player.x<enemy.x)enemy.dx=-typeTemplate.speed;else enemy.dx=typeTemplate.speed;}else{enemy.dx=Math.sign(enemy.dx)*typeTemplate.speed;}
        } else if (enemy.type === 'stealthyOctopus') { /* ... existing octopus AI ... */
            enemy.aiTimer--;const dTP=Math.sqrt(Math.pow(player.x-enemy.x,2)+Math.pow(player.y-enemy.y,2));
            if(enemy.aiState==='hiding'){if(dTP<enemy.detectionRadius){enemy.aiState='revealing';enemy.aiTimer=enemy.revealDuration;}}
            else if(enemy.aiState==='revealing'){if(enemy.aiTimer<=0){enemy.aiState='dashing';enemy.aiTimer=enemy.dashDuration;enemy.dashTargetX=player.x;enemy.dashTargetY=player.y;const angle=Math.atan2(enemy.dashTargetY-(enemy.y+enemy.height/2),enemy.dashTargetX-(enemy.x+enemy.width/2));enemy.dx=Math.cos(angle)*enemy.dashSpeed;enemy.dy=Math.sin(angle)*enemy.dashSpeed;}}
            else if(enemy.aiState==='dashing'){enemy.x+=enemy.dx;enemy.y+=enemy.dy;enemy.x=Math.max(-enemy.width/2,Math.min(enemy.x,CANVAS_WIDTH-enemy.width/2));enemy.y=Math.max(-enemy.height/2,Math.min(enemy.y,CANVAS_HEIGHT-enemy.height/2));if(enemy.aiTimer<=0){enemy.aiState='cooldown';enemy.aiTimer=enemy.cooldownDuration;enemy.dx=0;enemy.dy=0;}}
            else if(enemy.aiState==='cooldown'){if(enemy.aiTimer<=0){enemy.aiState='hiding';}}
        } else if (enemy.type === 'grasailSeal') {
            enemy.aiTimer--;
            if (enemy.aiState === 'patrol') {
                enemy.x += enemy.dx;
                if (enemy.x <= 0 || enemy.x + enemy.width >= CANVAS_WIDTH) {
                    enemy.dx *= -1;
                    enemy.facingRight = !enemy.facingRight;
                    enemy.x = Math.max(0, Math.min(enemy.x, CANVAS_WIDTH - enemy.width));
                }
                // Detection logic: simplified cone/rectangle in front
                const detectionYMin = enemy.y + enemy.height/2 - typeTemplate.detectionHeight/2;
                const detectionYMax = enemy.y + enemy.height/2 + typeTemplate.detectionHeight/2;
                const playerCenterY = player.y + player.height/2;

                if (playerCenterY > detectionYMin && playerCenterY < detectionYMax) { // Player is vertically aligned
                    if (enemy.facingRight && player.x > enemy.x && player.x < enemy.x + typeTemplate.detectionRange) {
                        enemy.aiState = 'telegraph'; enemy.aiTimer = typeTemplate.telegraphDuration; enemy.dx = 0;
                    } else if (!enemy.facingRight && player.x < enemy.x && player.x > enemy.x - typeTemplate.detectionRange) {
                        enemy.aiState = 'telegraph'; enemy.aiTimer = typeTemplate.telegraphDuration; enemy.dx = 0;
                    }
                }
            } else if (enemy.aiState === 'telegraph') {
                if (enemy.aiTimer <= 0) {
                    enemy.aiState = 'dashing'; enemy.aiTimer = typeTemplate.chargeDuration;
                    // Charge towards player's last known general direction (simplified)
                    enemy.dx = (enemy.facingRight ? 1 : -1) * typeTemplate.chargeSpeed;
                    // audioManager.playSound('sfxSealCharge');
                }
            } else if (enemy.aiState === 'dashing') {
                enemy.x += enemy.dx;
                if (enemy.aiTimer <= 0 || enemy.x <= 0 || enemy.x + enemy.width >= CANVAS_WIDTH) { // Stop dash on timer or wall hit
                    enemy.aiState = 'cooldown'; enemy.aiTimer = typeTemplate.cooldownDuration;
                    enemy.dx = 0; // Stop horizontal movement
                    enemy.x = Math.max(0, Math.min(enemy.x, CANVAS_WIDTH - enemy.width)); // Clamp position
                }
            } else if (enemy.aiState === 'cooldown') {
                if (enemy.aiTimer <= 0) {
                    enemy.aiState = 'patrol';
                    enemy.facingRight = Math.random() < 0.5; // Optionally randomize new patrol direction
                    enemy.dx = typeTemplate.patrolSpeed * (enemy.facingRight ? 1 : -1);
                }
            }
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
function drawPlayer(){const pS=player.pixelSize;const sPB=[[2,1,4,3,player.color1],[1,2,1,2,player.color1],[6,2,1,2,player.color1],[3,4,2,1,player.color2],[2,5,1,1,player.color2],[5,5,1,1,player.color2],[3,0,1,1,'white'],[4,0,1,1,'black'],[5,0,1,1,'white'],[6,0,1,1,'black']];sPB.forEach(b=>{let aC;if(b[4]===player.color1)aC=player.color1;else if(b[4]===player.color2)aC=player.color2;else aC=b[4];if(player.invulnerableTimer>0&&(player.invulnerableTimer%30<15)){if(b[4]===player.color1||b[4]===player.color2)aC='white';else if(b[4]==='black')aC='grey';}ctx.fillStyle=aC;ctx.fillRect(player.x+b[0]*pS,player.y+b[1]*pS,b[2]*pS,b[3]*pS);});}
function updatePlayer(){if(gameOver){if(keysPressed.Enter)startGameAndRunLoop();return;}updatePlayerInvulnerability();if(keysPressed.KeyH){playerTakeDamage(1);keysPressed.KeyH=false;}let pX=player.x;player.dx=0;player.dy=0;if(keysPressed.ArrowLeft)player.dx=-player.speed;if(keysPressed.ArrowRight)player.dx=player.speed;if(keysPressed.ArrowUp)player.dy=-player.speed;if(keysPressed.ArrowDown)player.dy=player.speed;player.x+=player.dx;player.y+=player.dy;if(player.y<0)player.y=0;if(player.y+player.height>CANVAS_HEIGHT)player.y=CANVAS_HEIGHT-player.height;if(zoneCleared){if(player.x+player.width>CANVAS_WIDTH&&pX+player.width<=CANVAS_WIDTH){currentZoneIndex=(currentZoneIndex+1)%zones.length;player.x=5;initEntitiesForZone();}else if(player.x<0&&pX>=0){currentZoneIndex=(currentZoneIndex-1+zones.length)%zones.length;player.x=CANVAS_WIDTH-player.width-5;initEntitiesForZone();}else{if(player.x<0)player.x=0;if(player.x+player.width>CANVAS_WIDTH)player.x=CANVAS_WIDTH-player.width;}}else{if(player.x<0)player.x=0;if(player.x+player.width>CANVAS_WIDTH)player.x=CANVAS_WIDTH-player.width;}}
function drawGameMessages(){if(zoneCleared&&!gameOver){ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(0,CANVAS_HEIGHT/3,CANVAS_WIDTH,CANVAS_HEIGHT/3);ctx.font='bold 30px Arial';ctx.fillStyle='white';ctx.textAlign='center';ctx.fillText(`${getCurrentZone().name} Cleared!`,CANVAS_WIDTH/2,CANVAS_HEIGHT/2-10);ctx.font='20px Arial';ctx.fillText('Move to edge for next zone.',CANVAS_WIDTH/2,CANVAS_HEIGHT/2+30);ctx.textAlign='left';}else if(gameOver){ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(0,CANVAS_HEIGHT/3,CANVAS_WIDTH,CANVAS_HEIGHT/3);ctx.font='bold 40px Arial';ctx.fillStyle='red';ctx.textAlign='center';ctx.fillText('GAME OVER',CANVAS_WIDTH/2,CANVAS_HEIGHT/2-10);ctx.font='20px Arial';ctx.fillText('Press Enter to Restart',CANVAS_WIDTH/2,CANVAS_HEIGHT/2+30);ctx.textAlign='left';}}
function clearCanvas(){const z=getCurrentZone();ctx.fillStyle=z.backgroundColor;ctx.fillRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);}
let score=0;let gameOver=false;let zoneCleared=false;let gameLoopId=null;
async function preloadGameAudio(){if(!audioManager.audioInitialized){await audioManager.initAudio();}if(!audioManager.audioInitialized){return;}await audioManager.loadSound('musicReef','sounds/music_reef.mp3',!0);await audioManager.loadSound('musicKelp','sounds/music_kelp.mp3',!0);await audioManager.loadSound('musicOcean','sounds/music_ocean.mp3',!0);await audioManager.loadSound('sfxCollect','sounds/sfx_collect.mp3',!1);await audioManager.loadSound('sfxPlayerHurt','sounds/sfx_player_hurt.mp3',!1);await audioManager.loadSound('sfxEnemyHit','sounds/sfx_enemy_hit.mp3',!1);await audioManager.loadSound('sfxEnemyDestroy','sounds/sfx_enemy_destroy.mp3',!1);/* await audioManager.loadSound('sfxSealCharge', 'sounds/sfx_seal_charge.mp3', false); */ console.log("Audio preloading attempted.");}
function mainGameLoop(){clearCanvas();updateParallaxBackgrounds();drawParallaxBackgrounds();drawZoneStaticElements();if(gameOver){updatePlayer();}else{updatePlayer();updateEnemies();if(!zoneCleared){updateCollectibles();}}drawPlankton();drawEnemies();drawPlayer();drawScore();drawPlayerHealth();drawGameMessages();gameLoopId=requestAnimationFrame(mainGameLoop);}
async function startGameAndRunLoop(){console.log('Starting/restarting game...');currentZoneIndex=0;gameOver=!1;zoneCleared=!1;score=0;player.health=player.maxHealth;player.invulnerableTimer=0;player.x=50;player.y=CANVAS_HEIGHT/2-player.height/2;for(let key in keysPressed)keysPressed[key]=!1;if(!gameLoopId){zones.forEach(zone=>{if(zone.parallaxLayers){zone.parallaxLayers.forEach(layer=>layer.x=0);}});if(!audioManager.audioInitialized)await audioManager.initAudio();await preloadGameAudio();console.log("Starting main game loop.");mainGameLoop();}initEntitiesForZone();console.log("Game state reset.");}
startGameAndRunLoop();


