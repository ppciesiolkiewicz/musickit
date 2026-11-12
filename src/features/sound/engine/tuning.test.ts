import { test } from "node:test";
import assert from "node:assert/strict";
import { INSTRUMENTS, getInstrumentConfig } from "./instruments";
import { instrumentSamples } from "./samples";

const ids = Object.keys(INSTRUMENTS);

test("every sample of every built-in instrument has a measured or pinned tuning", () => {
  for (const id of ids) {
    const tuning = getInstrumentConfig(id)!.tuning;
    assert.ok(tuning, `${id} has a tuning`);
    for (const s of instrumentSamples(id)) assert.equal(typeof tuning[s.midi], "number", `${id}: sample ${s.midi} (${s.url}) has a value`);
  }
});

test("no tuning moves a sample by more than 60 cents: past that the sample is wrong, not out of tune", () => {
  for (const id of ids) for (const [m, c] of Object.entries(getInstrumentConfig(id)!.tuning ?? {})) assert.ok(Math.abs(c) <= 60, `${id}: sample ${m} measures ${c}`);
});
