import { describe, it, expect, beforeEach } from 'vitest';
import { Engine } from '../Engine';

describe('Engine', () => {
    let engine: Engine;

    beforeEach(() => {
        engine = new Engine();
    });

    it('should initialize with a score of 0', () => {
        expect(engine.getScore()).toBe(0);
    });

    it('should add a random tile', () => {
        engine.reset();
        engine.addRandomTile();
        const values = engine.getGridValues().flat();
        expect(values.filter(v => v !== 0).length).toBe(1);
    });

    it('should merge tiles of the same value', () => {
        engine.restoreGrid([
            [2, 2, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ]);
        const result = engine.move('left');
        expect(result.moved).toBe(true);
        expect(engine.getGridValues()[0][0]).toBe(4);
        expect(engine.getScore()).toBe(4);
    });

    it('should not merge tiles of different values', () => {
        engine.restoreGrid([
            [2, 4, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ]);
        const result = engine.move('left');
        expect(result.moved).toBe(false);
        expect(engine.getGridValues()[0][0]).toBe(2);
        expect(engine.getGridValues()[0][1]).toBe(4);
    });

    it('should detect when no moves are available', () => {
        engine.restoreGrid([
            [2, 4, 2, 4],
            [4, 2, 4, 2],
            [2, 4, 2, 4],
            [4, 2, 4, 2]
        ]);
        expect(engine.movesAvailable()).toBe(false);
    });
});
