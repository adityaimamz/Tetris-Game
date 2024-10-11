const ROWS = 20;
const COLS = 12;
const BLOCK_SIZE = 20;

const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
const lineClearSound = document.getElementById('line-clear-sound');
const gameOverSound = document.getElementById('game-over-sound');
const backgroundMusic = document.getElementById('background-music');
const pauseMenu = document.getElementById('pause-menu');
const overlay = document.getElementById('overlay');

const SHAPES = [
    [[1, 1, 1, 1]],
    [[1, 1], [1, 1]],
    [[1, 1, 1], [0, 1, 0]],
    [[1, 1, 1], [1, 0, 0]],
    [[1, 1, 1], [0, 0, 1]],
    [[1, 1, 0], [0, 1, 1]],
    [[0, 1, 1], [1, 1, 0]],
    [[1, 1, 1, 1, 1]] // Pentomino shape
];

const COLORS = [
    '#00FFFF', '#FFFF00', '#800080', '#FF0000', '#0000FF', '#00FF00', '#FFA500', '#FF00FF'
];

let board = createBoard();
let score = 0;
let level = 1;
let linesClearedTotal = 0;
let highScore = localStorage.getItem('highScore') || 0;
document.getElementById('high-score').textContent = `High Score: ${highScore}`;

let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let currentPiece;
let nextPiece = createPiece();
let gameLoop;
let isPaused = false;
let gameStartTime;
let gameMode = 'normal'; // Could be 'normal', 'marathon', or 'time-attack'

let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;

// Detect touch start
canvas.addEventListener('touchstart', event => {
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
});

// Detect touch move
canvas.addEventListener('touchmove', event => {
    touchEndX = event.touches[0].clientX;
    touchEndY = event.touches[0].clientY;
});

// Detect touch end to determine gesture direction
canvas.addEventListener('touchend', () => {
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    // Swipe direction detection
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe
        if (deltaX > 30 && !collision(currentPiece.x + 1, currentPiece.y, currentPiece)) {
            // Swipe right
            currentPiece.x++;
        } else if (deltaX < -30 && !collision(currentPiece.x - 1, currentPiece.y, currentPiece)) {
            // Swipe left
            currentPiece.x--;
        }
    } else if (Math.abs(deltaY) > Math.abs(deltaX)) {
        // Vertical swipe
        if (deltaY > 30 && !collision(currentPiece.x, currentPiece.y + 1, currentPiece)) {
            // Swipe down for a faster drop
            currentPiece.y++;
        }
    } else {
        // Tap for rotation if no significant swipe
        rotate(currentPiece);
    }

    // Redraw the board after any touch gesture
    context.clearRect(0, 0, canvas.width, canvas.height);
    drawBoard();
    drawGhostPiece();
    drawPiece();
});

// Prevent touch scrolling
canvas.addEventListener('touchmove', event => {
    event.preventDefault();
}, { passive: false });

function createBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

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

function createPiece() {
    const shapeIndex = Math.floor(Math.random() * SHAPES.length);
    return {
        shape: SHAPES[shapeIndex],
        color: shapeIndex,
        x: Math.floor(COLS / 2) - Math.ceil(SHAPES[shapeIndex][0].length / 2),
        y: 0
    };
}

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

function merge() {
    currentPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                board[currentPiece.y + y][currentPiece.x + x] = currentPiece.color + 1;
            }
        });
    });
}

function rotate(piece) {
    const rotated = piece.shape[0].map((_, i) =>
        piece.shape.map(row => row[i]).reverse()
    );
    if (!collision(piece.x, piece.y, { ...piece, shape: rotated })) {
        piece.shape = rotated;
    }
}

function animateLineClear(y) {
    context.clearRect(0, y * BLOCK_SIZE, canvas.width, BLOCK_SIZE);
    setTimeout(() => {
        board.splice(y, 1);
        board.unshift(Array(COLS).fill(0));
    }, 200);
}

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
            dropInterval *= 0.9;
            document.getElementById('level').textContent = `Level: ${level}`;
        }
    }
}

function gameOver() {
    cancelAnimationFrame(gameLoop);
    context.fillStyle = 'rgba(0, 0, 0, 0.5)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#fff';
    context.font = '30px Arial';
    context.textAlign = 'center';
    context.fillText('Game Over', canvas.width / 2, canvas.height / 2);

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

function timeAttackCountdown() {
    const timeLeft = 300 - Math.floor((Date.now() - gameStartTime) / 1000);
    if (timeLeft <= 0) {
        gameOver();
    }
}

function adjustSpeedBasedOnTime() {
    const timePlayed = Date.now() - gameStartTime;
    dropInterval = Math.max(100, 1000 - (timePlayed / 60000) * 200);
}

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
    }

    gameLoop = requestAnimationFrame(update);
}

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
    document.getElementById('start-button').style.display = 'none';
    document.getElementById('marathon-button').style.display = 'none';
    document.getElementById('time-attack-button').style.display = 'none';
    lastTime = 0;
    dropCounter = 0;
    gameStartTime = Date.now();
    gameMode = mode;
    backgroundMusic.play();
    update();
}

// Event Listener for Keyboard Controls
document.addEventListener('keydown', event => {
    if (isPaused) return;  // Do not allow movement while paused
    if (event.key === 'ArrowLeft' && !collision(currentPiece.x - 1, currentPiece.y, currentPiece)) {
        // Move piece to the left
        currentPiece.x--;
    } else if (event.key === 'ArrowRight' && !collision(currentPiece.x + 1, currentPiece.y, currentPiece)) {
        // Move piece to the right
        currentPiece.x++;
    } else if (event.key === 'ArrowDown' && !collision(currentPiece.x, currentPiece.y + 1, currentPiece)) {
        // Move piece down faster
        currentPiece.y++;
    } else if (event.key === 'ArrowUp') {
        // Rotate the piece
        rotate(currentPiece);
    }

    // Redraw the board after any movement
    context.clearRect(0, 0, canvas.width, canvas.height);
    drawBoard();
    drawGhostPiece();
    drawPiece();
});

// Pause Menu Logic
document.getElementById('resume-button').addEventListener('click', () => {
    pauseMenu.style.display = 'none';
    overlay.style.display = 'none';
    isPaused = false;
    update();
});

document.getElementById('exit-button').addEventListener('click', () => {
    pauseMenu.style.display = 'none';
    overlay.style.display = 'none';
    isPaused = false;
    gameOver();  // End the current game and show game over screen
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

const pauseButton = document.getElementById('pause-button');

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

document.getElementById('start-button').addEventListener('click', () => startGame('normal'));
document.getElementById('marathon-button').addEventListener('click', () => startGame('marathon'));
document.getElementById('time-attack-button').addEventListener('click', () => startGame('time-attack'));

