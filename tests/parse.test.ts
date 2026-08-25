// Modelden gelen metnin tipli veriye dönüştüğü sınırın testleri.
// Fixture'lar gerçek API cevabı, şu komutla yakalandı:
//   node --env-file=.env scripts/identify.ts <foto> --dump tests/fixtures/<ad>
// Böylece test, API'nin hiç göndermediği bir şekle uyum sağlamıyor.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseResult } from "../shared/eachlabs.ts";
import { IdentifyError } from "../shared/types.ts";

function fixture(name: string): unknown {
  const path = new URL(`./fixtures/${name}/poll.json`, import.meta.url);
  return (JSON.parse(readFileSync(path, "utf8")) as { output: unknown }).output;
}

test("parses a real identification into the app's contract", () => {
  const { result, neededRepair } = parseResult(fixture("plant"));

  assert.equal(result.is_plant, true);
  assert.equal(result.family, "Boraginaceae");
  assert.match(result.scientific_name, /^Myosotis/);
  assert.ok(result.confidence > 0.5 && result.confidence <= 1);
  assert.ok(result.care.summary.length > 0, "care summary drives the result card");
  assert.ok(result.toxicity.details.length > 0, "toxicity is the field people act on");
  assert.ok(["none", "mild", "serious"].includes(result.toxicity.severity));
  assert.ok(Array.isArray(result.alternatives));
  assert.equal(neededRepair, false, "response_schema should make repair unnecessary");
});

test("reports a non-plant instead of inventing a species", () => {
  const { result } = parseResult(fixture("not-plant"));

  assert.equal(result.is_plant, false);
  assert.equal(result.scientific_name, "");
});

test("recovers from a markdown-fenced answer and flags the repair", () => {
  const fenced = "```json\n" + JSON.stringify({ is_plant: true, confidence: 0.9 }) + "\n```";
  const { result, neededRepair } = parseResult(fenced);

  assert.equal(result.is_plant, true);
  assert.equal(neededRepair, true, "the repair must be visible, not silent");
});

test("fills missing optional fields rather than crashing the screen", () => {
  const { result } = parseResult(JSON.stringify({ is_plant: true, confidence: 0.8 }));

  assert.equal(result.common_name, "");
  assert.equal(result.care.difficulty, "moderate");
  assert.equal(result.care.light.value, "");
  assert.equal(result.toxicity.severity, "none");
  assert.deepEqual(result.alternatives, []);
});

test("rejects an answer missing the fields the UI branches on", () => {
  assert.throws(
    () => parseResult(JSON.stringify({ common_name: "Rose" })),
    (err: unknown) => err instanceof IdentifyError && err.code === "bad_output",
  );
});

test("turns unparseable output into a typed error, never a raw crash", () => {
  assert.throws(
    () => parseResult("the model was feeling chatty today"),
    (err: unknown) => err instanceof IdentifyError && err.code === "bad_output",
  );
});

test("unwraps a double-encoded JSON string", () => {
  const doubled = JSON.stringify(JSON.stringify({ is_plant: true, confidence: 0.7 }));
  const { result } = parseResult(doubled);

  assert.equal(result.is_plant, true);
  assert.equal(result.confidence, 0.7);
});

test("keeps the care values short enough to scan", () => {
  const { result } = parseResult(fixture("plant"));

  for (const fact of [result.care.light, result.care.water, result.care.soil]) {
    assert.ok(fact.value.length > 0, "every care fact needs a label");
    assert.ok(
      fact.value.split(/\s+/).length <= 6,
      `care value should be a label, got: ${fact.value}`,
    );
  }
  assert.ok(result.care.summary.length < 140, "the summary is one sentence, not a paragraph");
});
