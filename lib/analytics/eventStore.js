import fs from "fs";
import path from "path";

const MAX_EVENTS = 10000;
const store = [];
const purchaseAttempts = new Set();
const checkoutClickAttempts = new Set();
let loaded = false;

const EVENT_STORE_FILE = process.env.EVENT_STORE_FILE || "";

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

const rebuildAttemptIndexes = () => {
  checkoutClickAttempts.clear();
  purchaseAttempts.clear();
  for (const event of store) {
    const attemptId = event?.meta?.attemptId;
    if (!attemptId) continue;
    if (event.event === "premium_checkout_clicked") {
      checkoutClickAttempts.add(attemptId);
    }
    if (event.event === "purchase_completed") {
      purchaseAttempts.add(attemptId);
    }
  }
};

const trimStore = () => {
  if (store.length <= MAX_EVENTS) return;
  store.splice(0, store.length - MAX_EVENTS);
  rebuildAttemptIndexes();
};

const ensureLoaded = () => {
  if (loaded) return;
  loaded = true;

  if (!EVENT_STORE_FILE) return;

  try {
    const text = fs.readFileSync(EVENT_STORE_FILE, "utf-8");
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed?.events)) {
      store.splice(0, store.length, ...parsed.events);
    }
    trimStore();
    rebuildAttemptIndexes();
  } catch {
    // Keep in-memory fallback when file is missing or broken.
  }
};

const persistStore = () => {
  if (!EVENT_STORE_FILE) return;

  try {
    const dir = path.dirname(EVENT_STORE_FILE);
    fs.mkdirSync(dir, { recursive: true });
    const tempFile = `${EVENT_STORE_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify({ events: store }), "utf-8");
    fs.renameSync(tempFile, EVENT_STORE_FILE);
  } catch {
    // Keep process running even if persistence fails.
  }
};

export const recordEvent = (body) => {
  ensureLoaded();

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
  trimStore();
  persistStore();

  return { recorded: true };
};

export const getDailyDashboardStats = (dateKey) => {
  ensureLoaded();

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
