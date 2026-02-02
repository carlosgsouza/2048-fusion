export class SoundManager {
    private audioContext: AudioContext | null = null;
    private isMuted: boolean = false;
    private isInitialized: boolean = false;

    // Pentatonic scale for combo progression (C-D-E-G-A pattern)
    private readonly pentatonicScale: number[] = [
        659.25,   // E5 (starting note)
        783.99,   // G5
        880.00,   // A5
        1046.50,  // C6
        1174.66,  // D6
        1318.51,  // E6
        1567.98,  // G6
        1760.00   // A6
    ];

    // Combo tracking
    private comboIndex: number = 0;
    private highestSequenceValue: number = 0; // Track highest value in current sequence
    private lastMergeTime: number = 0;
    private readonly COMBO_TIMEOUT_MS: number = 1000;


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

        const now = ctx.currentTime;
        const currentTime = Date.now();

        // Check if we should reset the combo (1 second timeout)
        const timeSinceLastMerge = currentTime - this.lastMergeTime;
        const shouldReset = timeSinceLastMerge > this.COMBO_TIMEOUT_MS;

        if (shouldReset) {
            // Reset to starting note after timeout
            this.comboIndex = 0;
            this.highestSequenceValue = value; // Start new sequence
        } else if (value > this.highestSequenceValue) {
            // New personal best in this sequence: move up the scale
            this.comboIndex = Math.min(this.comboIndex + 1, this.pentatonicScale.length - 1);
            this.highestSequenceValue = value; // Update highest value
        }
        // Same or lower than highest: keep current note (no change)

        // Update tracking
        this.lastMergeTime = currentTime;

        // Get frequency from pentatonic scale based on combo
        const baseFreq = this.pentatonicScale[this.comboIndex];
        const note1Freq = baseFreq;
        const note2Freq = baseFreq * 1.5; // Perfect fifth above

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

        // Wooden tile sliding sound - brief friction noise
        const bufferSize = ctx.sampleRate * 0.05; // 50ms of noise
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);

        // Generate filtered white noise for sliding friction
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.3;
        }

        const noiseSource = ctx.createBufferSource();
        noiseSource.buffer = buffer;

        // Low-pass filter for wooden sound character
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, now); // Warm, woody frequency

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.08, now); // Increased volume
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        noiseSource.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(ctx.destination);

        // Subtle click at the end (tile settling)
        const click = ctx.createOscillator();
        click.type = 'sine';
        click.frequency.setValueAtTime(400, now + 0.04);

        const clickGain = ctx.createGain();
        clickGain.gain.setValueAtTime(0.06, now + 0.04); // Increased volume
        clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

        click.connect(clickGain);
        clickGain.connect(ctx.destination);

        noiseSource.start(now);
        click.start(now + 0.04);
        click.stop(now + 0.06);
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
        gainNode.gain.setValueAtTime(0.08, now); // Increased volume
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.08); // Slightly longer

        tap.connect(gainNode);
        gainNode.connect(ctx.destination);

        tap.start(now);
        tap.stop(now + 0.08);
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

    playVictory(): void {
        if (this.isMuted) return;

        const ctx = this.ensureAudioContext();
        if (!ctx) return;

        const now = ctx.currentTime;

        // Extended casino jackpot sound - longer ascending celebration
        const notes = [
            { freq: 523.25, delay: 0 },      // C5
            { freq: 659.25, delay: 0.24 },   // E5
            { freq: 783.99, delay: 0.48 },   // G5
            { freq: 1046.50, delay: 0.72 },  // C6
            { freq: 1318.51, delay: 0.96 },  // E6
            { freq: 1568.00, delay: 1.2 },   // G6
            { freq: 2093.00, delay: 1.44 }   // C7 - super triumphant!
        ];

        notes.forEach(({ freq, delay }) => {
            // Main bell tone
            const osc1 = ctx.createOscillator();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(freq, now + delay);

            // Harmonic richness
            const osc2 = ctx.createOscillator();
            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(freq * 2, now + delay);

            const gain1 = ctx.createGain();
            gain1.gain.setValueAtTime(0, now + delay);
            gain1.gain.linearRampToValueAtTime(0.15, now + delay + 0.02);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + delay + 2.4); // 3x longer sustain

            const gain2 = ctx.createGain();
            gain2.gain.setValueAtTime(0, now + delay);
            gain2.gain.linearRampToValueAtTime(0.08, now + delay + 0.02);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + delay + 1.8);

            osc1.connect(gain1);
            osc2.connect(gain2);
            gain1.connect(ctx.destination);
            gain2.connect(ctx.destination);

            osc1.start(now + delay);
            osc2.start(now + delay);
            osc1.stop(now + delay + 2.4);
            osc2.stop(now + delay + 1.8);
        });

        // Add a final celebratory sustained high note
        const finalNote = ctx.createOscillator();
        finalNote.type = 'sine';
        finalNote.frequency.setValueAtTime(2093.00, now + 1.68); // C7

        const finalGain = ctx.createGain();
        finalGain.gain.setValueAtTime(0, now + 1.68);
        finalGain.gain.linearRampToValueAtTime(0.25, now + 1.72);
        finalGain.gain.exponentialRampToValueAtTime(0.001, now + 3.6); // Long celebration

        finalNote.connect(finalGain);
        finalGain.connect(ctx.destination);
        finalNote.start(now + 1.68);
        finalNote.stop(now + 3.6);
    }

    playGameOver(): void {
        if (this.isMuted) return;

        const ctx = this.ensureAudioContext();
        if (!ctx) return;

        const now = ctx.currentTime;

        // Extra goofy sad trombone "wah wah wah" - lower and longer
        const sadNotes = [
            { freq: 220, delay: 0 },       // A3 (lower octave)
            { freq: 196, delay: 0.3 },     // G3
            { freq: 174.61, delay: 0.6 },  // F3
            { freq: 146.83, delay: 0.9 }   // D3 - super low and goofy
        ];

        sadNotes.forEach(({ freq, delay }) => {
            const osc = ctx.createOscillator();
            osc.type = 'sawtooth'; // Buzzy trombone-like sound
            osc.frequency.setValueAtTime(freq, now + delay);
            // Exaggerated downward wobble for extra goofiness
            osc.frequency.exponentialRampToValueAtTime(freq * 0.85, now + delay + 0.3);

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0, now + delay);
            gain.gain.linearRampToValueAtTime(0.1, now + delay + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.3);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now + delay);
            osc.stop(now + delay + 0.3);
        });
    }
}
