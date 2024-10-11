// Define constants for the game grid size
const ROWS = 20;
const COLS = 12;
const BLOCK_SIZE = 20;

// Get DOM elements for the game canvas and sounds
const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
const lineClearSound = document.getElementById('line-clear-sound');
const gameOverSound = document.getElementById('game-over-sound');
const backgroundMusic = document.getElementById('background-music');
const pauseMenu = document.getElementById('pause-menu');
const overlay = document.getElementById('overlay');

// Define the shapes (tetrominoes) and their colors
const SHAPES = [
    [[1, 1, 1, 1]],            // I shape
    [[1, 1], [1, 1]],           // O shape
    [[1, 1, 1], [0, 1, 0]],     // T shape
    [[1, 1, 1], [1, 0, 0]],     // L shape
    [[1, 1, 1], [0, 0, 1]],     // J shape
    [[1, 1, 0], [0, 1, 1]],     // Z shape
    [[0, 1, 1], [1, 1, 0]],     // S shape
    [[1, 1, 1, 1, 1]]           // Pentomino shape
];

const COLORS = [
    '#00FFFF', '#FFFF00', '#800080', '#FF0000', '#0000FF', '#00FF00', '#FFA500', '#FF00FF'
];

// Initialize the game variables
let board = createBoard(); // Create an empty board
let score = 0;
let level = 1;
let linesClearedTotal = 0;
let highScore = localStorage.getItem('highScore') || 0; // Retrieve high score from local storage
document.getElementById('high-score').textContent = `High Score: ${highScore}`; // Display the high score

// Variables for game timing and state
let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let currentPiece; // The currently active tetromino
let nextPiece = createPiece(); // The next tetromino to display
let gameLoop;
let isPaused = false;
let gameStartTime;
let gameMode = 'normal'; // Can be 'normal', 'marathon', or 'time-attack'
let marathonTimeLimit = 600; // Marathon time limit in seconds (10 minutes)

// Function to format time in MM:SS format
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Update the countdown timer during Marathon mode
function updateMarathonTimer() {
    const timePlayed = Math.floor((Date.now() - gameStartTime) / 1000);
    const timeLeft = marathonTimeLimit - timePlayed;
    
    // If time is up, end the game
    if (timeLeft <= 0) {
        gameOver();
        return;
    }

    // Update the timer display
    document.getElementById('timer').textContent = `Time Left: ${formatTime(timeLeft)}`;
}

// Variables for touch gestures
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;

// Pause button (initially hidden)
const pauseButton = document.getElementById('pause-button');
pauseButton.style.display = 'none'; // Hide pause button at the beginning

// Touch event listeners for mobile controls
canvas.addEventListener('touchstart', event => {
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
});

canvas.addEventListener('touchmove', event => {
    touchEndX = event.touches[0].clientX;
    touchEndY = event.touches[0].clientY;
});

// Detect touch end to determine gesture direction (swipes)
canvas.addEventListener('touchend', () => {
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe detection
        if (deltaX > 30 && !collision(currentPiece.x + 1, currentPiece.y, currentPiece)) {
            // Swipe right
            currentPiece.x++;
        } else if (deltaX < -30 && !collision(currentPiece.x - 1, currentPiece.y, currentPiece)) {
            // Swipe left
            currentPiece.x--;
        }
    } else if (Math.abs(deltaY) > Math.abs(deltaX)) {
        // Vertical swipe detection
        if (deltaY > 30 && !collision(currentPiece.x, currentPiece.y + 1, currentPiece)) {
            // Swipe down (faster drop)
            currentPiece.y++;
        }
    } else {
        // Tap to rotate the piece
        rotate(currentPiece);
    }

    // Redraw the board and pieces after the gesture
    context.clearRect(0, 0, canvas.width, canvas.height);
    drawBoard();
    drawGhostPiece();
    drawPiece();
});

// Prevent touch scrolling on mobile devices
canvas.addEventListener('touchmove', event => {
    event.preventDefault();
}, { passive: false });

// Create the game board (matrix of zeros)
function createBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

// Draw the board by filling the cells based on their values
function drawBoard() {
    board.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                context.fillStyle = COLORS[value - 1];
                context.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                context.strokeStyle = '#000';
                context.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
            }
        });
    });
}

// Draw the current piece on the canvas
function drawPiece() {
    currentPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                context.fillStyle = COLORS[currentPiece.color];
                context.fillRect((currentPiece.x + x) * BLOCK_SIZE, (currentPiece.y + y) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                context.strokeStyle = '#000';
                context.strokeRect((currentPiece.x + x) * BLOCK_SIZE, (currentPiece.y + y) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
            }
        });
    });
}

