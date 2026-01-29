export class Storage {
    private static BEST_SCORE_KEY = '2048-best-score';
    private static THEME_KEY = '2048-theme';

    static getBestScore(): number {
        const saved = localStorage.getItem(this.BEST_SCORE_KEY);
        return saved ? parseInt(saved, 10) : 0;
    }

    static saveBestScore(score: number): void {
        localStorage.setItem(this.BEST_SCORE_KEY, score.toString());
    }

    static getTheme(): string {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('theme') || localStorage.getItem(this.THEME_KEY) || 'neon';
    }

    static saveTheme(theme: string): void {
        localStorage.setItem(this.THEME_KEY, theme);
        const url = new URL(window.location.href);
        if (theme === 'neon') {
            url.searchParams.delete('theme');
        } else {
            url.searchParams.set('theme', theme);
        }
        window.history.replaceState({}, '', url);
    }

    static updateUrlState(state: string, debugMode: boolean): void {
        if (!debugMode) return;
        const url = new URL(window.location.href);
        url.searchParams.set('state', state);
        window.history.replaceState({}, '', url);
    }
}
