export class Storage {
    private static BEST_SCORE_KEY = '2048-best-score';

    static getBestScore(): number {
        const saved = localStorage.getItem(this.BEST_SCORE_KEY);
        return saved ? parseInt(saved, 10) : 0;
    }

    static saveBestScore(score: number): void {
        localStorage.setItem(this.BEST_SCORE_KEY, score.toString());
    }

    static updateUrlState(state: string, debugMode: boolean): void {
        if (!debugMode) return;
        const url = new URL(window.location.href);
        url.searchParams.set('state', state);
        window.history.replaceState({}, '', url);
    }
}
