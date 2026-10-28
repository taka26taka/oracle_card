import test from "node:test";
import assert from "node:assert/strict";
import { readJson, validateReading, validatePurchase, validateAnalyticsQuery } from "../lib/api/request.js";
import { validateAndNormalizeEvent } from "../lib/analytics/eventValidation.js";
const request = (body) => new Request("http://localhost", { method: "POST", body });
test("bounded JSON accepts object and rejects malformed/non-object/oversized input", async () => {
  assert.deepEqual(await readJson(request('{"ok":true}')), { ok: true });
  for (const body of ["{", "null", "[]", "true"]) await assert.rejects(readJson(request(body)), { status: 400 });
  await assert.rejects(readJson(request(JSON.stringify({ value: "あ".repeat(6000) }))), { status: 413 });
  const advertised = new Request("http://localhost", { method: "POST", body: "{}", headers: { "content-length": "17000" } });
  await assert.rejects(readJson(advertised), { status: 413 });
});
test("reading and purchase reject invalid types/enums/ranges", () => {
  validateReading({ cardName: "月", theme: "mutual" });
  for (const body of [{}, { cardName: {} }, { cardName: "a".repeat(81) }, { cardName: "月", theme: "bad" }, { cardName: "月", deepFocus: 5 }]) assert.throws(() => validateReading(body));
  for (const body of [{ attemptId: [], sessionId: "s" }, { attemptId: "a", sessionId: "s", amount: -1 }, { attemptId: "a", sessionId: "s", cardId: 1.5 }]) assert.throws(() => validatePurchase(body));
});
test("analytics query rejects impossible dates and reversed range", () => {
  for (const query of ["date=2026-02-30", "date=invalid", "date_from=2026-03-01&date_to=2026-02-01", "compare=yes"]) assert.throws(() => validateAnalyticsQuery(new URLSearchParams(query)));
  validateAnalyticsQuery(new URLSearchParams("date=2024-02-29"));
});
test("event identifiers must not be truncated and timestamps are canonical", () => {
  const event = { event: "draw_executed", sessionId: "s", ts: "2026-10-28T09:00:00+09:00", path: "/draw" };
  assert.equal(validateAndNormalizeEvent(event).value.ts, "2026-10-28T00:00:00.000Z");
  for (const extra of [{ sessionId: "s".repeat(121) }, { cardId: -1 }, { ts: "no" }, { meta: { attemptId: 15 } }]) assert.equal(validateAndNormalizeEvent({ ...event, ...extra }).ok, false);
});
