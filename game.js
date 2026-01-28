class Game2048 {
    constructor() {
        this.size = 4;
        this.grid = [];
        this.score = 0;
        this.bestScore = 0;
        this.history = [];
        this.maxHistoryLength = 50;
        this.tileIdCounter = 0;
        this.isAnimating = false;
        this.gameOver = false;
        this.hasWon = false;
        this.keepPlaying = false;
        this.animationDuration = 150;
        this.debugMode = false;
        this.gridElement = document.getElementById('grid');
        this.scoreElement = document.getElementById('score');
        this.bestScoreElement = document.getElementById('best-score');
        this.undoButton = document.getElementById('undo');
        this.newGameButton = document.getElementById('new-game');
        this.themeSelect = document.getElementById('theme');
        this.gameMessage = document.getElementById('game-message');
        this.retryButton = document.getElementById('retry');
        this.loadBestScore();
        this.loadTheme();
        this.setupGrid();
        this.setupEventListeners();
        this.initFromUrl();
    }
    loadBestScore() {
        const saved = localStorage.getItem('2048-best-score');
        if (saved) {
            this.bestScore = parseInt(saved, 10);
            this.bestScoreElement.textContent = this.bestScore.toString();
        }
    }
    saveBestScore() {
        localStorage.setItem('2048-best-score', this.bestScore.toString());
    }
    loadTheme() {
        const urlParams = new URLSearchParams(window.location.search);
        const urlTheme = urlParams.get('theme');
        const saved = urlTheme || localStorage.getItem('2048-theme');
        if (saved) {
            this.themeSelect.value = saved;
            this.applyTheme(saved);
        }
    }
    saveTheme(theme) {
        localStorage.setItem('2048-theme', theme);
        const url = new URL(window.location.href);
        if (theme === 'classic') {
            url.searchParams.delete('theme');
        }
        else {
            url.searchParams.set('theme', theme);
        }
        window.history.replaceState({}, '', url);
    }
    applyTheme(theme) {
        document.body.className = '';
        if (theme !== 'classic') {
            document.body.classList.add(`theme-${theme}`);
        }
    }
    initFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        this.debugMode = urlParams.get('debug') === 'true';
        const state = urlParams.get('state');
        if (state) {
            this.loadStateFromString(state);
        }
        else {
            this.newGame();
        }
    }
    getScenarios() {
        // Format: "score_base36-grid_hex" where grid is 16 hex digits (log2 of each cell value)
        // Tile values: 0=empty, 1=2, 2=4, 3=8, 4=16, 5=32, 6=64, 7=128, 8=256, 9=512, a=1024, b=2048, c=4096
        return {
            '64': '2s-0000000000005500',
            '128': '5k-0000000000006600',
            '256': 'dw-0000000000007700',
            '512': 'rs-0000000000008800',
            '1024': '1jk-0000000000009900',
            '2048': '334-000000000000aa00',
            '4096': '668-000000000000bb00',
            '8192': 'cd0-000000000000cc00',
            'win': '7ps-1234567890aa1234',
            // lose: Grid full except one cell, no adjacent matches possible after any move
            // Row 0: 2,4,8,16  Row 1: 32,64,128,256  Row 2: 2,4,8,16  Row 3: 32,64,128,_
            'lose': 'dw-1234567812345670'
        };
    }
    loadStateFromString(stateStr) {
        try {
            // Check if it's a named scenario
            const scenarios = this.getScenarios();
            if (scenarios[stateStr]) {
                stateStr = scenarios[stateStr];
            }
            // Format: "score-t0t1t2...t15" where each t is log2(value) as hex (0=empty, 1=2, 2=4, etc)
            const [scoreStr, gridStr] = stateStr.split('-');
            const score = parseInt(scoreStr, 36);
            const grid = [];
            for (let row = 0; row < this.size; row++) {
                grid[row] = [];
                for (let col = 0; col < this.size; col++) {
                    const idx = row * this.size + col;
                    const encoded = parseInt(gridStr[idx], 16);
                    grid[row][col] = encoded === 0 ? 0 : Math.pow(2, encoded);
                }
            }
            this.grid = Array(this.size).fill(null).map(() => Array(this.size).fill(null));
            this.score = score;
            this.history = [];
            this.gameOver = false;
            this.hasWon = false;
            this.keepPlaying = false;
            this.tileIdCounter = 0;
            this.restoreGrid(grid);
            this.updateScore();
            this.updateUndoButton();
            this.hideGameMessage();
            this.clearTiles();
            this.render();
        }
        catch (e) {
            console.error('Failed to load state from URL:', e);
            this.newGame();
        }
    }
    encodeStateToString() {
        // Format: "score-t0t1t2...t15" where each t is log2(value) as hex (0=empty, 1=2, 2=4, etc)
        const gridValues = this.getGridValues();
        let gridStr = '';
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                const value = gridValues[row][col];
                const encoded = value === 0 ? 0 : Math.log2(value);
                gridStr += encoded.toString(16);
            }
        }
        return this.score.toString(36) + '-' + gridStr;
    }
    updateDebugUrl() {
        if (!this.debugMode)
            return;
        const url = new URL(window.location.href);
        url.searchParams.set('state', this.encodeStateToString());
        window.history.replaceState({}, '', url);
    }
    setupGrid() {
        this.gridElement.innerHTML = '';
        for (let i = 0; i < this.size * this.size; i++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            this.gridElement.appendChild(cell);
        }
    }
    setupEventListeners() {
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        this.newGameButton.addEventListener('click', () => this.newGame());
        this.undoButton.addEventListener('click', () => this.undo());
        this.themeSelect.addEventListener('change', (e) => {
            const theme = e.target.value;
            this.applyTheme(theme);
            this.saveTheme(theme);
            this.render();
            this.themeSelect.blur();
        });
        let touchStartX;
        let touchStartY;
        this.gridElement.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }, { passive: true });
        this.gridElement.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });
        this.gridElement.addEventListener('touchend', (e) => {
            if (!touchStartX || !touchStartY)
                return;
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            const deltaX = touchEndX - touchStartX;
            const deltaY = touchEndY - touchStartY;
            const minSwipeDistance = 50;
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                if (Math.abs(deltaX) > minSwipeDistance) {
                    this.move(deltaX > 0 ? 'right' : 'left');
                }
            }
            else {
                if (Math.abs(deltaY) > minSwipeDistance) {
                    this.move(deltaY > 0 ? 'down' : 'up');
                }
            }
        }, { passive: true });
    }
    handleKeyDown(e) {
        if (this.isAnimating)
            return;
        if (e.key === 'z' || e.key === 'Z') {
            if (e.ctrlKey || e.metaKey || !e.shiftKey) {
                e.preventDefault();
                this.undo();
                return;
            }
        }
        let direction = null;
        switch (e.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                direction = 'up';
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                direction = 'down';
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                direction = 'left';
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                direction = 'right';
                break;
        }
        if (direction) {
            e.preventDefault();
            this.move(direction);
        }
    }
    newGame() {
        this.grid = Array(this.size).fill(null).map(() => Array(this.size).fill(null));
        this.score = 0;
        this.history = [];
        this.gameOver = false;
        this.hasWon = false;
        this.keepPlaying = false;
        this.tileIdCounter = 0;
        this.updateScore();
        this.updateUndoButton();
        this.hideGameMessage();
        this.clearTiles();
        this.addRandomTile();
        this.addRandomTile();
        this.render();
    }
    getGridValues() {
        return this.grid.map(row => row.map(tile => tile ? tile.value : 0));
    }
    saveState() {
        const state = {
            grid: this.getGridValues(),
            score: this.score
        };
        this.history.push(state);
        if (this.history.length > this.maxHistoryLength) {
            this.history.shift();
        }
        this.updateUndoButton();
    }
    undo() {
        if (this.history.length === 0 || this.isAnimating)
            return;
        const state = this.history.pop();
        this.restoreGrid(state.grid);
        this.score = state.score;
        this.gameOver = false;
        this.hideGameMessage();
        this.updateScore();
        this.updateUndoButton();
        this.clearTiles();
        this.render();
    }
    restoreGrid(values) {
        this.grid = values.map((row, r) => row.map((value, c) => {
            if (value === 0)
                return null;
            return this.createTile(r, c, value, false);
        }));
    }
    createTile(row, col, value, isNew = true) {
        return {
            id: this.tileIdCounter++,
            value,
            row,
            col,
            previousRow: null,
            previousCol: null,
            mergedFrom: null,
            isNew
        };
    }
    updateUndoButton() {
        this.undoButton.disabled = this.history.length === 0;
    }
    updateScore() {
        this.scoreElement.textContent = this.score.toString();
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            this.bestScoreElement.textContent = this.bestScore.toString();
            this.saveBestScore();
        }
    }
    showScoreAddition(points) {
        const scoreBox = this.scoreElement.parentElement;
        const addition = document.createElement('div');
        addition.className = 'score-addition';
        addition.textContent = `+${points}`;
        scoreBox.appendChild(addition);
        setTimeout(() => addition.remove(), 800);
    }
    addRandomTile() {
        const emptyCells = [];
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                if (!this.grid[row][col]) {
                    emptyCells.push({ row, col });
                }
            }
        }
        if (emptyCells.length === 0)
            return null;
        const { row, col } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        const value = Math.random() < 0.9 ? 2 : 4;
        const tile = this.createTile(row, col, value, true);
        this.grid[row][col] = tile;
        return tile;
    }
    prepareTiles() {
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                const tile = this.grid[row][col];
                if (tile) {
                    tile.mergedFrom = null;
                    tile.isNew = false;
                    tile.previousRow = tile.row;
                    tile.previousCol = tile.col;
                }
            }
        }
    }
    moveTile(tile, row, col) {
        this.grid[tile.row][tile.col] = null;
        this.grid[row][col] = tile;
        tile.row = row;
        tile.col = col;
    }
    move(direction) {
        if (this.isAnimating)
            return false;
        if (this.gameOver)
            return false;
        if (this.hasWon && !this.keepPlaying)
            return false;
        this.saveState();
        this.prepareTiles();
        let moved = false;
        let scoreGain = 0;
        const vectors = {
            up: { row: -1, col: 0 },
            down: { row: 1, col: 0 },
            left: { row: 0, col: -1 },
            right: { row: 0, col: 1 }
        };
        const vector = vectors[direction];
        const traversals = this.buildTraversals(vector);
        for (const row of traversals.rows) {
            for (const col of traversals.cols) {
                const tile = this.grid[row][col];
                if (!tile)
                    continue;
                const { furthest, next } = this.findFurthestPosition(row, col, vector);
                if (next) {
                    const nextTile = this.grid[next.row][next.col];
                    if (nextTile && nextTile.value === tile.value && !nextTile.mergedFrom) {
                        // Merge tiles
                        const merged = this.createTile(next.row, next.col, tile.value * 2, false);
                        merged.mergedFrom = [tile, nextTile];
                        merged.previousRow = tile.row;
                        merged.previousCol = tile.col;
                        this.grid[tile.row][tile.col] = null;
                        this.grid[next.row][next.col] = merged;
                        tile.row = next.row;
                        tile.col = next.col;
                        scoreGain += merged.value;
                        moved = true;
                        if (merged.value === 2048 && !this.hasWon) {
                            this.hasWon = true;
                        }
                        continue;
                    }
                }
                if (furthest.row !== row || furthest.col !== col) {
                    this.moveTile(tile, furthest.row, furthest.col);
                    moved = true;
                }
            }
        }
        if (moved) {
            this.score += scoreGain;
            if (scoreGain > 0) {
                this.showScoreAddition(scoreGain);
            }
            this.updateScore();
            this.isAnimating = true;
            this.render();
            setTimeout(() => {
                const newTile = this.addRandomTile();
                // Only render the new tile, don't re-render everything
                if (newTile) {
                    this.renderTile(newTile, newTile.row, newTile.col, true, false);
                }
                this.updateDebugUrl();
                setTimeout(() => {
                    this.isAnimating = false;
                    if (!this.movesAvailable()) {
                        this.gameOver = true;
                        this.showGameMessage('Game Over!');
                    }
                    else if (this.hasWon && !this.keepPlaying) {
                        this.showGameMessage('You Win!', true);
                    }
                }, 100);
            }, this.animationDuration);
        }
        else {
            this.history.pop();
            this.updateUndoButton();
            this.showInvalidMoveAnimation(direction);
        }
        return moved;
    }
    buildTraversals(vector) {
        const rows = [];
        const cols = [];
        for (let i = 0; i < this.size; i++) {
            rows.push(i);
            cols.push(i);
        }
        if (vector.row === 1)
            rows.reverse();
        if (vector.col === 1)
            cols.reverse();
        return { rows, cols };
    }
    findFurthestPosition(row, col, vector) {
        let previousRow = row;
        let previousCol = col;
        let currentRow = row + vector.row;
        let currentCol = col + vector.col;
        while (this.isWithinBounds(currentRow, currentCol) && !this.grid[currentRow][currentCol]) {
            previousRow = currentRow;
            previousCol = currentCol;
            currentRow += vector.row;
            currentCol += vector.col;
        }
        return {
            furthest: { row: previousRow, col: previousCol },
            next: this.isWithinBounds(currentRow, currentCol) ? { row: currentRow, col: currentCol } : null
        };
    }
    isWithinBounds(row, col) {
        return row >= 0 && row < this.size && col >= 0 && col < this.size;
    }
    movesAvailable() {
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                if (!this.grid[row][col])
                    return true;
            }
        }
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                const tile = this.grid[row][col];
                if (!tile)
                    continue;
                if (col < this.size - 1) {
                    const right = this.grid[row][col + 1];
                    if (right && right.value === tile.value)
                        return true;
                }
                if (row < this.size - 1) {
                    const down = this.grid[row + 1][col];
                    if (down && down.value === tile.value)
                        return true;
                }
            }
        }
        return false;
    }
    clearTiles() {
        const tiles = this.gridElement.querySelectorAll('.tile');
        tiles.forEach(tile => tile.remove());
    }
    getTileClass(value) {
        if (value <= 2048) {
            return `tile-${value}`;
        }
        return 'tile-super';
    }
    getCellPosition(row, col) {
        const cellIndex = row * this.size + col;
        const cell = this.gridElement.children[cellIndex];
        return {
            top: cell.offsetTop,
            left: cell.offsetLeft,
            size: cell.offsetWidth
        };
    }
    render() {
        // First, remove tiles that are no longer in the grid
        const existingTiles = this.gridElement.querySelectorAll('.tile');
        const currentTileIds = new Set();
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                const tile = this.grid[row][col];
                if (tile) {
                    currentTileIds.add(tile.id);
                    if (tile.mergedFrom) {
                        tile.mergedFrom.forEach(t => currentTileIds.add(t.id));
                    }
                }
            }
        }
        existingTiles.forEach(el => {
            const id = parseInt(el.getAttribute('data-id') || '-1', 10);
            if (!currentTileIds.has(id)) {
                el.remove();
            }
        });
        // Render all tiles
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                const tile = this.grid[row][col];
                if (!tile)
                    continue;
                // Render merged tiles first (they animate to position then disappear)
                if (tile.mergedFrom) {
                    tile.mergedFrom.forEach(mergedTile => {
                        this.renderTile(mergedTile, tile.row, tile.col, false, false);
                    });
                }
                // Render the main tile
                const isMerged = !!tile.mergedFrom;
                this.renderTile(tile, tile.row, tile.col, tile.isNew, isMerged);
            }
        }
    }
    renderTile(tile, toRow, toCol, isNew, isMerged) {
        let element = this.gridElement.querySelector(`[data-id="${tile.id}"]`);
        const targetPos = this.getCellPosition(toRow, toCol);
        if (!element) {
            // Create new element
            element = document.createElement('div');
            element.setAttribute('data-id', tile.id.toString());
            element.className = `tile ${this.getTileClass(tile.value)}`;
            element.textContent = tile.value.toString();
            element.style.width = `${targetPos.size}px`;
            element.style.height = `${targetPos.size}px`;
            if (isNew) {
                // New tile: start at target position with scale 0
                element.style.top = `${targetPos.top}px`;
                element.style.left = `${targetPos.left}px`;
                element.classList.add('tile-new');
            }
            else if (isMerged) {
                // Merged tile: start hidden at target position, will appear after source tiles merge
                element.style.top = `${targetPos.top}px`;
                element.style.left = `${targetPos.left}px`;
                element.style.opacity = '0';
                element.style.transform = 'scale(0)';
            }
            else if (tile.previousRow !== null && tile.previousCol !== null) {
                // Moving tile: start at previous position
                const fromPos = this.getCellPosition(tile.previousRow, tile.previousCol);
                element.style.top = `${fromPos.top}px`;
                element.style.left = `${fromPos.left}px`;
            }
            else {
                // Fallback: place at target
                element.style.top = `${targetPos.top}px`;
                element.style.left = `${targetPos.left}px`;
            }
            this.gridElement.appendChild(element);
            // Trigger reflow for animation
            element.offsetHeight;
        }
        // Update position (triggers CSS transition)
        element.style.top = `${targetPos.top}px`;
        element.style.left = `${targetPos.left}px`;
        // Update value and class (for merged tiles)
        if (isMerged) {
            // Wait for move animation to complete before showing merge effect
            setTimeout(() => {
                // Remove the source tiles that were merged
                if (tile.mergedFrom) {
                    tile.mergedFrom.forEach(t => {
                        const sourceEl = this.gridElement.querySelector(`[data-id="${t.id}"]`);
                        if (sourceEl)
                            sourceEl.remove();
                    });
                }
                // Show the merged tile with pop animation
                element.style.opacity = '1';
                element.style.transform = 'scale(1)';
                element.classList.add('tile-merged');
                // Remove tile-merged class after animation completes
                setTimeout(() => {
                    element.classList.remove('tile-merged');
                }, 250);
            }, this.animationDuration);
        }
    }
    showInvalidMoveAnimation(direction) {
        const gameContainer = document.querySelector('.game-container');
        gameContainer.classList.remove('shake-left', 'shake-right', 'shake-up', 'shake-down');
        // Trigger reflow to restart animation
        gameContainer.offsetHeight;
        gameContainer.classList.add(`shake-${direction}`);
        setTimeout(() => {
            gameContainer.classList.remove(`shake-${direction}`);
        }, 200);
    }
    showGameMessage(message, isWin = false) {
        const messageText = this.gameMessage.querySelector('p');
        messageText.textContent = message;
        if (isWin) {
            this.retryButton.style.display = '';
            this.retryButton.textContent = 'Keep Playing';
            this.retryButton.onclick = () => {
                this.keepPlaying = true;
                this.hideGameMessage();
            };
        }
        else {
            this.retryButton.style.display = '';
            this.retryButton.textContent = 'Try Again';
            this.retryButton.onclick = () => this.newGame();
        }
        this.gameMessage.classList.add('active');
    }
    hideGameMessage() {
        this.gameMessage.classList.remove('active');
    }
}
document.addEventListener('DOMContentLoaded', () => {
    new Game2048();
});
