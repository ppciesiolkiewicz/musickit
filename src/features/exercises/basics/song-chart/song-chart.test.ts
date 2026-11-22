import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { REST, STYLES, findStyle } from "@/features/backing/model";
import { arrange } from "@/features/backing/model/arrange";
import { docOf } from "../../docs";
import { LIMITS, OPEN_CHORDS, barChords, chartChords, chartNumerals, chartStep, layChart } from "./chart";

const verse = { name: "Verse", bars: ["G", "G", "C", "G"] };
const chorus = { name: "Chorus", bars: ["C", "D", "G", "Em D"] };

describe("song-chart: the chart", () => {
  it("a bar is one chord, or two with a space between", () => {
    assert.deepEqual(barChords("G"), ["G"]);
    assert.deepEqual(barChords(" C   G "), ["C", "G"]);
    assert.deepEqual(barChords(""), []);
  });

  it("lays the sections out as written, or in the order the form names them", () => {
    const plain = layChart([verse, chorus]);
    assert.deepEqual(plain.parts.map((p) => p.name), ["Verse", "Chorus"]);
    assert.equal(plain.bars, 8);
    const laid = layChart([verse, chorus], ["Verse", "Chorus", "Verse"]);
    assert.deepEqual(laid.parts.map((p) => [p.name, p.section, p.bars[0].index, p.bars.length]), [["Verse", 0, 0, 4], ["Chorus", 1, 4, 4], ["Verse", 0, 8, 4]]);
    assert.equal(laid.bars, 12);
    assert.deepEqual(laid.parts[1].bars[3], { index: 7, inPart: 3, chords: ["Em", "D"] });
    // a name no section has is passed over; none left: as written
    assert.deepEqual(layChart([verse, chorus], ["Chorus", "Solo"]).parts.map((p) => p.name), ["Chorus"]);
    assert.deepEqual(layChart([verse, chorus], ["Solo"]).parts.map((p) => p.name), ["Verse", "Chorus"]);
  });

  it("gives the band one numeral per chord, a bar of two as two halves, and says where each sits", () => {
    const { parts } = layChart([verse, chorus], ["Verse", "Chorus"]);
    const { numerals, slots, unplayed } = chartNumerals(parts, "G");
    assert.deepEqual(numerals, ["I", "I", "IV", "I", "IV", "V", "I", "vi:0.5", "V:0.5"]);
    assert.deepEqual(slots.slice(6), [{ bar: 6, chord: 0 }, { bar: 7, chord: 0 }, { bar: 7, chord: 1 }]);
    assert.deepEqual(unplayed, []);
    // the band's arrangement is as long as the chart, in every style, and has a chord for every slot
    for (const style of STYLES) {
      const arr = arrange(numerals, "G", style);
      assert.equal(arr.beats, 8 * style.beatsPerBar, style.id);
      assert.equal(arr.chords.length, slots.length, style.id);
    }
    // a minor key counts from the major scale of its root
    assert.deepEqual(chartNumerals(layChart([{ name: "A", bars: ["Am", "G", "F", "E7"] }]).parts, "A").numerals, ["i", "bVII", "bVI", "V7"]);
  });

  it("a chord the band cannot voice keeps its bar as a rest and is named, once", () => {
    const { parts } = layChart([{ name: "Verse", bars: ["C", "Xyz", "F", "G Xyz"] }]);
    const { numerals, slots, unplayed } = chartNumerals(parts, "C");
    assert.deepEqual(numerals, ["I", REST, "IV", "V:0.5", `${REST}:0.5`]);
    assert.deepEqual(unplayed, ["Xyz"]);
    const arr = arrange(numerals, "C", findStyle("pop"));
    assert.equal(arr.beats, 16);
    assert.equal(arr.chords.length, slots.length);
    assert.deepEqual(arr.chords.map((c) => [c.symbol, c.beat]), [["C", 0], ["", 4], ["F", 8], ["G", 12], ["", 14]]);
    assert.ok(arr.events.filter((e) => e.beat >= 4 && e.beat < 8).every((e) => e.part === "drums"));
  });

  it("says its step on the path: four open chords in two sections, or hidden for the ear", () => {
    const open = [{ name: "Verse", bars: ["G", "G", "C", "G"] }, { name: "Chorus", bars: ["C", "D", "G", "Em"] }];
    assert.equal(chartStep(open, undefined, false), "four-chords");
    assert.equal(chartStep(open, ["Verse", "Chorus", "Verse"], false), "four-chords");
    assert.equal(chartStep(open, ["Verse", "Verse"], false), null);
    assert.equal(chartStep([verse, chorus], undefined, false), null); // a bar of two chords
    assert.equal(chartStep([open[0], { name: "Chorus", bars: ["C", "D", "Am", "Em"] }], undefined, false), null); // five chords
    assert.equal(chartStep([open[0], { name: "Chorus", bars: ["F", "G"] }], undefined, false), null); // F is no open chord of the track
    assert.equal(chartStep([verse, chorus], undefined, true), "by-ear");
    assert.equal(OPEN_CHORDS.length, 7);
    assert.deepEqual(chartChords(layChart(open).parts), ["G", "C", "D", "Em"]);
  });

  it("the props say the limits the parser keeps", () => {
    const props = docOf("song-chart")!.props;
    const by = (name: string) => props.find((p) => p.name === name)!.description;
    assert.ok(by("sections").includes(`up to ${LIMITS.sections}`) && by("sections").includes(`up to ${LIMITS.bars}`));
    assert.ok(by("form").includes(`up to ${LIMITS.form} sections and ${LIMITS.total} bars`));
    assert.ok(by("repeat").includes(`${LIMITS.repeat[0]}-${LIMITS.repeat[1]}`));
    for (const s of STYLES) assert.ok(by("style").includes(`"${s.id}"`), s.id);
    assert.equal(props.find((p) => p.name === "sections")!.required, true);
  });
});
