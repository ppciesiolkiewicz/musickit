import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { channelWaveforms, clockTime, extensionFor, inputChannels, peakLevel, pickMimeType, soundGate, SOUND_HOLD_MS, takeFileName, waveformBars } from "./recorder";

describe("recorder", () => {
  it("picks the first format the browser records", () => {
    assert.equal(pickMimeType((t) => t.startsWith("audio/webm")), "audio/webm;codecs=opus");
    assert.equal(pickMimeType((t) => t === "audio/mp4"), "audio/mp4");
    assert.equal(pickMimeType(() => false), "");
  });
  it("names the extension from the type", () => {
    assert.equal(extensionFor("audio/webm;codecs=opus"), "webm");
    assert.equal(extensionFor("audio/mp4;codecs=mp4a.40.2"), "m4a");
    assert.equal(extensionFor("audio/ogg;codecs=opus"), "ogg");
    assert.equal(extensionFor(""), "webm");
  });
  it("shows the clock as m:ss", () => {
    assert.equal(clockTime(7.9), "0:07");
    assert.equal(clockTime(750), "12:30");
    assert.equal(clockTime(-3), "0:00");
    assert.equal(clockTime(NaN), "0:00");
  });
  it("names a take by its number and time", () => {
    assert.equal(takeFileName(3, new Date(2026, 9, 27, 14, 5), "audio/mp4"), "attunr-take-3-2026-10-27-1405.m4a");
  });
  it("draws a waveform from the loudest sample of each slice", () => {
    assert.deepEqual(waveformBars([0, 0.1, -0.5, 0.2, 0.25, 0], 3), [0.2, 1, 0.5]);
    assert.deepEqual(waveformBars([0, 0, 0, 0], 2), [0, 0]);
    assert.deepEqual(waveformBars([0.5], 0), []);
  });
  it("draws each channel's waveform on one scale", () => {
    assert.deepEqual(channelWaveforms([[0.5, 0.25], [0.1, -0.2]], 2), [[1, 0.5], [0.2, 0.4]]);
    assert.deepEqual(channelWaveforms([[0, 0]], 1), [[0]]);
  });
  it("reads the peak level", () => {
    assert.equal(peakLevel([128, 128, 128]), 0);
    assert.equal(peakLevel([128, 192, 100]), 0.5);
    assert.equal(peakLevel([0, 255]), 1);
  });
  it("shows two channels only for a two-channel input", () => {
    assert.equal(inputChannels(2), 2);
    assert.equal(inputChannels(1), 1);
    assert.equal(inputChannels(undefined), 1);
  });
  it("hears sound over the threshold and holds it a moment after", () => {
    const gate = soundGate();
    assert.equal(gate(0.01, 0), false);
    assert.equal(gate(0.3, 10), true);
    assert.equal(gate(0.01, 10 + SOUND_HOLD_MS - 1), true);
    assert.equal(gate(0.01, 10 + SOUND_HOLD_MS), false);
  });
});
