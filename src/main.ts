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

        const themeSelect = document.getElementById('theme') as HTMLSelectElement;
        const currentTheme = Storage.getTheme();
        themeSelect.value = currentTheme;
        this.applyTheme(currentTheme);

        themeSelect.addEventListener('change', (e) => {
            const theme = (e.target as HTMLSelectElement).value;
            this.applyTheme(theme);
            Storage.saveTheme(theme);
            this.renderer.render(this.engine.getGrid());
            themeSelect.blur();
        });

        document.getElementById('new-game')?.addEventListener('click', () => this.newGame());
        document.getElementById('undo')?.addEventListener('click', () => this.undo());

        new InputHandler(
            (dir) => this.handleMove(dir),
            () => this.undo(),
            document.getElementById('grid')!
        );

        this.initFromUrl();
    }

    private applyTheme(theme: string): void {
        document.body.className = '';
        if (theme !== 'classic') {
            document.body.classList.add(`theme-${theme}`);
        }
    }

    private initFromUrl(): void {
        const urlParams = new URLSearchParams(window.location.search);
        this.debugMode = urlParams.get('debug') === 'true';
        const state = urlParams.get('state');

        if (state) {
            this.loadStateFromString(state);
        } else {
            this.newGame();
        }
    }

    private loadStateFromString(stateStr: string): void {
        // Simple implementation for now, mirroring original logic
        try {
            const [scoreStr, gridStr] = stateStr.split('-');
            const score = parseInt(scoreStr, 36);
            const gridValues: number[][] = [];
            for (let row = 0; row < 4; row++) {
                gridValues[row] = [];
                for (let col = 0; col < 4; col++) {
                    const encoded = parseInt(gridStr[row * 4 + col], 16);
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
        let gridStr = '';
        values.flat().forEach(v => {
            gridStr += (v === 0 ? 0 : Math.log2(v)).toString(16);
        });
        return this.engine.getScore().toString(36) + '-' + gridStr;
    }
}

document.addEventListener('DOMContentLoaded', () => new App());
