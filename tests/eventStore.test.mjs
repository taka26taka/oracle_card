import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";

// Start with the pre-experiment schema to exercise the real forward migration.
const directory = mkdtempSync(join(tmpdir(), "oracle-db-test-"));
process.env.EVENT_DB_PATH = join(directory, "events.sqlite");
const legacy = new Database(process.env.EVENT_DB_PATH);
legacy.exec(`CREATE TABLE events (
 id INTEGER PRIMARY KEY AUTOINCREMENT, event TEXT NOT NULL, event_normalized TEXT NOT NULL,
 user_id TEXT NOT NULL, session_id TEXT NOT NULL, ts TEXT NOT NULL, date_key TEXT NOT NULL,
 path TEXT NOT NULL, theme TEXT, card_id INTEGER, attempt_id TEXT, page_name TEXT,
 meta_json TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now'))
)`);
legacy.close();
const { recordEvent, hasCompletedPurchaseAttempt, getDailyDashboardStats, getExperimentComparison } = await import("../lib/analytics/eventStore.js");
const { getEventDb } = await import("../lib/analytics/eventDb.js");
const event = (name, attemptId, extra = {}) => ({ event: name, sessionId: "session", ts: new Date().toISOString(), path: "/premium/intro", meta: { attemptId, success: true, provider: "test", externalOrderId: `order_${attemptId}` }, ...extra });

test("old database migrates before index creation and preserves purchase lifecycle", () => {
  const db = getEventDb();
  assert.ok(db.prepare("PRAGMA table_info(events)").all().some(row => row.name === "experiment_id"));
  assert.equal(recordEvent(event("purchase_success", "missing")).reason, "invalid_purchase_attempt");
  assert.equal(recordEvent(event("premium_checkout_clicked", "a")).recorded, true);
  assert.equal(recordEvent(event("purchase_completed", "a")).reason, "missing_purchase_success");
  assert.equal(hasCompletedPurchaseAttempt("a", "session"), false);
  assert.equal(recordEvent(event("purchase_success", "a", { sessionId: "wrong" })).reason, "invalid_purchase_session");
  assert.equal(recordEvent(event("purchase_success", "a")).recorded, true);
  assert.equal(recordEvent(event("purchase_success", "a")).reason, "duplicate_purchase_success");
  assert.equal(hasCompletedPurchaseAttempt("a", "session"), true);
  assert.equal(hasCompletedPurchaseAttempt("a", "wrong"), false);
  assert.equal(recordEvent(event("purchase_completed", "a")).recorded, true);
  assert.equal(recordEvent(event("purchase_completed", "a")).reason, "duplicate_purchase_attempt");
  for (const [id, offset] of [["old", -49 * 3600000], ["future", 3600000]]) {
    recordEvent(event("premium_checkout_clicked", id, { ts: new Date(Date.now() + offset).toISOString() }));
    assert.equal(recordEvent(event("purchase_success", id)).reason, "expired_purchase_attempt");
  }
  recordEvent(event("premium_checkout_clicked", "other"));
  assert.equal(recordEvent(event("purchase_success", "other", { meta: { attemptId: "other", success: true, provider: "test", externalOrderId: "order_a" } })).reason, "reused_order_id");
  assert.equal(recordEvent(event("premium_checkout_clicked", "a", { sessionId: "attacker" })).reason, "invalid_purchase_session");
  assert.equal(getDailyDashboardStats().counts.purchase_success, 1);
});

test("JST day boundary, unique sessions and AB comparison use bound filters", () => {
  const send = (name, sessionId, variant, ts = "2026-10-27T15:00:00.000Z") => recordEvent({
    event: name, sessionId, ts, path: "/", meta: { page: "lp", experiment_id: "test_ab", variant }
  });
  send("page_view", "a", "A"); send("page_view", "a", "A"); send("draw_executed", "a", "A");
  send("page_view", "b", "B"); send("draw_executed", "b", "B");
  send("page_view", "before", "A", "2026-10-27T14:59:59.999Z");
  const stats = getDailyDashboardStats("2026-10-28", { experimentId: "test_ab", variant: "A" });
  assert.equal(stats.counts.page_view_lp, 2);
  assert.equal(stats.users.page_view_lp, 1);
  assert.equal(stats.cv.lp_to_draw, 50);
  assert.equal(stats.user_cv.lp_to_draw, 100);
  const comparison = getExperimentComparison({ dateFrom: "2026-10-28", dateTo: "2026-10-28", experimentId: "test_ab" });
  assert.equal(comparison.diff_b_minus_a.lp_to_draw, 50);
  assert.equal(getDailyDashboardStats("2026-10-28", { experimentId: "test_ab' OR 1=1 --" }).counts.page_view_lp, 0);
});

test.after(() => {
  getEventDb().close();
  rmSync(directory, { recursive: true, force: true });
});
