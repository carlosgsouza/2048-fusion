import { Tile, Position } from './types';

export class Engine {
    private size: number = 4;
    private grid: (Tile | null)[][] = [];
    private score: number = 0;
    private tileIdCounter: number = 0;

    constructor() {
        this.reset();
    }

    reset(): void {
        this.grid = Array(this.size).fill(null).map(() => Array(this.size).fill(null));
        this.score = 0;
        this.tileIdCounter = 0;
    }

    getGrid(): (Tile | null)[][] {
        return this.grid;
    }

    getScore(): number {
        return this.score;
    }

    setScore(score: number): void {
        this.score = score;
    }

    getGridValues(): number[][] {
        return this.grid.map(row => row.map(tile => tile ? tile.value : 0));
    }

    restoreGrid(values: number[][]): void {
        this.grid = values.map((row, r) =>
            row.map((value, c) => {
                if (value === 0) return null;
                return this.createTile(r, c, value, false);
            })
        );
    }

    createTile(row: number, col: number, value: number, isNew: boolean = true): Tile {
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

    addRandomTile(): Tile | null {
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

    prepareTiles(): void {
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

    move(direction: 'up' | 'down' | 'left' | 'right'): { moved: boolean, scoreGain: number, winDetected: boolean, mergedValues: number[] } {
        let moved = false;
        let scoreGain = 0;
        let winDetected = false;
        const mergedValues: number[] = [];

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
                        const merged = this.createTile(next.row, next.col, tile.value * 2, false);
                        merged.mergedFrom = [tile, nextTile];
                        merged.previousRow = tile.row;
                        merged.previousCol = tile.col;

                        this.grid[tile.row][tile.col] = null;
                        this.grid[next.row][next.col] = merged;

                        tile.row = next.row;
                        tile.col = next.col;

                        scoreGain += merged.value;
                        mergedValues.push(merged.value);
                        moved = true;

                        if (merged.value === 2048) {
                            winDetected = true;
                        }
                        continue;
                    }
                }

                if (furthest.row !== row || furthest.col !== col) {
                    this.grid[tile.row][tile.col] = null;
                    this.grid[furthest.row][furthest.col] = tile;
                    tile.row = furthest.row;
                    tile.col = furthest.col;
                    moved = true;
                }
            }
        }

        if (moved) {
            this.score += scoreGain;
        }

        return { moved, scoreGain, winDetected, mergedValues };
    }

    private buildTraversals(vector: { row: number; col: number }): { rows: number[]; cols: number[] } {
        const rows = Array.from({ length: this.size }, (_, i) => i);
        const cols = Array.from({ length: this.size }, (_, i) => i);
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

    movesAvailable(): boolean {
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                if (!this.grid[row][col]) return true;
                const tile = this.grid[row][col]!;
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
}
