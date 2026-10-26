/** 16-bit PCM WAV of the given channels, samples clipped to [-1, 1]. */
export function encodeWav(channels: Float32Array[], sampleRate: number): Uint8Array {
  const n = channels.length;
  const frames = n ? channels[0].length : 0;
  const dataSize = frames * n * 2;
  const out = new Uint8Array(44 + dataSize);
  const view = new DataView(out.buffer);
  const tag = (at: number, s: string) => [...s].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)));
  tag(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  tag(8, "WAVE");
  tag(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, n, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * n * 2, true);
  view.setUint16(32, n * 2, true);
  view.setUint16(34, 16, true);
  tag(36, "data");
  view.setUint32(40, dataSize, true);
  let at = 44;
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < n; c++) {
      const v = Math.max(-1, Math.min(1, channels[c][i]));
      view.setInt16(at, Math.round(v < 0 ? v * 32768 : v * 32767), true);
      at += 2;
    }
  }
  return out;
}
