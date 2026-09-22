const cells = document.querySelectorAll('.cell');
const statusElement = document.getElementById('status');
const restartBtn = document.getElementById('restartBtn');
const difficultySelect = document.getElementById('difficulty');

let board = ['', '', '', '', '', '', '', '', ''];
const PLAYER_X = 'X'; 
const PLAYER_O = 'O'; 
let currentPlayer = PLAYER_X;
let isGameActive = true;
let gameMode = 'unbeatable';
let botVsBotTimeout = null;

const winningConditions = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], 
    [0, 3, 6], [1, 4, 7], [2, 5, 8], 
    [0, 4, 8], [2, 4, 6]        
];

function initializeGame() {
    cells.forEach(cell => {
        cell.addEventListener('click', handleCellClick);
    });
    restartBtn.addEventListener('click', restartGame);
    difficultySelect.addEventListener('change', restartGame);
    gameMode = difficultySelect.value;
    updateStatus();
    
    if (gameMode === 'bot_vs_bot') {
        botVsBotTimeout = setTimeout(() => {
            makeAiMove(PLAYER_X);
        }, 800);
    }
}

function updateStatus() {
    if (!isGameActive) return;
    
    if (gameMode === 'bot_vs_bot') {
        statusElement.innerHTML = `Симуляция: Ход <span style="color: var(--${currentPlayer.toLowerCase()}-color)">${currentPlayer}</span> ...`;
    } else if (gameMode === 'pvp') {
        statusElement.innerHTML = `Ход игрока <span style="color: var(--${currentPlayer.toLowerCase()}-color)">${currentPlayer}</span>`;
    } else {
        if (currentPlayer === PLAYER_X) {
            statusElement.innerHTML = `Твой ход! Ты играешь за <span style="color: var(--x-color)">X</span>`;
        } else {
            statusElement.innerHTML = `Думаю...`;
        }
    }
}

function handleCellClick(e) {
    if (gameMode === 'bot_vs_bot') return;

    const cell = e.target;
    const index = parseInt(cell.getAttribute('data-index'));

    if (board[index] !== '' || !isGameActive || (gameMode !== 'pvp' && currentPlayer !== PLAYER_X)) {
        return;
    }

    executeTurn(index);
}

function executeTurn(index) {
    makeMove(index, currentPlayer);
    checkWinner();

    if (isGameActive) {
        currentPlayer = currentPlayer === PLAYER_X ? PLAYER_O : PLAYER_X;
        updateStatus();
        
        if (gameMode === 'unbeatable' || gameMode === 'easy') {
            if (currentPlayer === PLAYER_O) {
                setTimeout(() => {
                    makeAiMove(PLAYER_O);
                }, 600);
            }
        } else if (gameMode === 'bot_vs_bot') {
            botVsBotTimeout = setTimeout(() => {
                makeAiMove(currentPlayer);
            }, 800);
        }
    }
}

function makeMove(index, player) {
    board[index] = player;
    cells[index].classList.add(player.toLowerCase());
}

function makeAiMove(playerForBot) {
    if (!isGameActive) return;
    
    let bestMove;

    if (gameMode === 'unbeatable' || gameMode === 'bot_vs_bot') {
        bestMove = minimax(board, playerForBot).index;
    } else {
        const availableMoves = getEmptyIndices(board);
        bestMove = availableMoves[Math.floor(Math.random() * availableMoves.length)];
    }

    if (bestMove !== undefined) {
        executeTurn(bestMove);
    }
}

function checkWinner() {
    let roundWon = false;
    let winningPlayer = null;

    for (let i = 0; i < winningConditions.length; i++) {
        const [a, b, c] = winningConditions[i];
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            roundWon = true;
            winningPlayer = board[a];
            break;
        }
    }

    if (roundWon) {
        isGameActive = false;
        if (gameMode === 'bot_vs_bot') {
            statusElement.innerHTML = `Победил алгоритм за ${winningPlayer}!`;
            statusElement.style.color = `var(--${winningPlayer.toLowerCase()}-color)`;
        } else if (gameMode === 'pvp') {
            statusElement.innerHTML = `Победил игрок ${winningPlayer}!`;
            statusElement.style.color = `var(--${winningPlayer.toLowerCase()}-color)`;
        } else {
            if (winningPlayer === PLAYER_X) {
                statusElement.innerHTML = `Ты победил`;
                statusElement.style.color = 'var(--x-color)';
            } else {
                statusElement.innerHTML = `ИИ победил`;
                statusElement.style.color = 'var(--o-color)';
            }
        }
        return;
    }

    if (!board.includes('')) {
        isGameActive = false;
        if (gameMode === 'bot_vs_bot') {
            statusElement.innerHTML = `Ничья! Идеальная партия.`;
        } else {
            statusElement.innerHTML = `Ничья! Отличная игра.`;
        }
        statusElement.style.color = 'var(--text-color)';
        return;
    }
}

function restartGame() {
    clearTimeout(botVsBotTimeout);
    board = ['', '', '', '', '', '', '', '', ''];
    isGameActive = true;
    currentPlayer = PLAYER_X;
    gameMode = difficultySelect.value;
    statusElement.style.color = 'var(--text-color)';
    updateStatus();
    cells.forEach(cell => {
        cell.classList.remove('x', 'o');
    });
    
    if (gameMode === 'bot_vs_bot') {
        botVsBotTimeout = setTimeout(() => {
            makeAiMove(PLAYER_X);
        }, 800);
    }
}

// === Алгоритм Minimax ===
function getEmptyIndices(currentBoard) {
    return currentBoard.map((val, index) => val === '' ? index : null).filter(val => val !== null);
}

function checkWinForMinimax(currentBoard, player) {
    for (let i = 0; i < winningConditions.length; i++) {
        const [a, b, c] = winningConditions[i];
        if (currentBoard[a] === player && currentBoard[b] === player && currentBoard[c] === player) {
            return true;
        }
    }
    return false;
}

function minimax(newBoard, player) {
    const availableSpots = getEmptyIndices(newBoard);

    if (checkWinForMinimax(newBoard, PLAYER_X)) {
        return { score: -10 };
    } else if (checkWinForMinimax(newBoard, PLAYER_O)) {
        return { score: 10 };
    } else if (availableSpots.length === 0) {
        return { score: 0 };
    }

    const moves = [];

    for (let i = 0; i < availableSpots.length; i++) {
        const move = {};
        move.index = availableSpots[i];
        
        newBoard[availableSpots[i]] = player;

        if (player === PLAYER_O) {
            const result = minimax(newBoard, PLAYER_X);
            move.score = result.score;
        } else {
            const result = minimax(newBoard, PLAYER_O);
            move.score = result.score;
        }

        newBoard[availableSpots[i]] = '';

        moves.push(move);
    }

    let bestMoves = [];
    if (player === PLAYER_O) {
        let bestScore = -Infinity;
        for (let i = 0; i < moves.length; i++) {
            if (moves[i].score > bestScore) {
                bestScore = moves[i].score;
                bestMoves = [moves[i]];
            } else if (moves[i].score === bestScore) {
                bestMoves.push(moves[i]);
            }
        }
    } else {
        let bestScore = Infinity;
        for (let i = 0; i < moves.length; i++) {
            if (moves[i].score < bestScore) {
                bestScore = moves[i].score;
                bestMoves = [moves[i]];
            } else if (moves[i].score === bestScore) {
                bestMoves.push(moves[i]);
            }
        }
    }

    return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

initializeGame();
