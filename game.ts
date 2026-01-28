interface GameState {
    grid: number[][];
    score: number;
}

interface Position {
    row: number;
    col: number;
}

interface Tile {
    id: number;
    value: number;
    row: number;
    col: number;
    previousRow: number | null;
    previousCol: number | null;
    mergedFrom: Tile[] | null;
    isNew: boolean;
}

class Game2048 {
    private size: number = 4;
    private grid: (Tile | null)[][] = [];
    private score: number = 0;
    private bestScore: number = 0;
    private history: GameState[] = [];
    private maxHistoryLength: number = 50;
    private tileIdCounter: number = 0;
    private isAnimating: boolean = false;
    private gameOver: boolean = false;
    private hasWon: boolean = false;
    private keepPlaying: boolean = false;
    private animationDuration: number = 150;

    private gridElement: HTMLElement;
    private scoreElement: HTMLElement;
    private bestScoreElement: HTMLElement;
    private undoButton: HTMLButtonElement;
    private newGameButton: HTMLButtonElement;
    private themeSelect: HTMLSelectElement;
    private gameMessage: HTMLElement;
    private retryButton: HTMLButtonElement;

    constructor() {
        this.gridElement = document.getElementById('grid')!;
        this.scoreElement = document.getElementById('score')!;
        this.bestScoreElement = document.getElementById('best-score')!;
        this.undoButton = document.getElementById('undo') as HTMLButtonElement;
        this.newGameButton = document.getElementById('new-game') as HTMLButtonElement;
        this.themeSelect = document.getElementById('theme') as HTMLSelectElement;
        this.gameMessage = document.getElementById('game-message')!;
        this.retryButton = document.getElementById('retry') as HTMLButtonElement;

        this.loadBestScore();
        this.loadTheme();
        this.setupGrid();
        this.setupEventListeners();
        this.newGame();
    }

    private loadBestScore(): void {
        const saved = localStorage.getItem('2048-best-score');
        if (saved) {
            this.bestScore = parseInt(saved, 10);
            this.bestScoreElement.textContent = this.bestScore.toString();
        }
    }

    private saveBestScore(): void {
        localStorage.setItem('2048-best-score', this.bestScore.toString());
    }

    private loadTheme(): void {
        const urlParams = new URLSearchParams(window.location.search);
        const urlTheme = urlParams.get('theme');
        const saved = urlTheme || localStorage.getItem('2048-theme');
        if (saved) {
            this.themeSelect.value = saved;
            this.applyTheme(saved);
        }
    }

    private saveTheme(theme: string): void {
        localStorage.setItem('2048-theme', theme);
        const url = new URL(window.location.href);
        if (theme === 'classic') {
            url.searchParams.delete('theme');
        } else {
            url.searchParams.set('theme', theme);
        }
        window.history.replaceState({}, '', url);
    }

    private applyTheme(theme: string): void {
        document.body.className = '';
        if (theme !== 'classic') {
            document.body.classList.add(`theme-${theme}`);
        }
    }

    private setupGrid(): void {
        this.gridElement.innerHTML = '';
        for (let i = 0; i < this.size * this.size; i++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            this.gridElement.appendChild(cell);
        }
    }

