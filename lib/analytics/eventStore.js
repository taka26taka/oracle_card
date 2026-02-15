import { EVENT_NAMES } from "./events";
import { validateAndNormalizeEvent } from "./eventValidation";
import { getEventDb } from "./eventDb";

const CHECKOUT_ATTEMPT_TTL_MS = 48 * 60 * 60 * 1000;

const ALLOWED_EVENTS = new Set([
  EVENT_NAMES.PAGE_VIEW,
  EVENT_NAMES.THEME_SELECTED,
  EVENT_NAMES.DIAGNOSIS_COMPLETED,
  EVENT_NAMES.DRAW_EXECUTED,
  EVENT_NAMES.DRAW_COMPLETED,
  EVENT_NAMES.RESULT_FIRST_PAINT,
  EVENT_NAMES.RESULT_VIEWED,
  EVENT_NAMES.SHARE_CLICKED,
  EVENT_NAMES.DEEP_DIVE_OPENED,
  EVENT_NAMES.DEEP_FOCUS_SELECTED,
  EVENT_NAMES.PREMIUM_CTA_CLICKED,
  EVENT_NAMES.PREMIUM_INTRO_VIEWED,
  EVENT_NAMES.PREMIUM_CHECKOUT_CLICKED,
  EVENT_NAMES.PREMIUM_READING_VIEWED,
  EVENT_NAMES.PREMIUM_THREE_CARD_GENERATED,
  EVENT_NAMES.PREMIUM_ACCESS_DENIED,
  EVENT_NAMES.SCREENSHOT_INTENT,
  EVENT_NAMES.REVISIT_DETECTED,
  EVENT_NAMES.NOTE_CLICK,
  EVENT_NAMES.PURCHASE_COMPLETED
]);

