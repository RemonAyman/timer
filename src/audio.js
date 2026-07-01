// Web Audio API Synthesizer for Timer and Soundboard Effects
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Helper to create a noise buffer for white noise synthesis
let noiseBuffer = null;
function getNoiseBuffer(ctx) {
  if (noiseBuffer) return noiseBuffer;
  const bufferSize = ctx.sampleRate * 2; // 2 seconds of noise
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  noiseBuffer = buffer;
  return noiseBuffer;
}

// 1. Tick Sound (Soft woodblock / mechanical tick)
export function playTick() {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1000, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.05);

    gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.06);
  } catch (e) {
    console.error('Audio tick failed:', e);
  }
}

// 2. Warning Sound (Double alert blip for low-time warning)
export function playWarning() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Play double blip
    [now, now + 0.15].forEach((time) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, time);
      osc.frequency.setValueAtTime(1500, time + 0.05);

      gainNode.gain.setValueAtTime(0.12, time);
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + 0.12);
    });
  } catch (e) {
    console.error('Audio warning failed:', e);
  }
}

// 3. Alarm Sound Loop (Continuous ringing/melody)
let alarmIntervalId = null;
let alarmOscillators = [];

export function startAlarm() {
  try {
    const ctx = getAudioContext();
    stopAlarm(); // Stop any current alarm first
    
    let step = 0;
    const playAlarmStep = () => {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      const freq = notes[step % notes.length];
      
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      // Add heavy vibrato
      osc.frequency.linearRampToValueAtTime(freq + 30, now + 0.1);
      osc.frequency.linearRampToValueAtTime(freq - 30, now + 0.25);
      
      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.3);
      alarmOscillators.push(osc);
      
      step++;
    };

    playAlarmStep();
    alarmIntervalId = setInterval(playAlarmStep, 300);
  } catch (e) {
    console.error('Alarm play failed:', e);
  }
}

export function stopAlarm() {
  if (alarmIntervalId) {
    clearInterval(alarmIntervalId);
    alarmIntervalId = null;
  }
  alarmOscillators.forEach((osc) => {
    try { osc.stop(); } catch(err) {}
  });
  alarmOscillators = [];
}

// 4. Soundboard: Duck Quack (صوت بطة)
export function playDuckQuack() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Duck quack is synthesized using a sawtooth wave and a sweeping bandpass filter with high resonance (Q)
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gainNode = ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(170, now); // Nasal base frequency
    // Pitch sweep
    osc.frequency.linearRampToValueAtTime(190, now + 0.05);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.2);
    
    filter.type = 'bandpass';
    filter.Q.value = 4.0; // High resonance to mimic vocal tract
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.exponentialRampToValueAtTime(1200, now + 0.06);
    filter.frequency.exponentialRampToValueAtTime(300, now + 0.22);
    
    gainNode.gain.setValueAtTime(0.01, now);
    gainNode.gain.linearRampToValueAtTime(0.25, now + 0.03); // Fast attack
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25); // Release
    
    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.28);
    
    // Play a secondary micro-quack immediately after to sound realistic
    const delay = 0.08;
    const osc2 = ctx.createOscillator();
    const filter2 = ctx.createBiquadFilter();
    const gain2 = ctx.createGain();
    
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(160, now + delay);
    osc2.frequency.exponentialRampToValueAtTime(130, now + delay + 0.15);
    
    filter2.type = 'bandpass';
    filter2.Q.value = 3.5;
    filter2.frequency.setValueAtTime(450, now + delay);
    filter2.frequency.exponentialRampToValueAtTime(1000, now + delay + 0.05);
    filter2.frequency.exponentialRampToValueAtTime(350, now + delay + 0.18);
    
    gain2.gain.setValueAtTime(0.01, now + delay);
    gain2.gain.linearRampToValueAtTime(0.2, now + delay + 0.02);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.2);
    
    osc2.connect(filter2);
    filter2.connect(gain2);
    gain2.connect(ctx.destination);
    
    osc2.start(now + delay);
    osc2.stop(now + delay + 0.22);
  } catch (e) {
    console.error('Duck sound failed:', e);
  }
}