// Draw the "ghost" piece (showing where it would land)
function drawGhostPiece() {
    let ghostY = currentPiece.y;
    while (!collision(currentPiece.x, ghostY + 1, currentPiece)) {
        ghostY++;
    }
    currentPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                context.fillStyle = 'rgba(0, 0, 0, 0.3)';
                context.fillRect((currentPiece.x + x) * BLOCK_SIZE, (ghostY + y) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                context.strokeStyle = '#000';
                context.strokeRect((currentPiece.x + x) * BLOCK_SIZE, (ghostY + y) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
            }
        });
    });
}

// Draw the next piece in the small preview canvas
function drawNextPiece() {
    const nextContext = document.getElementById('next').getContext('2d');
    nextContext.clearRect(0, 0, nextContext.canvas.width, nextContext.canvas.height);
    nextPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                nextContext.fillStyle = COLORS[nextPiece.color];
                nextContext.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                nextContext.strokeStyle = '#000';
                nextContext.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
            }
        });
    });
}

// Create a new piece (randomly chosen from SHAPES)
function createPiece() {
    const shapeIndex = Math.floor(Math.random() * SHAPES.length);
    return {
        shape: SHAPES[shapeIndex],
        color: shapeIndex,
        x: Math.floor(COLS / 2) - Math.ceil(SHAPES[shapeIndex][0].length / 2),
        y: 0
    };
}

// Check if a piece will collide with another piece or the edge of the board
function collision(x, y, piece) {
    return piece.shape.some((row, dy) => {
        return row.some((value, dx) => {
            return (
                value &&
                (board[y + dy] && board[y + dy][x + dx]) !== 0
            );
        });
    });
}

// Merge the current piece into the board (when it lands)
function merge() {
    currentPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                board[currentPiece.y + y][currentPiece.x + x] = currentPiece.color + 1;
            }
        });
    });
}

// Rotate the current piece
function rotate(piece) {
    const rotated = piece.shape[0].map((_, i) =>
        piece.shape.map(row => row[i]).reverse()
    );
    if (!collision(piece.x, piece.y, { ...piece, shape: rotated })) {
        piece.shape = rotated;
    }
}

// Animate the line being cleared from the board
function animateLineClear(y) {
    context.clearRect(0, y * BLOCK_SIZE, canvas.width, BLOCK_SIZE);
    setTimeout(() => {
        board.splice(y, 1);
        board.unshift(Array(COLS).fill(0));
    }, 200);
}

// Check and clear lines that are fully filled
function clearLines() {
    let linesCleared = 0;
    outer: for (let y = ROWS - 1; y >= 0; y--) {
        for (let x = 0; x < COLS; x++) {
            if (board[y][x] === 0) {
                continue outer;
            }
        }
        animateLineClear(y);
        linesCleared++;
    }
    if (linesCleared > 0) {
        score += linesCleared * 100;
        document.getElementById('score').textContent = `Score: ${score}`;
        linesClearedTotal += linesCleared;
        lineClearSound.play();

        if (linesClearedTotal >= 10 * level) {
            level++;
            dropInterval *= 0.9; // Increase the game speed
            document.getElementById('level').textContent = `Level: ${level}`;
        }
    }
}

// End the game and show the game over screen
function gameOver() {
    cancelAnimationFrame(gameLoop);
    context.fillStyle = 'rgba(0, 0, 0, 0.5)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#fff';
    context.font = '30px Arial';
    context.textAlign = 'center';
    context.fillText('Game Over', canvas.width / 2, canvas.height / 2);

    // Hide pause button when the game ends
    pauseButton.style.display = 'none';

    document.getElementById('start-button').style.display = 'block';
    document.getElementById('marathon-button').style.display = 'block';
    document.getElementById('time-attack-button').style.display = 'block';

    if (score > highScore) {
        highScore = score;
        localStorage.setItem('highScore', highScore);
        document.getElementById('high-score').textContent = `High Score: ${highScore}`;
    }
    gameOverSound.play();
    backgroundMusic.pause();
}

// Countdown timer for Time Attack mode
function timeAttackCountdown() {
    const timeLeft = 300 - Math.floor((Date.now() - gameStartTime) / 1000);
    if (timeLeft <= 0) {
        gameOver();
    } else {
        document.getElementById('timer').textContent = `Time Left: ${formatTime(timeLeft)}`;
    }
}

