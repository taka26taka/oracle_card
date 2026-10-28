import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStatsFromCounts, createCountShape } from '../lib/analytics/statistics.js';
test('CV calculation is pure and zero denominators remain finite', () => {
  const counts = createCountShape();
  const users = createCountShape();
  const empty = buildStatsFromCounts('2026-10-28', counts, users);
  assert.ok(Object.values(empty.cv).every(value => value === 0));
  counts.page_view_lp = 10; counts.draw_completed = 5; counts.result_viewed = 4;
  users.page_view_lp = 4; users.draw_completed = 3;
  const result = buildStatsFromCounts('2026-10-28', counts, users);
  assert.equal(result.cv.lp_to_draw, 50);
  assert.equal(result.cv.draw_to_result, 80);
  assert.equal(result.user_cv.lp_to_draw, 75);
  assert.equal(counts.page_view_lp, 10);
});
