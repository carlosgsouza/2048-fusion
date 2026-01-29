export class InputHandler {
    private touchStartX: number = 0;
    private touchStartY: number = 0;
    private minSwipeDistance: number = 50;

    constructor(
        private onMove: (direction: 'up' | 'down' | 'left' | 'right') => void,
        private onUndo: () => void,
        private gridElement: HTMLElement
    ) {
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));

        this.gridElement.addEventListener('touchstart', (e) => {
            this.touchStartX = e.touches[0].clientX;
            this.touchStartY = e.touches[0].clientY;
        }, { passive: true });

        this.gridElement.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });

        this.gridElement.addEventListener('touchend', (e) => {
            if (!this.touchStartX || !this.touchStartY) return;

            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;

            const deltaX = touchEndX - this.touchStartX;
            const deltaY = touchEndY - this.touchStartY;

            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                if (Math.abs(deltaX) > this.minSwipeDistance) {
                    this.onMove(deltaX > 0 ? 'right' : 'left');
                }
            } else {
                if (Math.abs(deltaY) > this.minSwipeDistance) {
                    this.onMove(deltaY > 0 ? 'down' : 'up');
                }
            }
        }, { passive: true });
    }

    private handleKeyDown(e: KeyboardEvent): void {
        if (e.key === 'z' || e.key === 'Z') {
            if (e.ctrlKey || e.metaKey || !e.shiftKey) {
                e.preventDefault();
                this.onUndo();
                return;
            }
        }

        let direction: 'up' | 'down' | 'left' | 'right' | null = null;
        switch (e.key) {
            case 'ArrowUp': case 'w': case 'W': direction = 'up'; break;
            case 'ArrowDown': case 's': case 'S': direction = 'down'; break;
            case 'ArrowLeft': case 'a': case 'A': direction = 'left'; break;
            case 'ArrowRight': case 'd': case 'D': direction = 'right'; break;
        }

        if (direction) {
            e.preventDefault();
            this.onMove(direction);
        }
    }
}
