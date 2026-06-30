import assert from "node:assert/strict";
import test from "node:test";
import { buildBackfillDates } from "../../lib/feed-quality/backfill.mjs";

test("buildBackfillDates returns inclusive ascending date keys", () => {
  assert.deepEqual(buildBackfillDates({ from: "2026-06-11", to: "2026-06-13" }), [
    "2026-06-11",
    "2026-06-12",
    "2026-06-13"
  ]);
});

test("buildBackfillDates rejects inverted ranges", () => {
  assert.throws(
    () => buildBackfillDates({ from: "2026-06-13", to: "2026-06-11" }),
    /from must be on or before to/
  );
});
