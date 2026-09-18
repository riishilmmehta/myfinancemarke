export const WAVES = [
  { dir: [1, 0.4], freq: 0.055, amp: 0.55, speed: 1.1 },
  { dir: [-0.35, 1], freq: 0.085, amp: 0.38, speed: 0.85 },
  { dir: [0.7, -0.7], freq: 0.14, amp: 0.22, speed: 1.6 },
  { dir: [-1, -0.25], freq: 0.22, amp: 0.12, speed: 2.1 },
];

export function waveHeight(x, z, t) {
  let y = 0;
  for (const w of WAVES) {
    const phase = (x * w.dir[0] + z * w.dir[1]) * w.freq + t * w.speed;
    y += Math.sin(phase) * w.amp;
  }
  return y;
}

export function waveSlope(x, z, t) {
  const e = 0.6;
  const dx = (waveHeight(x + e, z, t) - waveHeight(x - e, z, t)) / (2 * e);
  const dz = (waveHeight(x, z + e, t) - waveHeight(x, z - e, t)) / (2 * e);
  return { dx, dz };
}

export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function sign(x) {
  return Math.sign(x);
}