    private setupEventListeners(): void {
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));

        this.newGameButton.addEventListener('click', () => this.newGame());
        this.undoButton.addEventListener('click', () => this.undo());
        this.retryButton.addEventListener('click', () => this.newGame());

        this.themeSelect.addEventListener('change', (e) => {
            const theme = (e.target as HTMLSelectElement).value;
            this.applyTheme(theme);
            this.saveTheme(theme);
            this.render();
            this.themeSelect.blur();
        });

        let touchStartX: number;
        let touchStartY: number;

        this.gridElement.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }, { passive: true });

        this.gridElement.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });

        this.gridElement.addEventListener('touchend', (e) => {
            if (!touchStartX || !touchStartY) return;

            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;

            const deltaX = touchEndX - touchStartX;
            const deltaY = touchEndY - touchStartY;

            const minSwipeDistance = 50;

            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                if (Math.abs(deltaX) > minSwipeDistance) {
                    this.move(deltaX > 0 ? 'right' : 'left');
                }
            } else {
                if (Math.abs(deltaY) > minSwipeDistance) {
                    this.move(deltaY > 0 ? 'down' : 'up');
                }
            }
        }, { passive: true });
    }

    private handleKeyDown(e: KeyboardEvent): void {
        if (this.isAnimating) return;

        if (e.key === 'z' || e.key === 'Z') {
            if (e.ctrlKey || e.metaKey || !e.shiftKey) {
                e.preventDefault();
                this.undo();
                return;
            }
        }

        let direction: 'up' | 'down' | 'left' | 'right' | null = null;

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

    private newGame(): void {
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

    private getGridValues(): number[][] {
        return this.grid.map(row => row.map(tile => tile ? tile.value : 0));
    }

    private saveState(): void {
        const state: GameState = {
            grid: this.getGridValues(),
            score: this.score
        };
        this.history.push(state);

        if (this.history.length > this.maxHistoryLength) {
            this.history.shift();
        }

        this.updateUndoButton();
    }

    private undo(): void {
        if (this.history.length === 0 || this.isAnimating) return;

        const state = this.history.pop()!;
        this.restoreGrid(state.grid);
        this.score = state.score;
        this.gameOver = false;
        this.hideGameMessage();

        this.updateScore();
        this.updateUndoButton();
        this.clearTiles();
        this.render();
    }

    private restoreGrid(values: number[][]): void {
        this.grid = values.map((row, r) =>
            row.map((value, c) => {
                if (value === 0) return null;
                return this.createTile(r, c, value, false);
            })
        );
    }

    private createTile(row: number, col: number, value: number, isNew: boolean = true): Tile {
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

    private updateUndoButton(): void {
        this.undoButton.disabled = this.history.length === 0;
    }

    private updateScore(): void {
        this.scoreElement.textContent = this.score.toString();
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            this.bestScoreElement.textContent = this.bestScore.toString();
            this.saveBestScore();
        }
    }

    private showScoreAddition(points: number): void {
        const scoreBox = this.scoreElement.parentElement!;
        const addition = document.createElement('div');
        addition.className = 'score-addition';
        addition.textContent = `+${points}`;
        scoreBox.appendChild(addition);
        setTimeout(() => addition.remove(), 800);
    }

    private addRandomTile(): Tile | null {
        const emptyCells: Position[] = [];

        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                if (!this.grid[row][col]) {
                    emptyCells.push({ row, col });
                }
            }
        }

        if (emptyCells.length === 0) return null;

        const { row, col } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        const value = Math.random() < 0.9 ? 2 : 4;
        const tile = this.createTile(row, col, value, true);
        this.grid[row][col] = tile;

        return tile;
    }

    private prepareTiles(): void {
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

    private moveTile(tile: Tile, row: number, col: number): void {
        this.grid[tile.row][tile.col] = null;
        this.grid[row][col] = tile;
        tile.row = row;
        tile.col = col;
    }

    private move(direction: 'up' | 'down' | 'left' | 'right'): boolean {
        if (this.isAnimating) return false;
        if (this.gameOver && !this.keepPlaying) return false;

        this.saveState();
        this.prepareTiles();

        let moved = false;
        let scoreGain = 0;

        const vectors: Record<string, { row: number; col: number }> = {
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
                if (!tile) continue;

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

                setTimeout(() => {
                    this.isAnimating = false;

                    if (!this.movesAvailable()) {
                        this.gameOver = true;
                        this.showGameMessage('Game Over!');
                    } else if (this.hasWon && !this.keepPlaying) {
                        this.showGameMessage('You Win!', true);
                    }
                }, 100);
            }, this.animationDuration);
        } else {
            this.history.pop();
            this.updateUndoButton();
        }

        return moved;
    }

    private buildTraversals(vector: { row: number; col: number }): { rows: number[]; cols: number[] } {
        const rows: number[] = [];
        const cols: number[] = [];

        for (let i = 0; i < this.size; i++) {
            rows.push(i);
            cols.push(i);
        }

        if (vector.row === 1) rows.reverse();
        if (vector.col === 1) cols.reverse();

        return { rows, cols };
    }

    private findFurthestPosition(row: number, col: number, vector: { row: number; col: number }): { furthest: Position; next: Position | null } {
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

    private isWithinBounds(row: number, col: number): boolean {
        return row >= 0 && row < this.size && col >= 0 && col < this.size;
    }

    private movesAvailable(): boolean {
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                if (!this.grid[row][col]) return true;
            }
        }

        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                const tile = this.grid[row][col];
                if (!tile) continue;

                if (col < this.size - 1) {
                    const right = this.grid[row][col + 1];
                    if (right && right.value === tile.value) return true;
                }

                if (row < this.size - 1) {
                    const down = this.grid[row + 1][col];
                    if (down && down.value === tile.value) return true;
                }
            }
        }

        return false;
    }

    private clearTiles(): void {
        const tiles = this.gridElement.querySelectorAll('.tile');
        tiles.forEach(tile => tile.remove());
    }

    private getTileClass(value: number): string {
        if (value <= 2048) {
            return `tile-${value}`;
        }
        return 'tile-super';
    }

    private getCellPosition(row: number, col: number): { top: number; left: number; size: number } {
        const cellIndex = row * this.size + col;
        const cell = this.gridElement.children[cellIndex] as HTMLElement;

        return {
            top: cell.offsetTop,
            left: cell.offsetLeft,
            size: cell.offsetWidth
        };
    }

    private render(): void {
        // First, remove tiles that are no longer in the grid
        const existingTiles = this.gridElement.querySelectorAll('.tile');
        const currentTileIds = new Set<number>();

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
                if (!tile) continue;

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

    private renderTile(tile: Tile, toRow: number, toCol: number, isNew: boolean, isMerged: boolean): void {
        let element = this.gridElement.querySelector(`[data-id="${tile.id}"]`) as HTMLElement;
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
            } else if (isMerged) {
                // Merged tile: start hidden at target position, will appear after source tiles merge
                element.style.top = `${targetPos.top}px`;
                element.style.left = `${targetPos.left}px`;
                element.style.opacity = '0';
                element.style.transform = 'scale(0)';
            } else if (tile.previousRow !== null && tile.previousCol !== null) {
                // Moving tile: start at previous position
                const fromPos = this.getCellPosition(tile.previousRow, tile.previousCol);
                element.style.top = `${fromPos.top}px`;
                element.style.left = `${fromPos.left}px`;
            } else {
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
                        if (sourceEl) sourceEl.remove();
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

    private showGameMessage(message: string, isWin: boolean = false): void {
        const messageText = this.gameMessage.querySelector('p')!;
        messageText.textContent = message;

        if (isWin) {
            this.retryButton.textContent = 'Keep Playing';
            this.retryButton.onclick = () => {
                this.keepPlaying = true;
                this.hideGameMessage();
            };
        } else {
            this.retryButton.textContent = 'Try Again';
            this.retryButton.onclick = () => this.newGame();
        }

        this.gameMessage.classList.add('active');
    }

    private hideGameMessage(): void {
        this.gameMessage.classList.remove('active');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new Game2048();
});