// 5. Soundboard: Air Horn (بوق الملاعب)
export function playAirHorn() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const duration = 0.8;
    
    // Create multiple detuned oscillators for a fat, chorus-like brass horn sound
    const frequencies = [220, 221.5, 222.8, 330, 440, 443];
    const gainNodes = [];
    const oscillators = [];
    
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.01, now);
    masterGain.gain.linearRampToValueAtTime(0.3, now + 0.05); // Attack
    masterGain.gain.setValueAtTime(0.3, now + duration - 0.15);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + duration); // Release
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1800, now);
    
    frequencies.forEach((freq) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      
      // Slight pitch drift for authenticity
      osc.frequency.linearRampToValueAtTime(freq + (Math.random() * 5 - 2.5), now + duration);
      
      osc.connect(filter);
      oscillators.push(osc);
    });
    
    filter.connect(masterGain);
    masterGain.connect(ctx.destination);
    
    oscillators.forEach((osc) => osc.start(now));
    oscillators.forEach((osc) => osc.stop(now + duration));
  } catch (e) {
    console.error('Air horn failed:', e);
  }
}

// 6. Soundboard: Retro Laser (ليزر خيالي)
export function playLaser() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const duration = 0.35;
    
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = 'sawtooth';
    // Deep downward frequency sweep
    osc.frequency.setValueAtTime(2200, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + duration);
    
    gainNode.gain.setValueAtTime(0.18, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + duration);
  } catch (e) {
    console.error('Laser sound failed:', e);
  }
}

// 7. Soundboard: Game Show Buzzer (بوق الخطأ)
export function playBuzzer() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const duration = 0.5;
    
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gainNode = ctx.createGain();
    
    // Buzzing frequencies (harsh minor interval)
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(100, now);
    
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(104, now);
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, now);
    
    gainNode.gain.setValueAtTime(0.01, now);
    gainNode.gain.linearRampToValueAtTime(0.28, now + 0.02);
    gainNode.gain.setValueAtTime(0.28, now + duration - 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
    
    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc1.start(now);
    osc2.start(now);
    
    osc1.stop(now + duration);
    osc2.stop(now + duration);
  } catch (e) {
    console.error('Buzzer sound failed:', e);
  }
}

// 8. Soundboard: Fanfare / Celebration (احتفال ونجاح)
export function playFanfare() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    const playNote = (freq, startTime, duration, volume = 0.1) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);
      
      // Vibrato
      const vibrato = ctx.createOscillator();
      const vibratoGain = ctx.createGain();
      vibrato.frequency.value = 6; // Hz
      vibratoGain.gain.value = freq * 0.015; // pitch shift size
      
      vibrato.connect(vibratoGain);
      vibratoGain.connect(osc.frequency);
      
      gainNode.gain.setValueAtTime(0.01, startTime);
      gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      vibrato.start(startTime);
      osc.start(startTime);
      
      vibrato.stop(startTime + duration);
      osc.stop(startTime + duration);
    };
    
    // Play a happy retro brass triad sequence
    const tempo = 0.14;
    playNote(261.63, now, tempo * 0.8); // C4
    playNote(329.63, now + tempo, tempo * 0.8); // E4
    playNote(392.00, now + tempo * 2, tempo * 0.8); // G4
    playNote(523.25, now + tempo * 3, tempo * 1.5); // C5
    
    // Chord resolve
    const chordTime = now + tempo * 4.5;
    playNote(329.63, chordTime, 0.8, 0.06); // E4
    playNote(392.00, chordTime, 0.8, 0.06); // G4
    playNote(523.25, chordTime, 0.8, 0.06); // C5
    playNote(659.25, chordTime, 0.8, 0.06); // E5
  } catch (e) {
    console.error('Fanfare failed:', e);
  }
}
