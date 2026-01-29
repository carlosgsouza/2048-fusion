export interface GameState {
    grid: number[][];
    score: number;
}

export interface Position {
    row: number;
    col: number;
}

export interface Tile {
    id: number;
    value: number;
    row: number;
    col: number;
    previousRow: number | null;
    previousCol: number | null;
    mergedFrom: Tile[] | null;
    isNew: boolean;
}
