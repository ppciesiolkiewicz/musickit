import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { levelMatchDb, readNam, speedNote, toTransferable } from "./info";

const dir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
const file = (n: string) => readFileSync(join(dir, `${n}.nam`), "utf8");

test("a WaveNet file is described", () => {
  const r = readNam(file("wavenet"));
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.info.architecture, "WaveNet");
  assert.equal(r.info.name, "Test Model");
  assert.equal(r.info.gear, "Darkglass Electronics Microtubes 900 v2");
  assert.equal(r.info.sampleRate, 48000);
  assert.equal(r.info.params, 131);
  assert.ok(Math.abs((r.info.loudness ?? 0) + 20.02) < 0.01);
  assert.equal(r.info.sizes, null);
});

test("a slimmable container lists its sizes", () => {
  const r = readNam(file("slimmable_container"), "container.nam");
  assert.ok(r.ok);
  if (r.ok) {
    assert.deepEqual(r.info.sizes, [0.33, 0.66]);
    assert.ok(r.info.params > 100);
  }
});

test("bad files are refused with a message", () => {
  for (const text of ["", "not json", "{}", '{"architecture":"WaveNet"}', JSON.stringify({ architecture: "ConvNet", config: {}, weights: [] })]) {
    const r = readNam(text);
    assert.ok(!r.ok && r.error.length > 0, text);
  }
  const spec = JSON.parse(file("lstm"));
  spec.weights.pop();
  const short = readNam(JSON.stringify(spec));
  assert.ok(!short.ok && /weights/.test(short.error));
});

test("a file without a name takes the file name", () => {
  const spec = JSON.parse(file("lstm"));
  delete spec.metadata;
  const r = readNam(JSON.stringify(spec), "My Fender.nam");
  assert.ok(r.ok && r.info.name === "My Fender");
});

test("weights become typed arrays, also inside a container", () => {
  const r = readNam(file("slimmable_container"));
  assert.ok(r.ok);
  if (!r.ok) return;
  const t = toTransferable(r.spec) as { config: { submodels: { model: { weights: unknown } }[] } };
  assert.ok(t.config.submodels.every((s) => s.model.weights instanceof Float32Array));
  assert.ok(Array.isArray((r.spec as { config: { submodels: { model: { weights: unknown } }[] } }).config.submodels[0].model.weights), "the original is untouched");
});

test("level matching and the speed note", () => {
  assert.equal(levelMatchDb(null), 0);
  assert.equal(levelMatchDb(-24), 6);
  assert.equal(levelMatchDb(-80), 24);
  assert.equal(speedNote(null), null);
  assert.equal(speedNote(1.2)?.warn, true);
  assert.equal(speedNote(3)?.warn, true);
  assert.deepEqual(speedNote(7.34), { text: "7.3× real time", warn: false });
});
