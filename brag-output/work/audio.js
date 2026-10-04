// Score for the brag video: F major, 100 BPM, 22.8s. Music and SFX share one key and one reverb.
const fs = require('fs');
const SR = 48000, DUR = 22.8, N = Math.round(SR * DUR);
const BEAT = 0.6, BAR = 2.4;
const music = [new Float32Array(N), new Float32Array(N)];
const send = [new Float32Array(N), new Float32Array(N)];   // reverb send
const hz = m => 440 * Math.pow(2, (m - 69) / 12);

// deterministic noise
let seed = 7; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 * 2 - 1; };

function add(t0, len, fn, gain, pan = 0, rev = 0.2) {
  const s0 = Math.round(t0 * SR), n = Math.round(len * SR);
  const gl = gain * Math.cos((pan + 1) * Math.PI / 4), gr = gain * Math.sin((pan + 1) * Math.PI / 4);
  for (let i = 0; i < n; i++) {
    const k = s0 + i; if (k < 0 || k >= N) continue;
    const v = fn(i / SR);
    music[0][k] += v * gl; music[1][k] += v * gr;
    send[0][k] += v * gl * rev; send[1][k] += v * gr * rev;
  }
}
const env = (t, a, d) => (t < a ? t / a : Math.exp(-(t - a) * d));

// ----- chords (MIDI): Fmaj7, Am7, Bbmaj7, C(add9) -----
const chords = [[53, 57, 60, 64], [57, 60, 64, 67], [58, 62, 65, 69], [60, 64, 67, 74]];
const roots = [41, 45, 46, 48];
const bars = Math.ceil(DUR / BAR);

for (let b = 0; b < bars; b++) {
  const ch = chords[b % 4], t0 = b * BAR;
  // warm pad: soft partials, slow attack, gentle detune
  ch.forEach((m, j) => {
    const f = hz(m);
    add(t0, BAR + 0.8, t => {
      const a = Math.min(1, t / 0.5) * (t > BAR ? Math.max(0, 1 - (t - BAR) / 0.8) : 1);
      return a * (Math.sin(2 * Math.PI * f * t) + 0.35 * Math.sin(2 * Math.PI * f * 2.003 * t) + 0.12 * Math.sin(2 * Math.PI * f * 3 * t)
        + 0.6 * Math.sin(2 * Math.PI * f * 1.004 * t + 1));
    }, 0.018, (j - 1.5) * 0.35, 0.35);
  });
  // bass: root on beats 1 and 3 (enters at the reveal)
  if (t0 + 0.001 >= 2.4) for (const off of [0, 2 * BEAT]) {
    const f = hz(roots[b % 4]);
    add(t0 + off, 1.1, t => env(t, 0.01, 3.2) * (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(4 * Math.PI * f * t)), 0.16, 0, 0.05);
  }
  // electric-piano arpeggio, 8th notes
  const arp = [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[3] + 12, ch[2] + 12, ch[1] + 12, ch[3] + 12, ch[2] + 12];
  arp.forEach((m, i) => {
    const f = hz(m), st = t0 + i * BEAT / 2;
    add(st, 1.0, t => env(t, 0.004, 5.5) * (Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(4 * Math.PI * f * t) * Math.exp(-t * 9)),
      0.05 * (i % 2 ? 0.75 : 1), (i % 2 ? 0.4 : -0.4), 0.35);
  });
}

// felt kick on every beat from the reveal, out for the last bar so the ending breathes
for (let t = 3.0; t < DUR - 2.4; t += BEAT) {
  add(t, 0.35, x => Math.sin(2 * Math.PI * (45 * x + (110 - 45) * (1 - Math.exp(-x * 30)) / 30)) * Math.exp(-x * 11), 0.22, 0, 0);
}
// quiet shaker on the off-beats from the typing scene
for (let t = 6.6 + BEAT / 2; t < DUR - 2.4; t += BEAT) {
  let prev = 0;
  add(t, 0.09, x => { const n = rnd(), hp = n - prev; prev = n; return hp * Math.exp(-x * 45); }, 0.018, 0.3, 0.15);
}

// ----- SFX, all in F major pentatonic (F G A C D) -----
const pluck = (t0, m, g = 0.06, pan = 0) => { const f = hz(m);
  add(t0, 1.2, t => env(t, 0.003, 7) * (Math.sin(2 * Math.PI * f * t) + 0.2 * Math.sin(6 * Math.PI * f * t) * Math.exp(-t * 20)), g, pan, 0.5); };
const swell = (tEnd, len, g = 0.05) => { let lp = 0;
  add(tEnd - len, len + 0.15, t => { const n = rnd(); const c = 0.02 + 0.25 * Math.min(1, t / len); lp += c * (n - lp);
    const a = t < len ? Math.pow(t / len, 2) : Math.max(0, 1 - (t - len) / 0.15); return lp * a; }, g, 0, 0.6); };
