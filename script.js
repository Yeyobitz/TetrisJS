const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
const nextPieceCanvas = document.getElementById('nextPiece');
const nextPieceContext = nextPieceCanvas.getContext('2d');
const scoreElement = document.getElementById('score');
const pauseButton = document.getElementById('pause-button');
const playButton = document.getElementById('play-button');
const optionsButton = document.getElementById('options-button');
const exitButton = document.getElementById('exit-button');
const backToMenuButton = document.getElementById('back-to-menu');
const mainMenu = document.getElementById('main-menu');
const gameArea = document.getElementById('game-area');

const holdPieceCanvas = document.getElementById('holdPiece');
const holdPieceContext = holdPieceCanvas.getContext('2d');
holdPieceContext.scale(20, 20);

const pauseOverlay = document.getElementById('pause-overlay');

context.scale(20, 20);
nextPieceContext.scale(20, 20);

const colors = [
    null,
    { fill: '#FF0D72', stroke: '#FF6BA9' },
    { fill: '#0DC2FF', stroke: '#69D9FF' },
    { fill: '#0DFF72', stroke: '#69FF9F' },
    { fill: '#F538FF', stroke: '#F87AFF' },
    { fill: '#FF8E0D', stroke: '#FFB35A' },
    { fill: '#FFE138', stroke: '#FFF27A' },
    { fill: '#3877FF', stroke: '#7AA1FF' },
];

const pieces = 'TJLOSZI';

let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
const gameHandle = {
    isPlaying: false,
    animationId: null,
};

let gameActive = false;

let holdPiece = null;
let canHold = true;

const player = {
    pos: {x: 0, y: 0},
    matrix: null,
    score: 0,
    next: null
};

const arena = createMatrix(12, 20);

function createMatrix(w, h) {
    const matrix = [];
    while (h--) {
        matrix.push(new Array(w).fill(0));
    }
    return matrix;
}

function collide(arena, player) {
    const [m, o] = [player.matrix, player.pos];
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 &&
                (arena[y + o.y] &&
                arena[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

function merge(arena, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                arena[y + player.pos.y][x + player.pos.x] = value;
            }
        });
    });
}

function rotate(matrix, dir) {
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [
                matrix[x][y],
                matrix[y][x],
            ] = [
                matrix[y][x],
                matrix[x][y],
            ];
        }
    }

    if (dir > 0) {
        matrix.forEach(row => row.reverse());
    } else {
        matrix.reverse();
    }
}

function playerDrop() {
    player.pos.y++;
    if (collide(arena, player)) {
        player.pos.y--;
        merge(arena, player);
        playerReset();
        arenaSweep();
        updateScore();
    }
    dropCounter = 0;
}

function playerMove(dir) {
    player.pos.x += dir;
    if (collide(arena, player)) {
        player.pos.x -= dir;
    }
}

function playerReset() {
    canHold = true;
    player.matrix = player.next || createPiece(pieces[pieces.length * Math.random() | 0]);
    player.next = createPiece(pieces[pieces.length * Math.random() | 0]);
    player.pos.y = 0;
    player.pos.x = (arena[0].length / 2 | 0) - (player.matrix[0].length / 2 | 0);
    if (collide(arena, player)) {
        arena.forEach(row => row.fill(0));
        player.score = 0;
        comboCount = 0;
        holdPiece = null;
        updateScore();
    }
    drawNextPiece();
    drawHoldPiece();
}

function playerRotate(dir) {
    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix, dir);
    while (collide(arena, player)) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.matrix[0].length) {
            rotate(player.matrix, -dir);
            player.pos.x = pos;
            return;
        }
    }
}

function createPiece(type) {
    if (type === 'T') {
        return [
            [0, 0, 0],
            [1, 1, 1],
            [0, 1, 0],
        ];
    } else if (type === 'O') {
        return [
            [2, 2],
            [2, 2],
        ];
    } else if (type === 'L') {
        return [
            [0, 3, 0],
            [0, 3, 0],
            [0, 3, 3],
        ];
    } else if (type === 'J') {
        return [
            [0, 4, 0],
            [0, 4, 0],
            [4, 4, 0],
        ];
    } else if (type === 'I') {
        return [
            [0, 5, 0, 0],
            [0, 5, 0, 0],
            [0, 5, 0, 0],
            [0, 5, 0, 0],
        ];
    } else if (type === 'S') {
        return [
            [0, 6, 6],
            [6, 6, 0],
            [0, 0, 0],
        ];
    } else if (type === 'Z') {
        return [
            [7, 7, 0],
            [0, 7, 7],
            [0, 0, 0],
        ];
    }
}

let comboCount = 0;
const comboDisplay = document.getElementById('combo-display');

