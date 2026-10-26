import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { encodeWav } from "./wav";

const text = (b: Uint8Array, from: number, to: number) => String.fromCharCode(...b.slice(from, to));

describe("encodeWav", () => {
  const bytes = encodeWav([Float32Array.of(0, 2, -2), Float32Array.of(0.5, -0.5, 0)], 48000);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  it("has a 44-byte header and 16-bit samples", () => {
    assert.equal(bytes.length, 44 + 12);
    assert.equal(text(bytes, 0, 4), "RIFF");
    assert.equal(view.getUint32(4, true), bytes.length - 8);
    assert.equal(text(bytes, 8, 12), "WAVE");
    assert.equal(text(bytes, 36, 40), "data");
    assert.equal(view.getUint16(22, true), 2);
    assert.equal(view.getUint32(24, true), 48000);
    assert.equal(view.getUint16(34, true), 16);
    assert.equal(view.getUint32(40, true), 12);
  });

  it("interleaves the channels and clips to the 16-bit range", () => {
    const s = (i: number) => view.getInt16(44 + i * 2, true);
    assert.deepEqual([0, 1, 2, 3, 4, 5].map(s), [0, 16384, 32767, -16384, -32768, 0]);
  });
});
