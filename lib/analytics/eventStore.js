const MAX_EVENTS = 10000;
const store = [];
const purchaseAttempts = new Set();
const checkoutClickAttempts = new Set();

const ALLOWED_EVENTS = new Set([
  "page_view",
  "theme_selected",
  "diagnosis_completed",
  "draw_executed",
  "draw_completed",
  "result_first_paint",
  "result_viewed",
  "share_clicked",
  "deep_dive_opened",
  "deep_focus_selected",
  "premium_cta_clicked",
  "premium_intro_viewed",
  "premium_checkout_clicked",
  "premium_reading_viewed",
  "premium_three_card_generated",
  "screenshot_intent",
  "revisit_detected",
  "note_click",
  "purchase_completed"
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
  if (event === "draw_executed") return "draw_completed";
  if (event === "result_first_paint") return "result_viewed";
  if (event === "page_view") {
    const page = String(payload?.meta?.page || "").trim().toLowerCase();
    return page ? `page_view_${page}` : "page_view";
  }
  return event;
};

const isValidBody = (body) => {
  if (!body || typeof body !== "object") return false;
  if (!body.event || typeof body.event !== "string") return false;
  if (!ALLOWED_EVENTS.has(body.event)) return false;
  return true;
};

export const recordEvent = (body) => {
  if (!isValidBody(body)) {
    return { recorded: false, reason: "invalid_event" };
  }

  const attemptId = body?.meta?.attemptId;
  if (body.event === "premium_checkout_clicked" && attemptId) {
    checkoutClickAttempts.add(attemptId);
  }

  if (body.event === "purchase_completed" && attemptId) {
    if (!checkoutClickAttempts.has(attemptId)) {
      return { recorded: false, reason: "invalid_purchase_attempt" };
    }
    if (purchaseAttempts.has(attemptId)) {
      return { recorded: false, reason: "duplicate_purchase_attempt" };
    }
    purchaseAttempts.add(attemptId);
  }

  const normalized = normalizeEvent(body?.event, body);
  const event = {
    ...body,
    eventNormalized: normalized,
    dateKey: toDateKey(body?.ts)
  };

  store.push(event);
  if (store.length > MAX_EVENTS) {
    store.splice(0, store.length - MAX_EVENTS);
  }
  return { recorded: true };
};

export const getDailyDashboardStats = (dateKey) => {
  const targetDate = dateKey || toDateKey();
  const counts = {
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
    share_clicked: 0,
    note_click: 0,
    purchase_completed: 0
  };

  for (const event of store) {
    if (event.dateKey !== targetDate) continue;
    if (Object.prototype.hasOwnProperty.call(counts, event.eventNormalized)) {
      counts[event.eventNormalized] += 1;
    }
  }

  const resultToNoteCv = counts.result_viewed > 0 ? (counts.note_click / counts.result_viewed) * 100 : 0;
  const noteToPurchaseCv = counts.note_click > 0 ? (counts.purchase_completed / counts.note_click) * 100 : 0;

  return {
    date: targetDate,
    counts,
    cv: {
      result_to_note: Number(resultToNoteCv.toFixed(2)),
      note_to_purchase: Number(noteToPurchaseCv.toFixed(2))
    }
  };
};
