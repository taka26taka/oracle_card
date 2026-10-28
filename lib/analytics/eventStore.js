import { buildStatsFromCounts, createCountShape } from "./statistics.js";
import { EVENT_NAMES } from "./events.js";
import { validateAndNormalizeEvent } from "./eventValidation.js";
import { getEventDb } from "./eventDb.js";

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
  EVENT_NAMES.OTHER_ACTIONS_TOGGLED,
  EVENT_NAMES.REVISIT_DETECTED,
  EVENT_NAMES.NOTE_CLICK,
  EVENT_NAMES.PURCHASE_SUCCESS,
  EVENT_NAMES.PURCHASE_COMPLETED
]);

// One business timezone for writes and default dashboard dates, independent of host TZ.
const toDateKey = (ts) => new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit"
}).format(ts ? new Date(ts) : new Date());

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

const getCheckoutAttemptByAttemptId = (db, attemptId) => {
  const stmt = db.prepare(`
    SELECT ts, session_id
    FROM events
    WHERE event = ? AND attempt_id = ?
    ORDER BY id DESC
    LIMIT 1
  `);
  return stmt.get(EVENT_NAMES.PREMIUM_CHECKOUT_CLICKED, attemptId);
};

const hasEventByAttempt = (db, eventName, attemptId, sessionId = "") => {
  const baseSql = `
    SELECT 1
    FROM events
    WHERE event = ? AND attempt_id = ?
  `;
  const sql = sessionId ? `${baseSql} AND session_id = ? LIMIT 1` : `${baseSql} LIMIT 1`;
  const stmt = db.prepare(sql);
  const row = sessionId ? stmt.get(eventName, attemptId, sessionId) : stmt.get(eventName, attemptId);
  return Boolean(row);
};

const hasPurchaseCompletedByAttempt = (db, attemptId) => {
  return hasEventByAttempt(db, EVENT_NAMES.PURCHASE_COMPLETED, attemptId);
};

const hasPurchaseSuccessByAttempt = (db, attemptId, sessionId = "") => {
  return hasEventByAttempt(db, EVENT_NAMES.PURCHASE_SUCCESS, attemptId, sessionId);
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
  return db.transaction(() => {
    const attemptId = payload?.meta?.attemptId || "";
    const isPurchaseSuccess = payload.event === EVENT_NAMES.PURCHASE_SUCCESS;
    const isPurchaseCompleted = payload.event === EVENT_NAMES.PURCHASE_COMPLETED;
    const requiresCheckoutValidation = isPurchaseSuccess || isPurchaseCompleted;
    if (payload.event === EVENT_NAMES.PREMIUM_CHECKOUT_CLICKED) {
      const existing = getCheckoutAttemptByAttemptId(db, attemptId);
      if (existing) return { recorded: false, reason: existing.session_id === payload.sessionId
        ? "duplicate_purchase_attempt" : "invalid_purchase_session" };
    }


    if (requiresCheckoutValidation) {
      const checkoutRow = getCheckoutAttemptByAttemptId(db, attemptId);
      if (!checkoutRow?.ts) {
        return { recorded: false, reason: "invalid_purchase_attempt" };
      }
      if (!checkoutRow?.session_id || checkoutRow.session_id !== payload.sessionId) {
        return { recorded: false, reason: "invalid_purchase_session" };
      }

      const checkoutTs = new Date(checkoutRow.ts).getTime();
      if (Number.isNaN(checkoutTs) || checkoutTs > Date.now() || Date.now() - checkoutTs > CHECKOUT_ATTEMPT_TTL_MS) {
        return { recorded: false, reason: "expired_purchase_attempt" };
      }
    }

    if (isPurchaseSuccess) {
      const provider = payload.meta.provider;
      const orderId = payload.meta.externalOrderId;
      if (provider && orderId) {
        const order = db.prepare(`SELECT attempt_id FROM events WHERE event = ?
          AND json_extract(meta_json, '$.provider') = ?
          AND json_extract(meta_json, '$.externalOrderId') = ? LIMIT 1`)
          .get(EVENT_NAMES.PURCHASE_SUCCESS, provider, orderId);
        if (order && order.attempt_id !== attemptId) return { recorded: false, reason: "reused_order_id" };
      }
      if (payload?.meta?.success !== true) {
        return { recorded: false, reason: "invalid_purchase_status" };
      }
      if (hasPurchaseSuccessByAttempt(db, attemptId, payload.sessionId)) {
        return { recorded: false, reason: "duplicate_purchase_success" };
      }
    }

    if (isPurchaseCompleted) {
      if (!hasPurchaseSuccessByAttempt(db, attemptId, payload.sessionId)) {
        return { recorded: false, reason: "missing_purchase_success" };
      }
      if (hasPurchaseCompletedByAttempt(db, attemptId)) {
        return { recorded: false, reason: "duplicate_purchase_attempt" };
      }
    }

    insertEvent(db, payload);
    return { recorded: true };
  }).immediate();
};

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

export const hasCompletedPurchaseAttempt = (attemptId, sessionId = "") => {
  if (!attemptId || !sessionId) return false;
  const db = getEventDb();
  return hasPurchaseSuccessByAttempt(db, attemptId, sessionId);
};
