// A procedural underwater soundscape built entirely with the Web Audio API -
// no external audio files to fetch, license, or wait on, so sound is ready
// the instant it's requested.
// Reference: https://developer.mozilla.org/docs/Web/API/Web_Audio_API

export class OceanAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this._bubbleTimer = null;
  }

  // Must be called from a user gesture - browsers block audio playback
  // until one occurs, so this is wired to the "Enter the Ocean" button.
  start() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);

    this._startDrone();
    this._startNoiseBed();
    this._scheduleAmbientBubbles();
  }

  // Three detuned low oscillators, each with a slow LFO breathing on a
  // lowpass filter cutoff - reads as a distant, moving underwater drone.
  _startDrone() {
    const freqs = [55, 82.5, 110];
    freqs.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = i === 1 ? 'triangle' : 'sine';
      osc.frequency.value = freq;

      const gain = this.ctx.createGain();
      gain.gain.value = 0.05;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;

      osc.connect(gain).connect(filter).connect(this.master);
      osc.start();

      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 0.05 + i * 0.02;
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 150;
      lfo.connect(lfoGain).connect(filter.frequency);
      lfo.start();
    });
  }

  // Filtered brownian noise for the "water texture" bed under the drone.
  _startNoiseBed() {
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 500;
    filter.Q.value = 0.6;

    const gain = this.ctx.createGain();
    gain.gain.value = 0.15;

    noise.connect(filter).connect(gain).connect(this.master);
    noise.start();
  }

  _scheduleAmbientBubbles() {
    const tick = () => {
      if (!this.ctx) return;
      this.playBubble(0.15);
      this._bubbleTimer = setTimeout(tick, 2000 + Math.random() * 4000);
    };
    this._bubbleTimer = setTimeout(tick, 1500);
  }

  // Short pitch-swept blip, used both for ambient bubbles and click feedback.
  playBubble(volume = 0.3) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const startFreq = 300 + Math.random() * 300;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(startFreq * 2.2, now + 0.18);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    osc.connect(gain).connect(this.master);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  toggleMute() {
    if (!this.ctx) return this.muted;
    this.muted = !this.muted;
    this.master.gain.setTargetAtTime(this.muted ? 0 : 0.5, this.ctx.currentTime, 0.15);
    return this.muted;
  }

  dispose() {
    clearTimeout(this._bubbleTimer);
    this.ctx?.close();
  }
}
