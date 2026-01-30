export class SoundManager {
    private audioContext: AudioContext | null = null;
    private isMuted: boolean = false;
    private isInitialized: boolean = false;


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

    playMerge(): void {
        if (this.isMuted) return;

        const ctx = this.ensureAudioContext();
        if (!ctx) return;

        const now = ctx.currentTime;

        // Fixed gentle harp sound
        const note1Freq = 659.25; // E5
        const note2Freq = 880.00; // A5

        /**
         * Helper to create a plucked harp sound
         * @param freq Frequency in Hz
         * @param startTime Start time in seconds
         * @param duration Sustain/decay duration
         * @param volume Peak gain value
         */
        const playHarpNote = (freq: number, startTime: number, duration: number, volume: number) => {
            // Main tone (Sine for the fundamental)
            const osc1 = ctx.createOscillator();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(freq, startTime);

            // Harmonic (Triangle for the bright "pluck" texture)
            const osc2 = ctx.createOscillator();
            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(freq * 2, startTime); // Octave harmonic

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0, startTime);

            // Rapid attack
            gain.gain.linearRampToValueAtTime(volume, startTime + 0.005);
            // Exponential decay to create the ringing effect
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(ctx.destination);

            // Simple echo to simulate harp resonance
            const delay = ctx.createDelay();
            delay.delayTime.setValueAtTime(0.05, startTime);
            const delayGain = ctx.createGain();
            delayGain.gain.setValueAtTime(volume * 0.2, startTime);

            gain.connect(delay);
            delay.connect(delayGain);
            delayGain.connect(ctx.destination);

            osc1.start(startTime);
            osc2.start(startTime);
            osc1.stop(startTime + duration);
            osc2.stop(startTime + duration);
        };

        // Note 1: E5 (Short grace note - shorter and more subtle)
        playHarpNote(note1Freq, now, 0.3, 0.05);

        // Note 2: A5 (Main sustained note - shorter and more subtle)
        playHarpNote(note2Freq, now + 0.08, 0.6, 0.06);
    }

    playSpawn(): void {
        if (this.isMuted) return;

        const ctx = this.ensureAudioContext();
        if (!ctx) return;

        const now = ctx.currentTime;

        // Slot machine "ding" - quick bright chime
        const ding1 = ctx.createOscillator();
        ding1.type = 'sine';
        ding1.frequency.setValueAtTime(1200, now);

        const ding2 = ctx.createOscillator();
        ding2.type = 'sine';
        ding2.frequency.setValueAtTime(1600, now);

        const gain1 = ctx.createGain();
        gain1.gain.setValueAtTime(0.03, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

        const gain2 = ctx.createGain();
        gain2.gain.setValueAtTime(0.02, now);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

        ding1.connect(gain1);
        ding2.connect(gain2);
        gain1.connect(ctx.destination);
        gain2.connect(ctx.destination);

        ding1.start(now);
        ding2.start(now);
        ding1.stop(now + 0.04);
        ding2.stop(now + 0.03);
    }

    playInvalidMove(): void {
        if (this.isMuted) return;

        const ctx = this.ensureAudioContext();
        if (!ctx) return;

        const now = ctx.currentTime;

        // Subtle, gentle "tap" - neutral feedback, not annoying
        const tap = ctx.createOscillator();
        tap.type = 'sine'; // Soft sine wave
        tap.frequency.setValueAtTime(400, now); // Mid-range, neutral tone

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.025, now); // Very quiet
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05); // Very short

        tap.connect(gainNode);
        gainNode.connect(ctx.destination);

        tap.start(now);
        tap.stop(now + 0.05);
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
