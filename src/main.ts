import './styles/main.scss';
import { Engine } from './core/Engine';
import { Renderer } from './core/Renderer';
import { Storage } from './core/Storage';
import { InputHandler } from './core/InputHandler';
import { GameState } from './core/types';

class App {
    private engine: Engine;
    private renderer: Renderer;
    private history: GameState[] = [];
    private maxHistoryLength: number = 50;
    private isAnimating: boolean = false;
    private gameOver: boolean = false;
    private hasWon: boolean = false;
    private keepPlaying: boolean = false;
    private bestScore: number = 0;
    private debugMode: boolean = false;

    constructor() {
        this.engine = new Engine();
        this.renderer = new Renderer();
        this.bestScore = Storage.getBestScore();

        document.getElementById('new-game')?.addEventListener('click', () => this.newGame());
        document.getElementById('undo')?.addEventListener('click', () => this.undo());

        new InputHandler(
            (dir) => this.handleMove(dir),
            () => this.undo(),
            document.getElementById('grid')!
        );

        this.initFromUrl();
    }

    private initFromUrl(): void {
        const urlParams = new URLSearchParams(window.location.search);
        this.debugMode = urlParams.get('debug') === 'true';
        const test = urlParams.get('test');
        const state = urlParams.get('state');

        if (test) {
            this.loadStateFromTest(test);
        } else if (state) {
            this.loadStateFromString(state);
        } else {
            this.newGame();
        }
    }

    private loadStateFromTest(type: string): void {
        const gridValues: number[][] = Array(4).fill(0).map(() => Array(4).fill(0));
        let score = 0;

        if (type === 'win') type = '2048';

        if (type === 'lose') {
            return this.loadStateFromString('0:123a|4569|7658|89a0');
        } else {
            const target = parseInt(type, 10);
            if (!isNaN(target) && target > 2) {
                const n = Math.log2(target);
                const tiles: number[] = [Math.pow(2, n - 1), Math.pow(2, n - 1)];
                for (let i = 1; i <= n - 2; i++) {
                    tiles.push(Math.pow(2, i));
                }
                tiles.forEach((val, i) => {
                    gridValues[Math.floor(i / 4)][i % 4] = val;
                    score += val;
                });
            } else {
                return this.newGame();
            }
        }

        this.engine.restoreGrid(gridValues);
        this.engine.setScore(score);
        this.history = [];
        this.gameOver = false;
        this.hasWon = false;
        this.keepPlaying = false;
        this.updateUI();
    }

    private loadStateFromString(stateStr: string): void {
        try {
            const [scoreStr, gridStr] = stateStr.split(':');
            const score = parseInt(scoreStr, 10);
            const gridValues: number[][] = [];
            const rows = gridStr.split('|');

            for (let row = 0; row < 4; row++) {
                gridValues[row] = [];
                for (let col = 0; col < 4; col++) {
                    const encoded = parseInt(rows[row][col], 16);
                    gridValues[row][col] = encoded === 0 ? 0 : Math.pow(2, encoded);
                }
            }
            this.engine.restoreGrid(gridValues);
            this.engine.setScore(score);
            this.history = [];
            this.gameOver = false;
            this.hasWon = false;
            this.keepPlaying = false;
            this.updateUI();
        } catch (e) {
            this.newGame();
        }
    }

    private newGame(): void {
        this.engine.reset();
        this.history = [];
        this.gameOver = false;
        this.hasWon = false;
        this.keepPlaying = false;
        this.renderer.hideGameMessage();
        this.renderer.clearTiles();
        this.engine.addRandomTile();
        this.engine.addRandomTile();
        this.updateUI();
    }

    private handleMove(direction: 'up' | 'down' | 'left' | 'right'): void {
        if (this.isAnimating || this.gameOver || (this.hasWon && !this.keepPlaying)) return;

        this.saveState();
        this.engine.prepareTiles();
        const { moved, winDetected } = this.engine.move(direction);

        if (moved) {
            if (winDetected) this.hasWon = true;
            this.isAnimating = true;
            this.renderer.render(this.engine.getGrid());

            setTimeout(() => {
                const newTile = this.engine.addRandomTile();
                if (newTile) this.renderer.renderTile(newTile, newTile.row, newTile.col, true, false);

                if (this.debugMode) {
                    Storage.updateUrlState(this.encodeState(), true);
                }

                setTimeout(() => {
                    this.isAnimating = false;
                    if (!this.engine.movesAvailable()) {
                        this.gameOver = true;
                        this.renderer.showGameMessage('Game Over!', false, (kp) => this.handleRetry(kp));
                    } else if (this.hasWon && !this.keepPlaying) {
                        this.renderer.showGameMessage('You Win!', true, (kp) => this.handleRetry(kp));
                    }
                }, 100);
            }, 150);

            if (this.engine.getScore() > this.bestScore) {
                this.bestScore = this.engine.getScore();
                Storage.saveBestScore(this.bestScore);
            }
            this.renderer.updateScore(this.engine.getScore(), this.bestScore);
        } else {
            this.history.pop();
            this.renderer.updateUndoButton(this.history.length === 0);
            this.renderer.showInvalidMoveAnimation(direction);
        }
    }

    private handleRetry(keepPlaying: boolean): void {
        if (keepPlaying) {
            this.keepPlaying = true;
            this.renderer.hideGameMessage();
        } else {
            this.newGame();
        }
    }

    private undo(): void {
        if (this.history.length === 0 || this.isAnimating) return;
        const state = this.history.pop()!;
        this.engine.restoreGrid(state.grid);
        this.engine.setScore(state.score);
        this.gameOver = false;
        this.renderer.hideGameMessage();
        this.updateUI();
        if (this.debugMode) {
            Storage.updateUrlState(this.encodeState(), true);
        }
    }

    private saveState(): void {
        this.history.push({
            grid: this.engine.getGridValues(),
            score: this.engine.getScore()
        });
        if (this.history.length > this.maxHistoryLength) this.history.shift();
        this.renderer.updateUndoButton(false);
    }

    private updateUI(): void {
        this.renderer.updateScore(this.engine.getScore(), this.bestScore);
        this.renderer.updateUndoButton(this.history.length === 0);
        this.renderer.render(this.engine.getGrid());
    }

    private encodeState(): string {
        const values = this.engine.getGridValues();
        const rows: string[] = [];
        for (let r = 0; r < 4; r++) {
            let rowStr = '';
            for (let c = 0; c < 4; c++) {
                const v = values[r][c];
                rowStr += (v === 0 ? 0 : Math.log2(v)).toString(16);
            }
            rows.push(rowStr);
        }
        return this.engine.getScore().toString(10) + ':' + rows.join('|');
    }
}

document.addEventListener('DOMContentLoaded', () => new App());
