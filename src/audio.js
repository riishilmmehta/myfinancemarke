export class AudioSystem {
  constructor() {
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    
    // AudioContext must be created after user gesture
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.5;
    this.masterGain.connect(this.ctx.destination);

    this.initEngine();
    this.initWind();

    this.initialized = true;
  }

  initEngine() {
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0; // Starts silent

    this.engineOsc.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);
    
    this.engineOsc.start();
  }

  initWind() {
    const bufferSize = this.ctx.sampleRate * 2; // 2 seconds
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1; // White noise
    }

    this.windSource = this.ctx.createBufferSource();
    this.windSource.buffer = buffer;
    this.windSource.loop = true;

    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.Q.value = 1.5;

    this.windGain = this.ctx.createGain();
    this.windGain.gain.value = 0;

    this.windSource.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.masterGain);
    
    this.windSource.start();
  }

  playBlip(freq = 880, duration = 0.1) {
    if (!this.initialized) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    // Fast attack, exponential decay
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, this.ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  update(speed, maxSpeed, throttle) {
    if (!this.initialized) return;

    const absSpeed = Math.abs(speed);
    const speedRatio = Math.min(absSpeed / maxSpeed, 1.5);
    const time = this.ctx.currentTime;

    // Engine sound dynamics
    const targetFreq = 50 + speedRatio * 150 + Math.abs(throttle) * 50;
    this.engineOsc.frequency.setTargetAtTime(targetFreq, time, 0.1);
    
    const targetCutoff = 200 + speedRatio * 2000;
    this.engineFilter.frequency.setTargetAtTime(targetCutoff, time, 0.1);
    
    const engineVol = 0.1 + (Math.abs(throttle) * 0.2) + (speedRatio * 0.1);
    this.engineGain.gain.setTargetAtTime(engineVol, time, 0.1);

    // Wind sound dynamics
    this.windFilter.frequency.setTargetAtTime(400 + speedRatio * 800, time, 0.1);
    this.windGain.gain.setTargetAtTime(speedRatio * 0.4, time, 0.2);
  }
}
