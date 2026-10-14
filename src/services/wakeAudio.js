let audioContext = null;
let masterBus = null;
let activeSources = new Set();

function getAudioContext() {
  if (typeof window === "undefined") return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  audioContext ||= new AudioContextClass();
  return audioContext;
}

function getMasterBus(context) {
  if (masterBus) return masterBus;

  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = -24;
  compressor.knee.value = 18;
  compressor.ratio.value = 5;
  compressor.attack.value = 0.012;
  compressor.release.value = 0.28;
  masterBus = context.createGain();
  masterBus.gain.value = 0.48;
  masterBus.connect(compressor);
  compressor.connect(context.destination);
  return masterBus;
}

async function prepareAudio() {
  try {
    const context = getAudioContext();
    if (!context) return null;
    if (context.state === "suspended") await context.resume();
    return context;
  } catch {
    return null;
  }
}

function addSource(source) {
  activeSources.add(source);
  source.addEventListener?.("ended", () => activeSources.delete(source));
  return source;
}

function envelope(context, bus, start, duration, peak) {
  const gain = context.createGain();
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const volume = reducedMotion ? peak * 0.45 : peak;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + Math.min(0.08, duration * 0.2));
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  gain.connect(bus);
  return gain;
}

function filteredOscillator(context, bus, options) {
  const start = context.currentTime + (options.delay || 0);
  const oscillator = addSource(context.createOscillator());
  const filter = context.createBiquadFilter();
  const gain = envelope(context, bus, start, options.duration, options.volume);
  oscillator.type = options.type || "sawtooth";
  oscillator.frequency.setValueAtTime(options.frequency, start);
  if (options.endFrequency) oscillator.frequency.exponentialRampToValueAtTime(options.endFrequency, start + options.duration);
  filter.type = options.filterType || "lowpass";
  filter.frequency.setValueAtTime(options.filterFrequency || 520, start);
  filter.Q.setValueAtTime(options.q || 1.2, start);
  oscillator.connect(filter);
  filter.connect(gain);
  oscillator.start(start);
  oscillator.stop(start + options.duration + 0.04);
}

function filteredNoise(context, bus, options) {
  const start = context.currentTime + (options.delay || 0);
  const length = Math.max(1, Math.floor(context.sampleRate * options.duration));
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  let previous = 0;
  for (let index = 0; index < length; index += 1) {
    const white = Math.random() * 2 - 1;
    previous = previous * 0.82 + white * 0.18;
    data[index] = options.color === "metal" ? white : previous;
  }
  const source = addSource(context.createBufferSource());
  const filter = context.createBiquadFilter();
  const gain = envelope(context, bus, start, options.duration, options.volume);
  source.buffer = buffer;
  filter.type = options.filterType || "bandpass";
  filter.frequency.setValueAtTime(options.filterFrequency || 280, start);
  filter.Q.setValueAtTime(options.q || 0.8, start);
  source.connect(filter);
  filter.connect(gain);
  source.start(start);
  source.stop(start + options.duration + 0.04);
}

function metalLock(context, bus, delay = 0, weight = 1) {
  filteredNoise(context, bus, { duration: 0.16, delay, volume: 0.18 * weight, filterFrequency: 760, filterType: "bandpass", q: 2.4, color: "metal" });
  filteredOscillator(context, bus, { type: "triangle", frequency: 82, endFrequency: 48, duration: 0.3, delay: delay + 0.015, volume: 0.24 * weight, filterFrequency: 260, q: 1.8 });
  filteredOscillator(context, bus, { type: "sine", frequency: 148, endFrequency: 92, duration: 0.42, delay: delay + 0.035, volume: 0.1 * weight, filterFrequency: 340 });
}

function hydraulicActuator(context, bus, delay = 0, weight = 1) {
  filteredNoise(context, bus, { duration: 0.62, delay, volume: 0.18 * weight, filterFrequency: 310, filterType: "lowpass", q: 0.85 });
  filteredNoise(context, bus, { duration: 0.26, delay: delay + 0.05, volume: 0.07 * weight, filterFrequency: 780, filterType: "bandpass", q: 0.65 });
  filteredOscillator(context, bus, { type: "sawtooth", frequency: 39, endFrequency: 23, duration: 0.66, delay: delay + 0.03, volume: 0.16 * weight, filterFrequency: 155, q: 1.5 });
}

function actuatorTravel(context, bus, delay = 0, weight = 1) {
  filteredOscillator(context, bus, { type: "sawtooth", frequency: 31, endFrequency: 18, duration: 0.92, delay, volume: 0.2 * weight, filterFrequency: 125, q: 1.8 });
  filteredOscillator(context, bus, { type: "triangle", frequency: 74, endFrequency: 39, duration: 0.64, delay: delay + 0.13, volume: 0.13 * weight, filterFrequency: 220, q: 1.6 });
  filteredNoise(context, bus, { duration: 0.72, delay: delay + 0.08, volume: 0.09 * weight, filterFrequency: 360, filterType: "lowpass", q: 0.9 });
}

export async function playWakeStart() {
  const context = await prepareAudio();
  if (!context) return;
  const bus = getMasterBus(context);
  filteredOscillator(context, bus, { type: "sine", frequency: 26, endFrequency: 34, duration: 2.1, volume: 0.2, filterFrequency: 92, q: 0.9 });
  filteredOscillator(context, bus, { type: "sawtooth", frequency: 34, endFrequency: 51, duration: 0.9, delay: 0.24, volume: 0.08, filterFrequency: 145, q: 1.7 });
  hydraulicActuator(context, bus, 0.48, 0.55);
}

export async function playCoreIgnition() {
  const context = await prepareAudio();
  if (!context) return;
  const bus = getMasterBus(context);
  actuatorTravel(context, bus, 0, 0.85);
  hydraulicActuator(context, bus, 0.18, 0.8);
  metalLock(context, bus, 0.82, 1.2);
}

export async function playHydraulicMovement() {
  const context = await prepareAudio();
  if (!context) return;
  hydraulicActuator(context, getMasterBus(context), 0, 0.72);
}

export async function playMechanicalActivation() {
  const context = await prepareAudio();
  if (!context) return;
  const bus = getMasterBus(context);
  actuatorTravel(context, bus, 0, 0.48);
  hydraulicActuator(context, bus, 0.2, 0.8);
  metalLock(context, bus, 0.56, 0.9);
}

export async function playModuleActivation() {
  return playMechanicalActivation();
}

export async function playMechanicalLock() {
  const context = await prepareAudio();
  if (!context) return;
  metalLock(context, getMasterBus(context), 0, 0.85);
}

export async function playSystemOnline() {
  const context = await prepareAudio();
  if (!context) return;
  const bus = getMasterBus(context);
  actuatorTravel(context, bus, 0, 0.9);
  hydraulicActuator(context, bus, 0.14, 1);
  metalLock(context, bus, 0.76, 1.35);
  filteredOscillator(context, bus, { type: "triangle", frequency: 48, endFrequency: 25, duration: 0.84, delay: 0.82, volume: 0.15, filterFrequency: 120, q: 1.7 });
}

export function stopWakeAudio() {
  activeSources.forEach((source) => {
    try {
      source.stop?.();
      source.disconnect?.();
    } catch {
      // Audio cleanup is best effort and never blocks the UI.
    }
  });
  activeSources.clear();
}

export function getWakeAudioState() {
  return audioContext?.state || "unavailable";
}