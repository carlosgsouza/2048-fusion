export class SoundManager {
    private audioContext: AudioContext | null = null;
    private isMuted: boolean = false;
    private isInitialized: boolean = false;

    // Map tile values to frequencies (using a pentatonic-ish scale for pleasant sound)
    private readonly frequencyMap: Record<number, number> = {
        2: 220.00,    // A3
        4: 246.94,    // B3
        8: 277.18,    // C#4
        16: 311.13,   // D#4
        32: 349.23,   // F4
        64: 392.00,   // G4
        128: 440.00,  // A4
        256: 493.88,  // B4
        512: 554.37,  // C#5
        1024: 622.25, // D#5
        2048: 698.46, // F5
        4096: 783.99, // G5
        8192: 880.00  // A5
    };

    constructor() {
        this.loadMutePreference();
    }

    private loadMutePreference(): void {
        const saved = localStorage.getItem('soundMuted');
        this.isMuted = saved === 'true';
    }

    private initAudioContext(): void {
        if (this.isInitialized) return;

        try {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            this.isInitialized = true;
        } catch (e) {
            console.warn('Web Audio API not supported', e);
        }
    }

    private ensureAudioContext(): AudioContext | null {
        if (!this.audioContext && !this.isInitialized) {
            this.initAudioContext();
        }

        // Resume context if it's suspended (browser autoplay policy)
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        return this.audioContext;
    }

    playMerge(value: number): void {
        if (this.isMuted) return;

        const ctx = this.ensureAudioContext();
        if (!ctx) return;

        const frequency = this.frequencyMap[value] || 440;
        const now = ctx.currentTime;

        // Create oscillator for the main tone
        const oscillator = ctx.createOscillator();
        oscillator.type = 'square'; // Retro square wave sound
        oscillator.frequency.setValueAtTime(frequency, now);

        // Create gain node for envelope
        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.15, now + 0.01); // Quick attack
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15); // Decay

        // Connect nodes
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        // Play sound
        oscillator.start(now);
        oscillator.stop(now + 0.15);
    }

    playSpawn(): void {
        if (this.isMuted) return;

        const ctx = this.ensureAudioContext();
        if (!ctx) return;

        const now = ctx.currentTime;

        // Create a subtle "pop" sound
        const oscillator = ctx.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, now);
        oscillator.frequency.exponentialRampToValueAtTime(400, now + 0.05);

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.08, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.start(now);
        oscillator.stop(now + 0.05);
    }

    playInvalidMove(): void {
        if (this.isMuted) return;

        const ctx = this.ensureAudioContext();
        if (!ctx) return;

        const now = ctx.currentTime;

        // Create a low "buzz" sound for invalid moves
        const oscillator = ctx.createOscillator();
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(100, now);

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.start(now);
        oscillator.stop(now + 0.1);
    }

    toggleMute(): boolean {
        this.isMuted = !this.isMuted;
        localStorage.setItem('soundMuted', String(this.isMuted));
        return this.isMuted;
    }

    isSoundMuted(): boolean {
        return this.isMuted;
    }

    setMuted(muted: boolean): void {
        this.isMuted = muted;
        localStorage.setItem('soundMuted', String(this.isMuted));
    }
}