function arenaSweep() {
    let rowCount = 0;
    let linesToRemove = [];

    outer: for (let y = arena.length - 1; y > 0; --y) {
        for (let x = 0; x < arena[y].length; ++x) {
            if (arena[y][x] === 0) {
                continue outer;
            }
        }
        linesToRemove.push(y);
        rowCount++;
    }

    if (rowCount > 0) {
        fadeOutLines(linesToRemove, () => {
            linesToRemove.forEach(y => {
                arena.splice(y, 1);
                arena.unshift(new Array(arena[0].length).fill(0));
            });
            let points;
            switch (rowCount) {
                case 1:
                    points = 100;
                    break;
                case 2:
                    points = 300;
                    break;
                case 3:
                    points = 500;
                    break;
                case 4:
                    points = 800;
                    break;
                default:
                    points = 0;
            }

            if (comboCount > 0) {
                points *= comboCount + 1;
            }

            comboCount++;

            player.score += points;

            updateScore();
        });
    } else {
        comboCount = 0;
        updateScore();
    }
}

function drawGhost() {
    const ghost = {
        pos: {...player.pos},
        matrix: player.matrix,
    };
    while (!collide(arena, ghost)) {
        ghost.pos.y++;
    }
    ghost.pos.y--;
    
    context.globalAlpha = 0.3;
    drawMatrix(ghost.matrix, ghost.pos, context);
    context.globalAlpha = 1;
}

function fadeOutLines(lines, callback) {
    let opacity = 1;
    function animate() {
        context.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        lines.forEach(y => {
            context.fillRect(0, y * 20, canvas.width, 20);
        });
        opacity -= 0.1;
        if (opacity > 0) {
            requestAnimationFrame(animate);
        } else {
            callback();
        }
    }
    animate();
}
function updateScore() {
    scoreElement.innerText = player.score;
    comboDisplay.innerText = `Combo: x${comboCount + 1}`;

}

function draw() {
    context.fillStyle = '#111';
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    context.lineWidth = 0.05;
    for (let i = 0; i <= arena[0].length; i++) {
        context.beginPath();
        context.moveTo(i, 0);
        context.lineTo(i, arena.length);
        context.stroke();
    }
    for (let i = 0; i <= arena.length; i++) {
        context.beginPath();
        context.moveTo(0, i);
        context.lineTo(arena[0].length, i);
        context.stroke();
    }
    drawGhost();
    drawMatrix(arena, {x: 0, y: 0}, context);
    drawMatrix(player.matrix, player.pos, context);
}

function drawMatrix(matrix, offset, ctx) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                ctx.fillStyle = colors[value].fill;
                ctx.fillRect(x + offset.x, y + offset.y, 1, 1);
                
                // Efecto de brillo
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 0.05;
                ctx.strokeRect(x + offset.x, y + offset.y, 1, 1);
                
                ctx.strokeStyle = colors[value].stroke;
                ctx.lineWidth = 0.1;
                ctx.strokeRect(x + offset.x, y + offset.y, 1, 1);
            }
        });
    });
}
function drawNextPiece() {
    nextPieceContext.fillStyle = '#111';
    nextPieceContext.fillRect(0, 0, 6, 6);

    nextPieceContext.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    nextPieceContext.lineWidth = 0.05;
    for (let i = 0; i <= 6; i++) {
        nextPieceContext.beginPath();
        nextPieceContext.moveTo(i, 0);
        nextPieceContext.lineTo(i, 6);
        nextPieceContext.stroke();
        nextPieceContext.beginPath();
        nextPieceContext.moveTo(0, i);
        nextPieceContext.lineTo(6, i);
        nextPieceContext.stroke();
    }

    if (player.next) {
        const offsetX = Math.floor((6 - player.next[0].length) / 2);
        const offsetY = Math.floor((6 - player.next.length) / 2);
        drawMatrix(player.next, {x: offsetX, y: offsetY}, nextPieceContext);
    }
}

function holdCurrentPiece() {
    if (!canHold) return;

    if (holdPiece === null) {
        holdPiece = player.matrix;
        playerReset();
    } else {
        const temp = player.matrix;
        player.matrix = holdPiece;
        holdPiece = temp;
        player.pos.y = 0;
        player.pos.x = (arena[0].length / 2 | 0) - (player.matrix[0].length / 2 | 0);
    }

    canHold = false;
    drawHoldPiece();
}

