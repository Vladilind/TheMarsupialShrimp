// UI related functions

// drawScore from gameSetup.js (also includes zone name)
function drawScore(ctx, score, currentZone) { // Requires ctx, score, and currentZone object
    ctx.fillStyle = 'black'; // gameSetup.js used black for score text
    ctx.font = '20px Arial';
    ctx.textAlign = 'left'; // Reset alignment just in case
    ctx.fillText('Score: ' + score, 10, 25);
    if (currentZone && currentZone.name) {
        ctx.fillText(`Zone: ${currentZone.name}`, 10, 50);
    }
}

// drawGameMessages from gameSetup.js
// Handles "Zone Cleared" and "Game Over" messages.
// zoneCleared and gameOver are booleans passed from main.js.
// currentZone is the zone object, also from main.js.
function drawGameMessages(ctx, zoneCleared, isGameOver, currentZoneName) {
    ctx.textAlign = 'center'; // Common for these messages

    if (isGameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, CANVAS_HEIGHT / 3, CANVAS_WIDTH, CANVAS_HEIGHT / 3); // Background box

        ctx.font = 'bold 40px Arial';
        ctx.fillStyle = 'red';
        ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 10);

        ctx.font = '20px Arial';
        ctx.fillStyle = 'white'; // Added for contrast on the dark box
        ctx.fillText('Press Enter to Restart', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);

    } else if (zoneCleared) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, CANVAS_HEIGHT / 3, CANVAS_WIDTH, CANVAS_HEIGHT / 3); // Background box

        ctx.font = 'bold 30px Arial';
        ctx.fillStyle = 'white';
        let zoneNameForDisplay = currentZoneName || (getCurrentZone() ? getCurrentZone().name : ""); // Fallback if not passed
        ctx.fillText(`${zoneNameForDisplay} Cleared!`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 10);

        ctx.font = '20px Arial';
        ctx.fillText('Move to edge for next zone.', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);
    }
    ctx.textAlign = 'left'; // Reset alignment
}


// The new main.js uses a different start screen and game over screen logic.
// I'll keep the new ones from the placeholder main.js for now, as they are more modular.
// The drawGameOverScreen here is essentially merged into drawGameMessages.
// The setGameMessage for timed messages is a good feature from the placeholder ui.js,
// but gameSetup.js didn't use it. I'll comment it out for now to stick to gameSetup.js functionality.

/*
let gameMessage = "";
let gameMessageDisplayTime = 0;
const GAME_MESSAGE_DURATION = 3000; // milliseconds

function setGameMessage(message) {
    gameMessage = message;
    gameMessageDisplayTime = Date.now();
}

function drawTimedGameMessages(ctx) { // Requires ctx from main.js
    if (gameMessage) {
        const elapsedTime = Date.now() - gameMessageDisplayTime;
        if (elapsedTime < GAME_MESSAGE_DURATION) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.font = '30px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(gameMessage, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
            ctx.textAlign = 'left'; // Reset alignment
        } else {
            gameMessage = ""; // Clear message after duration
        }
    }
}

function drawGameOverScreen(ctx, score) { // From placeholder ui.js
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = 'white';
    ctx.font = '50px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 50);

    ctx.font = '20px Arial';
    ctx.fillText(`Final Score: ${score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    ctx.fillText('Press R or Enter to Restart', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 50);
    ctx.textAlign = 'left';
}

function drawStartScreen(ctx) { // From placeholder ui.js
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = 'white';
    ctx.font = '40px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Underwater Adventure', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60);

    ctx.font = '20px Arial';
    ctx.fillText('Press ENTER to Start', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);

    ctx.font = '16px Arial';
    ctx.fillText('Controls: W/A/S/D or Arrow Keys to Move', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 50);
    ctx.textAlign = 'left';
}
*/