const toDateKey = (ts) => {
  const date = ts ? new Date(ts) : new Date();
  if (Number.isNaN(date.getTime())) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const normalizeEvent = (event, payload = {}) => {
  if (event === EVENT_NAMES.DRAW_EXECUTED) return EVENT_NAMES.DRAW_COMPLETED;
  if (event === EVENT_NAMES.RESULT_FIRST_PAINT) return EVENT_NAMES.RESULT_VIEWED;
  if (event === EVENT_NAMES.PAGE_VIEW) {
    const page = String(payload?.meta?.page || "").trim().toLowerCase();
    return page ? `page_view_${page}` : EVENT_NAMES.PAGE_VIEW;
  }
  return event;
};

const buildFilterClause = ({ dateKey, dateFrom, dateTo, experimentId, variant } = {}) => {
  const where = [];
  const params = [];

  if (dateKey) {
    where.push("date_key = ?");
    params.push(dateKey);
  }
  if (dateFrom) {
    where.push("date_key >= ?");
    params.push(dateFrom);
  }
  if (dateTo) {
    where.push("date_key <= ?");
    params.push(dateTo);
  }
  if (experimentId) {
    where.push("experiment_id = ?");
    params.push(experimentId);
  }
  if (variant) {
    where.push("variant = ?");
    params.push(variant);
  }

  if (!where.length) {
    return { sql: "", params };
  }
  return { sql: `WHERE ${where.join(" AND ")}`, params };
};

const getCountRows = (db, options = {}) => {
  const filter = buildFilterClause(options);
  const stmt = db.prepare(`
    SELECT event_normalized, COUNT(*) AS count
    FROM events
    ${filter.sql}
    GROUP BY event_normalized
  `);
  return stmt.all(...filter.params);
};

const getUniqueUserRows = (db, options = {}) => {
  const filter = buildFilterClause(options);
  const stmt = db.prepare(`
    SELECT event_normalized, COUNT(DISTINCT user_id) AS users
    FROM events
    ${filter.sql}
    GROUP BY event_normalized
  `);
  return stmt.all(...filter.params);
};

const getCheckoutTsByAttempt = (db, attemptId) => {
  const stmt = db.prepare(`
    SELECT ts
    FROM events
    WHERE event = ? AND attempt_id = ?
    ORDER BY id DESC
    LIMIT 1
  `);
  return stmt.get(EVENT_NAMES.PREMIUM_CHECKOUT_CLICKED, attemptId);
};

const hasPurchaseByAttempt = (db, attemptId) => {
  const stmt = db.prepare(`
    SELECT 1
    FROM events
    WHERE event = ? AND attempt_id = ?
    LIMIT 1
  `);
  const row = stmt.get(EVENT_NAMES.PURCHASE_COMPLETED, attemptId);
  return Boolean(row);
};

const insertEvent = (db, payload) => {
  const normalized = normalizeEvent(payload.event, payload);
  const experimentId = payload?.meta?.experiment_id || null;
  const variant = payload?.meta?.variant || null;
  const stmt = db.prepare(`
    INSERT INTO events (
      event,
      event_normalized,
      user_id,
      session_id,
      ts,
      date_key,
      path,
      theme,
      card_id,
      attempt_id,
      page_name,
      experiment_id,
      variant,
      meta_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    payload.event,
    normalized,
    payload.sessionId,
    payload.sessionId,
    payload.ts,
    toDateKey(payload.ts),
    payload.path,
    payload.theme || null,
    Number.isFinite(payload.cardId) ? payload.cardId : null,
    payload?.meta?.attemptId || null,
    payload?.meta?.page || null,
    experimentId,
    variant,
    JSON.stringify(payload.meta || {})
  );
};

export const recordEvent = (body) => {
  const validated = validateAndNormalizeEvent(body);
  if (!validated.ok) {
    return { recorded: false, reason: "invalid_payload" };
  }
  const payload = validated.value;

  if (!ALLOWED_EVENTS.has(payload.event)) {
    return { recorded: false, reason: "invalid_payload" };
  }

  const db = getEventDb();
  const attemptId = payload?.meta?.attemptId || "";

  if (payload.event === EVENT_NAMES.PURCHASE_COMPLETED) {
    const checkoutRow = getCheckoutTsByAttempt(db, attemptId);
    if (!checkoutRow?.ts) {
      return { recorded: false, reason: "invalid_purchase_attempt" };
    }

    const checkoutTs = new Date(checkoutRow.ts).getTime();
    if (Number.isNaN(checkoutTs) || Date.now() - checkoutTs > CHECKOUT_ATTEMPT_TTL_MS) {
      return { recorded: false, reason: "expired_purchase_attempt" };
    }

    if (hasPurchaseByAttempt(db, attemptId)) {
      return { recorded: false, reason: "duplicate_purchase_attempt" };
    }
  }

  insertEvent(db, payload);
  return { recorded: true };
};

const buildStatsFromCounts = (targetDate, counts, users) => {
  const resultToNoteCv = counts.result_viewed > 0 ? (counts.note_click / counts.result_viewed) * 100 : 0;
  const noteToPurchaseCv = counts.note_click > 0 ? (counts.purchase_completed / counts.note_click) * 100 : 0;
  const lpToDrawCv = counts.page_view_lp > 0 ? (counts.draw_completed / counts.page_view_lp) * 100 : 0;
  const drawToResultCv = counts.draw_completed > 0 ? (counts.result_viewed / counts.draw_completed) * 100 : 0;
  const resultToPremiumIntroCv =
    counts.result_viewed > 0 ? (counts.premium_intro_viewed / counts.result_viewed) * 100 : 0;
  const premiumIntroToCheckoutCv =
    counts.premium_intro_viewed > 0 ? (counts.premium_checkout_clicked / counts.premium_intro_viewed) * 100 : 0;
  const checkoutToPurchaseCv =
    counts.premium_checkout_clicked > 0 ? (counts.purchase_completed / counts.premium_checkout_clicked) * 100 : 0;

  return {
    date: targetDate,
    counts,
    users,
    cv: {
      lp_to_draw: Number(lpToDrawCv.toFixed(2)),
      draw_to_result: Number(drawToResultCv.toFixed(2)),
      result_to_premium_intro: Number(resultToPremiumIntroCv.toFixed(2)),
      premium_intro_to_checkout: Number(premiumIntroToCheckoutCv.toFixed(2)),
      checkout_to_purchase: Number(checkoutToPurchaseCv.toFixed(2)),
      result_to_note: Number(resultToNoteCv.toFixed(2)),
      note_to_purchase: Number(noteToPurchaseCv.toFixed(2))
    }
  };
};

const createCountShape = () => ({
  page_view_lp: 0,
  page_view_draw: 0,
  page_view_result: 0,
  page_view_deep: 0,
  page_view_premium_intro: 0,
  page_view_premium_complete: 0,
  page_view_premium_reading: 0,
  draw_completed: 0,
  result_viewed: 0,
  deep_dive_opened: 0,
  premium_intro_viewed: 0,
  premium_checkout_clicked: 0,
  premium_reading_viewed: 0,
  premium_three_card_generated: 0,
  premium_access_denied: 0,
  share_clicked: 0,
  note_click: 0,
  purchase_completed: 0
});

export const getDailyDashboardStats = (dateKey, filters = {}) => {
  const targetDate = dateKey || toDateKey();
  const counts = {
    ...createCountShape()
  };
  const users = {
    ...createCountShape()
  };

  const db = getEventDb();
  const options = {
    dateKey: targetDate,
    experimentId: filters?.experimentId || "",
    variant: filters?.variant || ""
  };
  const rows = getCountRows(db, options);
  for (const row of rows) {
    if (Object.prototype.hasOwnProperty.call(counts, row.event_normalized)) {
      counts[row.event_normalized] = Number(row.count || 0);
    }
  }
  const uniqueUserRows = getUniqueUserRows(db, options);
  for (const row of uniqueUserRows) {
    if (Object.prototype.hasOwnProperty.call(users, row.event_normalized)) {
      users[row.event_normalized] = Number(row.users || 0);
    }
  }

  return buildStatsFromCounts(targetDate, counts, users);
};

export const getFunnelStats = ({ dateFrom, dateTo, experimentId = "", variant = "" }) => {
  const counts = {
    ...createCountShape()
  };
  const users = {
    ...createCountShape()
  };
  const db = getEventDb();
  const options = { dateFrom, dateTo, experimentId, variant };
  const rows = getCountRows(db, options);
  for (const row of rows) {
    if (Object.prototype.hasOwnProperty.call(counts, row.event_normalized)) {
      counts[row.event_normalized] = Number(row.count || 0);
    }
  }
  const uniqueUserRows = getUniqueUserRows(db, options);
  for (const row of uniqueUserRows) {
    if (Object.prototype.hasOwnProperty.call(users, row.event_normalized)) {
      users[row.event_normalized] = Number(row.users || 0);
    }
  }
  return {
    date_from: dateFrom,
    date_to: dateTo,
    experiment_id: experimentId || null,
    variant: variant || null,
    ...buildStatsFromCounts(`${dateFrom}..${dateTo}`, counts, users)
  };
};

export const getExperimentComparison = ({ dateFrom, dateTo, experimentId, variants = ["A", "B"] }) => {
  const statsByVariant = {};
  for (const variant of variants) {
    statsByVariant[variant] = getFunnelStats({ dateFrom, dateTo, experimentId, variant });
  }

  const a = statsByVariant.A?.cv || {};
  const b = statsByVariant.B?.cv || {};
  const diff = {
    lp_to_draw: Number(((b.lp_to_draw || 0) - (a.lp_to_draw || 0)).toFixed(2)),
    draw_to_result: Number(((b.draw_to_result || 0) - (a.draw_to_result || 0)).toFixed(2)),
    result_to_premium_intro: Number(((b.result_to_premium_intro || 0) - (a.result_to_premium_intro || 0)).toFixed(2)),
    premium_intro_to_checkout: Number(((b.premium_intro_to_checkout || 0) - (a.premium_intro_to_checkout || 0)).toFixed(2)),
    checkout_to_purchase: Number(((b.checkout_to_purchase || 0) - (a.checkout_to_purchase || 0)).toFixed(2))
  };

  return {
    experiment_id: experimentId,
    date_from: dateFrom,
    date_to: dateTo,
    variants: statsByVariant,
    diff_b_minus_a: diff
  };
};

export const hasCompletedPurchaseAttempt = (attemptId) => {
  if (!attemptId) return false;
  const db = getEventDb();
  return hasPurchaseByAttempt(db, attemptId);
};
