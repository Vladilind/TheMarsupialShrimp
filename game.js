// Get the canvas element and its 2D rendering context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Define canvas dimensions
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 400;

canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;
ctx.imageSmoothingEnabled = false;

// Player properties
const player = {
    x: 50,
    y: CANVAS_HEIGHT / 2 - 12, // Adjusted for height: 24
    width: 32,
    height: 24,
    color1: '#FF7F50',
    color2: '#FF6347',
    speed: 4,
    dx: 0,
    dy: 0,
    pixelSize: 4
};

// Keyboard input state
const keysPressed = {
    ArrowLeft: false, ArrowRight: false, ArrowUp: false, ArrowDown: false,
    Enter: false // For restarting
};

document.addEventListener('keydown', function(e) {
    if (keysPressed.hasOwnProperty(e.key)) {
        e.preventDefault();
        keysPressed[e.key] = true;
    }
});

document.addEventListener('keyup', function(e) {
    if (keysPressed.hasOwnProperty(e.key)) {
        keysPressed[e.key] = false;
    }
});

let score = 0;
const planktonItems = [];
const PLANKTON_SIZE = 10;
const PLANKTON_COLOR = 'lightgreen';
const INITIAL_PLANKTON_COUNT = 10; // Target score for winning

// --- New Game State Variable ---
let gameOver = false;
let gameWon = false;

function spawnPlankton() {
    const plankton = {
        x: Math.random() * (CANVAS_WIDTH - PLANKTON_SIZE),
        y: Math.random() * (CANVAS_HEIGHT - PLANKTON_SIZE),
        width: PLANKTON_SIZE,
        height: PLANKTON_SIZE,
        color: PLANKTON_COLOR
    };
    planktonItems.push(plankton);
}

function initPlankton() {
    planktonItems.length = 0;
    for (let i = 0; i < INITIAL_PLANKTON_COUNT; i++) {
        spawnPlankton();
    }
}

function drawPlankton() {
    planktonItems.forEach(item => {
        ctx.fillStyle = item.color;
        ctx.fillRect(item.x, item.y, item.width, item.height);
    });
}

function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

function updateCollectibles() {
    if (gameOver) return; // Don't collect if game is over

    for (let i = planktonItems.length - 1; i >= 0; i--) {
        if (checkCollision(player, planktonItems[i])) {
            score++;
            planktonItems.splice(i, 1);
            console.log('Plankton collected! Score:', score);

            // --- Check for Win Condition ---
            if (planktonItems.length === 0) { // Or check `score === INITIAL_PLANKTON_COUNT`
                console.log('All plankton collected! You Win!');
                gameOver = true;
                gameWon = true;
            }
        }
    }
}

function drawScore() {
    ctx.fillStyle = 'black';
    ctx.font = '20px Arial';
    ctx.fillText('Score: ' + score, 10, 25);
}

function drawPlayer() {
    const pSize = player.pixelSize;
    const shrimpPixelBlocks = [
        [2, 1, 4, 3, player.color1], [1, 2, 1, 2, player.color1],
        [6, 2, 1, 2, player.color1], [3, 4, 2, 1, player.color2],
        [2, 5, 1, 1, player.color2], [5, 5, 1, 1, player.color2],
        [3, 0, 1, 1, 'white'], [4, 0, 1, 1, 'black'], // Left eye: sclera, pupil
        [5, 0, 1, 1, 'white'], [6, 0, 1, 1, 'black'], // Right eye: sclera, pupil
    ];
    shrimpPixelBlocks.forEach(blockData => {
        let color;
        if (blockData[4] === player.color1) color = player.color1;
        else if (blockData[4] === player.color2) color = player.color2;
        else color = blockData[4]; // Direct color string

        ctx.fillStyle = color;
        ctx.fillRect(
            player.x + blockData[0] * pSize,
            player.y + blockData[1] * pSize,
            blockData[2] * pSize,
            blockData[3] * pSize
        );
    });
}

function updatePlayer() {
    // If game is over and won, check for Enter key to restart
    if (gameOver && gameWon && keysPressed.Enter) {
        startGameAndRunLoop(); // Changed from startGame() to the new main function
        return;
    }
    // If game is over (for any reason, win or potential future loss), stop player movement.
    if (gameOver) return;


    player.dx = 0;
    player.dy = 0;
    if (keysPressed.ArrowLeft) player.dx = -player.speed;
    if (keysPressed.ArrowRight) player.dx = player.speed;
    if (keysPressed.ArrowUp) player.dy = -player.speed;
    if (keysPressed.ArrowDown) player.dy = player.speed;

    player.x += player.dx;
    player.y += player.dy;

    if (player.x < 0) player.x = 0;
    if (player.x + player.width > CANVAS_WIDTH) player.x = CANVAS_WIDTH - player.width;
    if (player.y < 0) player.y = 0;
    if (player.y + player.height > CANVAS_HEIGHT) player.y = CANVAS_HEIGHT - player.height;
}

// --- New: Function to display win/game over messages ---
function drawGameMessages() {
    if (gameOver && gameWon) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, CANVAS_HEIGHT / 3, CANVAS_WIDTH, CANVAS_HEIGHT / 3);

        ctx.font = 'bold 40px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText('YOU WIN!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 10);
        ctx.font = '20px Arial';
        ctx.fillText('Press Enter to Play Again', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);
        ctx.textAlign = 'left'; // Reset alignment
    }
    // Could add other game over messages here if we had a lose condition
}

function clearCanvas() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

let gameLoopId = null; // To manage the animation frame

// New gameLoop structure
function mainGameLoop() {
    clearCanvas();

    if (!gameOver) {
        updatePlayer(); // Player movement logic
        updateCollectibles(); // Plankton collection and win check
    } else {
        // If game is over, player movement is halted by updatePlayer().
        // We still need to check for restart key press.
        updatePlayer(); // This will handle the Enter key for restart if game is won
    }
    
    drawPlayer();
    drawPlankton();
    drawScore();
    drawGameMessages();

    gameLoopId = requestAnimationFrame(mainGameLoop); // Keep the loop going
}


// startGame now only resets state and ensures the loop is started if not already
function startGameAndRunLoop() {
    console.log('Game starting/restarting...');
    gameOver = false;
    gameWon = false;
    score = 0;
    player.x = 50;
    player.y = CANVAS_HEIGHT / 2 - player.height / 2;
    
    // Clear any lingering key presses from previous game over screen
    for (let key in keysPressed) {
        keysPressed[key] = false;
    }
    initPlankton();
    
    if (!gameLoopId) { // Start the loop only if it's not already running
        console.log("Starting main game loop for the first time.");
        mainGameLoop();
    } else {
        console.log("Game state reset. Loop is already running.");
        // The loop continues with the new state. No need to cancel/restart the RAF.
    }
}

// Initial call to setup and start the game
console.log('Game loaded. Use arrow keys. Collect plankton. Press Enter to start/restart if game over.');
startGameAndRunLoop();