const bell = (t0, m, g = 0.05, pan = 0) => { const f = hz(m);
  add(t0, 2.5, t => Math.exp(-t * 2.2) * (Math.sin(2 * Math.PI * f * t) + 0.4 * Math.sin(2 * Math.PI * f * 2.76 * t) * Math.exp(-t * 3) + 0.2 * Math.sin(2 * Math.PI * f * 5.4 * t) * Math.exp(-t * 6)), g, pan, 0.6); };

// hook: chips pile in, one soft muted pluck each
const pent = [77, 79, 81, 84, 86, 81, 79, 84, 77, 86, 81, 84];
pent.forEach((m, i) => pluck(i * 0.07 + 0.05, m - 12, 0.03, (i % 2 ? .5 : -.5)));
// transitions: soft airy swells into each cut
[3.0, 6.6, 12.0, 15.6, 18.6].forEach(c => swell(c, 0.45, 0.06));
// reveal: orange highlight lands
bell(3.55, 77, 0.035);
// typing: a pluck as each request bubble appears, a tiny tick for each reply
[[6.93, 81], [7.83, 84], [8.73, 86]].forEach(([t, m]) => pluck(t, m, 0.05));
[[7.85, 89], [8.75, 91], [9.95, 93]].forEach(([t, m]) => pluck(t, m, 0.022, 0.3));
// way back: soft low thud when v4 breaks, then a falling run (rewind), then a chime on "restored"
add(12.95, 0.4, t => Math.sin(2 * Math.PI * hz(50) * t) * Math.exp(-t * 14), 0.12, 0, 0.1);
[84, 81, 79, 77].forEach((m, i) => pluck(13.22 + i * 0.1, m, 0.035, 0.3 - i * 0.2));
[77, 81, 84].forEach((m, i) => bell(13.68 + i * 0.03, m + 12, 0.03));
// proof card and outro
bell(15.7, 81, 0.03);
[65, 69, 72, 77].forEach((m, i) => bell(18.72 + i * 0.04, m + 12, 0.035, (i - 1.5) * 0.3));
pluck(20.92, 84, 0.04);

// ----- reverb (Schroeder: 4 combs + 2 allpasses) -----
function reverb(x, offs) {
  const y = new Float32Array(N);
  for (const [d, g] of [[1557, .82], [1617, .81], [1491, .83], [1422, .84]].map(([d, g]) => [Math.round((d + offs) * SR / 44100), g])) {
    const buf = new Float32Array(d); let idx = 0, lp = 0;
    for (let i = 0; i < N; i++) { const out = buf[idx]; lp = out * 0.7 + lp * 0.3; buf[idx] = x[i] + lp * g; idx = (idx + 1) % d; y[i] += out * 0.25; }
  }
  for (const d of [225, 556].map(d => Math.round(d * SR / 44100))) {
    const buf = new Float32Array(d); let idx = 0;
    for (let i = 0; i < N; i++) { const b = buf[idx], v = -y[i] * 0.5 + b; buf[idx] = y[i] + b * 0.5; y[i] = v; idx = (idx + 1) % d; }
  }
  return y;
}
const rv = [reverb(send[0], 0), reverb(send[1], 23)];

// ----- mix, fades, soft limit, write 16-bit WAV -----
const out = Buffer.alloc(44 + N * 4);
let peak = 0; const mix = [new Float32Array(N), new Float32Array(N)];
for (let c = 0; c < 2; c++) for (let i = 0; i < N; i++) {
  const t = i / SR, fade = Math.min(1, t / 0.03) * Math.min(1, Math.max(0, (DUR - t) / 1.6));
  mix[c][i] = Math.tanh((music[c][i] + rv[c][i] * 0.55) * 1.4) * fade; peak = Math.max(peak, Math.abs(mix[c][i]));
}
const norm = 0.89 / peak;
out.write('RIFF', 0); out.writeUInt32LE(36 + N * 4, 4); out.write('WAVEfmt ', 8); out.writeUInt32LE(16, 16);
out.writeUInt16LE(1, 20); out.writeUInt16LE(2, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 4, 28);
out.writeUInt16LE(4, 32); out.writeUInt16LE(16, 34); out.write('data', 36); out.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) for (let c = 0; c < 2; c++) out.writeInt16LE(Math.round(mix[c][i] * norm * 32767), 44 + i * 4 + c * 2);
fs.writeFileSync('soundtrack.wav', out);
console.log('soundtrack.wav', DUR + 's', 'peak before norm', peak.toFixed(3));