// Adjust speed over time in Marathon mode
function adjustSpeedBasedOnTime() {
    const timePlayed = Date.now() - gameStartTime;
    dropInterval = Math.max(100, 1000 - (timePlayed / 60000) * 200);
}

// Main game update loop
function update(time = 0) {
    if (isPaused) return;
    const deltaTime = time - lastTime;
    lastTime = time;
    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        if (!collision(currentPiece.x, currentPiece.y + 1, currentPiece)) {
            currentPiece.y++;
        } else {
            merge();
            clearLines();
            currentPiece = nextPiece;
            nextPiece = createPiece();
            drawNextPiece();
            if (collision(currentPiece.x, currentPiece.y, currentPiece)) {
                gameOver();
                return;
            }
        }
        dropCounter = 0;
    }
    context.clearRect(0, 0, canvas.width, canvas.height);
    drawBoard();
    drawGhostPiece();
    drawPiece();

    if (gameMode === 'time-attack') {
        timeAttackCountdown();
    } else if (gameMode === 'marathon') {
        adjustSpeedBasedOnTime();
        updateMarathonTimer(); // Update the timer for Marathon mode
    }

    gameLoop = requestAnimationFrame(update);
}

// Start the game, initialize variables, and show the pause button
function startGame(mode = 'normal') {
    board = createBoard();
    score = 0;
    level = 1;
    linesClearedTotal = 0;
    dropInterval = 1000;
    document.getElementById('score').textContent = 'Score: 0';
    document.getElementById('level').textContent = 'Level: 1';
    currentPiece = nextPiece;
    nextPiece = createPiece();
    drawNextPiece();

    pauseButton.style.display = 'block'; // Show the pause button when the game starts

    document.getElementById('start-button').style.display = 'none';
    document.getElementById('marathon-button').style.display = 'none';
    document.getElementById('time-attack-button').style.display = 'none';
    document.getElementById('timer').textContent = ''; // Clear the timer display
    lastTime = 0;
    dropCounter = 0;
    gameStartTime = Date.now();
    gameMode = mode;
    if (gameMode === 'time-attack') {
        document.getElementById('timer').textContent = 'Time Left: 05:00';
    } else {
        document.getElementById('timer').textContent = '';
    }
    backgroundMusic.play();
    update();
}

// Event listener for keyboard controls (arrows)
document.addEventListener('keydown', event => {
    if (isPaused) return;  // Do not allow movement when paused
    if (event.key === 'ArrowLeft' && !collision(currentPiece.x - 1, currentPiece.y, currentPiece)) {
        // Move left
        currentPiece.x--;
    } else if (event.key === 'ArrowRight' && !collision(currentPiece.x + 1, currentPiece.y, currentPiece)) {
        // Move right
        currentPiece.x++;
    } else if (event.key === 'ArrowDown' && !collision(currentPiece.x, currentPiece.y + 1, currentPiece)) {
        // Move down faster
        currentPiece.y++;
    } else if (event.key === 'ArrowUp') {
        // Rotate the piece
        rotate(currentPiece);
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    drawBoard();
    drawGhostPiece();
    drawPiece();
});

// Pause menu logic
document.getElementById('resume-button').addEventListener('click', () => {
    pauseMenu.style.display = 'none';
    overlay.style.display = 'none';
    isPaused = false;
    update();
});

// Exit the game from pause menu
document.getElementById('exit-button').addEventListener('click', () => {
    pauseMenu.style.display = 'none';
    overlay.style.display = 'none';
    isPaused = false;
    gameOver();  
});

// Toggle pause with 'P' key
document.addEventListener('keydown', event => {
    if (event.key === 'P' || event.key === 'p') {
        isPaused = !isPaused;
        if (isPaused) {
            pauseMenu.style.display = 'block';
            overlay.style.display = 'block';
        } else {
            pauseMenu.style.display = 'none';
            overlay.style.display = 'none';
            update();
        }
    }
});

// Pause button for mobile devices
pauseButton.addEventListener('click', () => {
    isPaused = !isPaused;
    if (isPaused) {
        pauseMenu.style.display = 'block';
        overlay.style.display = 'block';
    } else {
        pauseMenu.style.display = 'none';
        overlay.style.display = 'none';
        update();
    }
});

// Event listeners for game mode buttons
document.getElementById('start-button').addEventListener('click', () => startGame('normal'));
document.getElementById('marathon-button').addEventListener('click', () => startGame('marathon'));
document.getElementById('time-attack-button').addEventListener('click', () => startGame('time-attack'));
