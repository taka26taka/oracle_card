import fs from "fs";
import path from "path";
import { EVENT_NAMES } from "./events";

const MAX_EVENTS = 10000;
const store = [];
const purchaseAttempts = new Set();
const checkoutClickAttempts = new Set();
let loaded = false;

const EVENT_STORE_FILE = process.env.EVENT_STORE_FILE || "";

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
    if (event.event === EVENT_NAMES.PREMIUM_CHECKOUT_CLICKED) {
      checkoutClickAttempts.add(attemptId);
    }
    if (event.event === EVENT_NAMES.PURCHASE_COMPLETED) {
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
  if (body.event === EVENT_NAMES.PREMIUM_CHECKOUT_CLICKED && attemptId) {
    checkoutClickAttempts.add(attemptId);
  }

  if (body.event === EVENT_NAMES.PURCHASE_COMPLETED && attemptId) {
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
