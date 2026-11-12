import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { getInstrumentConfig } from "./instruments";
import { instrumentSamples } from "./samples";

/** every id a saved looper project, a backing style or a setting may name */
const IDS = ["PIANO", "ACCORDION", "BASSOON", "CELLO", "ELEC_PIANO", "FLUTE", "HONKY_TONK_PIANO", "METAL_GUITAR", "POP_LEAD", "SYNTH_ACCORDION", "SYNTH_BRASS", "SYNTH_LEAD"];

test("every instrument id still plays, from samples that are in the repo", () => {
  for (const id of IDS) {
    assert.ok(getInstrumentConfig(id), `${id} has a config`);
    const samples = instrumentSamples(id);
    assert.ok(samples.length >= 4, `${id} has ${samples.length} samples`);
    for (const s of samples) assert.ok(fs.existsSync(path.join(process.cwd(), "public", s.url)), `${id}: ${s.url} is in public/`);
  }
});

test("no instrument plays the old Casio files", () => {
  for (const id of IDS) for (const s of instrumentSamples(id)) assert.doesNotMatch(s.url, /\.wav$/, `${id}: ${s.url}`);
});

test("samples are at most a fifth apart, as the old set was at worst, so no note is moved far", () => {
  for (const id of IDS) {
    const notes = instrumentSamples(id).map((s) => s.midi).sort((a, b) => a - b);
    for (let i = 1; i < notes.length; i++) assert.ok(notes[i] - notes[i - 1] <= 7, `${id}: gap ${notes[i - 1]}→${notes[i]}`);
  }
});
