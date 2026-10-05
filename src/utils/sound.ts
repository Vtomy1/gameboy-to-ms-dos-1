/**
 * Authentic PC Speaker emulation (Intel 8253 Programmable Interval Timer + 8255 PPI Port 0x61).
 * Generates classic hardware square wave chirps, chiptune arpeggios, and BIOS beeps.
 */

class PcSpeakerEngine {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setEnabled(enable: boolean) {
    this.enabled = enable;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Play a raw frequency on the PC Speaker (Timer 2 reload frequency = 1,193,182 Hz / divisor)
   */
  public playTone(freqHz: number, durationMs: number, type: OscillatorType = 'square') {
    if (!this.enabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freqHz, this.ctx.currentTime);

      // Low volume to prevent harsh clipping, authentic raw square buzzer feel
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + durationMs / 1000);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + durationMs / 1000);
    } catch {
      // Audio autoplay policy catch
    }
  }

  /**
   * Standard IBM PC POST BIOS Beep (896 Hz, 150ms)
   */
  public biosBeep() {
    this.playTone(896, 120, 'square');
  }

  /**
   * Game Boy / DOS Action Sound: Coin Pickup (Arpeggio B5 -> E6)
   */
  public playCoin() {
    if (!this.enabled) return;
    this.playTone(987.77, 80, 'square');
    setTimeout(() => {
      this.playTone(1318.51, 140, 'square');
    }, 70);
  }

  /**
   * Game Boy / DOS Action Sound: Jump / Laser (frequency sweep downward)
   */
  public playJump() {
    if (!this.enabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(300, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(750, this.ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.07, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.12);
    } catch {
      // Ignore audio policy
    }
  }

  /**
   * Game Boy / DOS Action Sound: Footstep / Click
   */
  public playStep() {
    this.playTone(220, 30, 'triangle');
  }

  /**
   * Game Boy / DOS Action Sound: Hit / Damage (Low rumble buzz)
   */
  public playHit() {
    this.playTone(110, 160, 'sawtooth');
  }
}

export const pcSpeaker = new PcSpeakerEngine();
