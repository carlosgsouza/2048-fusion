import { Tile } from './types';

export class Renderer {
    private gridElement: HTMLElement;
    private scoreElement: HTMLElement;
    private bestScoreElement: HTMLElement;
    private gameMessage: HTMLElement;
    private retryButton: HTMLButtonElement;
    private undoButton: HTMLButtonElement;
    private size: number = 4;
    private animationDuration: number = 150;

    constructor() {
        this.gridElement = document.getElementById('grid')!;
        this.scoreElement = document.getElementById('score')!;
        this.bestScoreElement = document.getElementById('best-score')!;
        this.gameMessage = document.getElementById('game-message')!;
        this.retryButton = document.getElementById('retry') as HTMLButtonElement;
        this.undoButton = document.getElementById('undo') as HTMLButtonElement;
        this.setupGrid();
    }

    private setupGrid(): void {
        this.gridElement.innerHTML = '';
        for (let i = 0; i < this.size * this.size; i++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            this.gridElement.appendChild(cell);
        }
    }

    updateScore(score: number, bestScore: number): void {
        this.scoreElement.textContent = score.toString();
        this.bestScoreElement.textContent = bestScore.toString();
    }

    updateUndoButton(disabled: boolean): void {
        this.undoButton.disabled = disabled;
    }

    clearTiles(): void {
        const tiles = this.gridElement.querySelectorAll('.tile');
        tiles.forEach(tile => tile.remove());
    }

    private getTileClass(value: number): string {
        return value <= 2048 ? `tile-${value}` : 'tile-super';
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

    render(grid: (Tile | null)[][]): void {
        const existingTiles = this.gridElement.querySelectorAll('.tile');
        const currentTileIds = new Set<number>();

        grid.flat().forEach(tile => {
            if (tile) {
                currentTileIds.add(tile.id);
                tile.mergedFrom?.forEach(t => currentTileIds.add(t.id));
            }
        });

        existingTiles.forEach(el => {
            const id = parseInt(el.getAttribute('data-id') || '-1', 10);
            if (!currentTileIds.has(id)) el.remove();
        });

        grid.forEach((row, rIdx) => {
            row.forEach((tile, cIdx) => {
                if (!tile) return;
                if (tile.mergedFrom) {
                    tile.mergedFrom.forEach(mergedTile => {
                        this.renderTile(mergedTile, tile.row, tile.col, false, false);
                    });
                }
                const isMerged = !!tile.mergedFrom;
                this.renderTile(tile, tile.row, tile.col, tile.isNew, isMerged);
            });
        });
    }

    renderTile(tile: Tile, toRow: number, toCol: number, isNew: boolean, isMerged: boolean): void {
        let element = this.gridElement.querySelector(`[data-id="${tile.id}"]`) as HTMLElement;
        const targetPos = this.getCellPosition(toRow, toCol);

        if (!element) {
            element = document.createElement('div');
            element.setAttribute('data-id', tile.id.toString());
            element.className = `tile ${this.getTileClass(tile.value)}`;
            element.textContent = tile.value.toString();
            element.style.width = `${targetPos.size}px`;
            element.style.height = `${targetPos.size}px`;

            if (isNew) {
                element.style.top = `${targetPos.top}px`;
                element.style.left = `${targetPos.left}px`;
                element.classList.add('tile-new');
            } else if (isMerged) {
                element.style.top = `${targetPos.top}px`;
                element.style.left = `${targetPos.left}px`;
                element.style.opacity = '0';
                element.style.transform = 'scale(0)';
            } else if (tile.previousRow !== null && tile.previousCol !== null) {
                const fromPos = this.getCellPosition(tile.previousRow, tile.previousCol);
                element.style.top = `${fromPos.top}px`;
                element.style.left = `${fromPos.left}px`;
            } else {
                element.style.top = `${targetPos.top}px`;
                element.style.left = `${targetPos.left}px`;
            }

            this.gridElement.appendChild(element);
            element.offsetHeight; // trigger reflow
        }

        element.style.top = `${targetPos.top}px`;
        element.style.left = `${targetPos.left}px`;

        if (isMerged) {
            setTimeout(() => {
                if (tile.mergedFrom) {
                    tile.mergedFrom.forEach(t => {
                        const sourceEl = this.gridElement.querySelector(`[data-id="${t.id}"]`);
                        if (sourceEl) sourceEl.remove();
                    });
                }
                element.style.opacity = '1';
                element.style.transform = 'scale(1)';
                element.classList.add('tile-merged');
                setTimeout(() => element.classList.remove('tile-merged'), 250);
            }, this.animationDuration);
        }
    }

    showInvalidMoveAnimation(direction: string): void {
        const gameContainer = document.querySelector('.game-container') as HTMLElement;
        gameContainer.classList.remove('shake-left', 'shake-right', 'shake-up', 'shake-down');
        gameContainer.offsetHeight; // trigger reflow
        gameContainer.classList.add(`shake-${direction}`);
        setTimeout(() => gameContainer.classList.remove(`shake-${direction}`), 200);
    }

    showGameMessage(message: string, isWin: boolean, onRetry: (keepPlaying: boolean) => void): void {
        const messageText = this.gameMessage.querySelector('p')!;
        messageText.textContent = message;

        if (isWin) {
            this.retryButton.textContent = 'Keep Playing';
            this.retryButton.onclick = () => onRetry(true);
        } else {
            this.retryButton.textContent = 'Try Again';
            this.retryButton.onclick = () => onRetry(false);
        }

        this.gameMessage.classList.add('active');
    }

    hideGameMessage(): void {
        this.gameMessage.classList.remove('active');
    }
}