function drawHoldPiece() {
    holdPieceContext.fillStyle = '#111';
    holdPieceContext.fillRect(0, 0, 6, 6);

    holdPieceContext.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    holdPieceContext.lineWidth = 0.05;
    for (let i = 0; i <= 6; i++) {
        holdPieceContext.beginPath();
        holdPieceContext.moveTo(i, 0);
        holdPieceContext.lineTo(i, 6);
        holdPieceContext.stroke();
        holdPieceContext.beginPath();
        holdPieceContext.moveTo(0, i);
        holdPieceContext.lineTo(6, i);
        holdPieceContext.stroke();
    }

    if (holdPiece) {
        const offsetX = Math.floor((6 - holdPiece[0].length) / 2);
        const offsetY = Math.floor((6 - holdPiece.length) / 2);
        drawMatrix(holdPiece, {x: offsetX, y: offsetY}, holdPieceContext);
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = Math.random() * 5 + 2; // Aumentado el tamaño
        this.speedX = Math.random() * 6 - 3; // Aumentada la velocidad
        this.speedY = Math.random() * 6 - 3;
        this.lifetime = 100;
        console.log(`Partícula creada en (${x}, ${y}) con color ${color}`);
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.size *= 0.96; // Reducción más lenta del tamaño
        this.lifetime--;
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

let particles = [];
function createParticles(x, y, color) {
    console.log(`Creando partículas en (${x}, ${y}) con color ${color}`);
    for (let i = 0; i < 30; i++) {
        particles.push(new Particle(x, y, color));
    }
    console.log(`Número total de partículas: ${particles.length}`);
}

function updateParticles() {
    console.log(`Actualizando ${particles.length} partículas`);
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw(context);
        if (particles[i].lifetime <= 0 || particles[i].size <= 0.1) {
            particles.splice(i, 1);
        }
    }
}

function merge(arena, player) {
    console.log('Función merge llamada');
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                arena[y + player.pos.y][x + player.pos.x] = value;
                let particleX = (x + player.pos.x) * 20 + 10;
                let particleY = (y + player.pos.y) * 20 + 10;
                console.log(`Creando partículas para pieza en (${particleX}, ${particleY})`);
                createParticles(particleX, particleY, colors[value].fill);
            }
        });
    });
}

function update(time = 0) {
    if (!gameActive || !gameHandle.isPlaying) {
        return;
    }

    const deltaTime = time - lastTime;
    lastTime = time;

    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        playerDrop();
    }

    updateParticles();
    draw();

    gameHandle.animationId = requestAnimationFrame(update);
}



function startGame() {
    mainMenu.classList.add('hidden');
    gameArea.classList.remove('hidden');
    pauseOverlay.classList.add('hidden');
    gameActive = true;
    gameHandle.isPlaying = true;
    player.score = 0;
    comboCount = 0;
    holdPiece = null;
    canHold = true;
    playerReset();
    updateScore();
    drawNextPiece();
    drawHoldPiece();
    dropCounter = 0;
    lastTime = performance.now();
    pauseButton.textContent = 'Pausar';
    cancelAnimationFrame(gameHandle.animationId);
    update();
}
function pauseGame() {
    if (!gameActive) return;

    gameHandle.isPlaying = !gameHandle.isPlaying;
    pauseButton.textContent = gameHandle.isPlaying ? 'Pausar' : 'Reanudar';
    document.getElementById('pause-overlay').classList.toggle('hidden', gameHandle.isPlaying);

    if (gameHandle.isPlaying) {
        lastTime = performance.now();
        cancelAnimationFrame(gameHandle.animationId);
        update();
    } else {
        cancelAnimationFrame(gameHandle.animationId);
    }
}


function backToMenu() {
    gameActive = false;
    isPlaying = false;
    mainMenu.classList.remove('hidden');
    gameArea.classList.add('hidden');
    pauseOverlay.classList.add('hidden');
    arena.forEach(row => row.fill(0));
    player.score = 0;
    updateScore();
}

function playerDropToBottom() {
    while (!collide(arena, player)) {
        player.pos.y++;
    }
    player.pos.y--;
    merge(arena, player);
    playerReset();
    arenaSweep();
    updateScore();
}

document.addEventListener('keydown', event => {
    if (!gameActive) return;
    
    if (event.keyCode === 37) {
        playerMove(-1);
    } else if (event.keyCode === 39) {
        playerMove(1);
    } else if (event.keyCode === 40) {
        playerDrop();
    } else if (event.keyCode === 38) {
        playerRotate(1);
    } else if (event.keyCode === 32) {
        playerDropToBottom();
    } else if (event.keyCode === 16) { // Shift key
        holdCurrentPiece();
    } else if (event.keyCode === 13 || event.keyCode === 80 || event.keyCode === 27) { 
        // Enter (13), P (80), or Esc (27)
        pauseGame();
    }
    
    event.preventDefault();
});


playButton.addEventListener('click', startGame);
pauseButton.addEventListener('click', pauseGame);
backToMenuButton.addEventListener('click', backToMenu);

optionsButton.addEventListener('click', () => {
    alert('Opciones no implementadas aún');
});

exitButton.addEventListener('click', () => {
    window.close();
});

window.addEventListener("keydown", function(e) {
    if([32, 37, 38, 39, 40].indexOf(e.keyCode) > -1 && gameActive) {
        e.preventDefault();
    }
}, false);

player.next = createPiece(pieces[pieces.length * Math.randomdrawNextPiece() | 0]);