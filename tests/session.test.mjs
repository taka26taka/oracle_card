import test from "node:test";
import assert from "node:assert/strict";
import { calendarDay } from "../lib/domain/calendar.js";
import { normalizeState, advanceVisit, getSessionState, ensureSession, setDiagnosisType, setDeepResult } from "../lib/session/oracleSession.js";

test("reject corrupt storage shapes and restore defaults for legacy data", () => {
  for (const value of [null, 1, "abc", []]) assert.equal(normalizeState(value), null);
  const state = normalizeState({ selectedTheme: "mutual", sessionId: "legacy", visitCount: "7", deepCount: 300, lastResult: { card: null } });
  assert.equal(state.diagnosisType, "mutual");
  assert.equal(state.selectedTheme, "mutual");
  assert.equal(state.sessionId, "legacy");
  assert.equal(state.visitCount, 0);
  assert.equal(state.deepCount, 2);
  assert.equal(state.lastResult, null);
  assert.equal(normalizeState({ diagnosisType: "bad", selectedTheme: "unrequited" }).diagnosisType, "unrequited");
});
test("calendar validation handles leap days and impossible dates", () => {
  assert.notEqual(calendarDay("2024-02-29"), null);
  for (const date of ["2026-02-29", "2026-02-30", "2026-13-01", "2026-1-1", {}, ""]) assert.equal(calendarDay(date), null);
});
test("visit progression uses calendar days across DST/year boundaries", () => {
  for (const [previous, today] of [["2026-03-08", "2026-03-09"], ["2026-11-01", "2026-11-02"], ["2025-12-31", "2026-01-01"]]) {
    const base = { ...normalizeState({}), lastVisitDate: previous, visitCount: 3, streakDays: 3 };
    const next = advanceVisit(base, today);
    assert.equal(next.streakDays, 4);
    assert.equal(next.visitCount, 4);
    assert.equal(base.streakDays, 3);
    assert.equal(advanceVisit(next, today).visitCount, 4);
    assert.equal(advanceVisit(next, previous).streakDays, 1);
  }
});
test("browser storage corruption and quota failure preserve session in memory", () => {
  let stored = "{broken";
  globalThis.window = { localStorage: { getItem: () => stored, setItem: (_, text) => { stored = text; } } };
  const initial = ensureSession();
  assert.ok(initial.sessionId);
  assert.equal(ensureSession().visitCount, initial.visitCount);
  window.localStorage.setItem = () => { throw new Error("QuotaExceededError"); };
  setDiagnosisType("mutual");
  assert.equal(getSessionState().diagnosisType, "mutual");
  assert.equal(getSessionState().sessionId, initial.sessionId);
  setDeepResult({ deepMessage: "safe", deepFocus: "partner_feeling" });
  assert.equal(getSessionState().deepCount, 1);
  delete globalThis.window;
});
