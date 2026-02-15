const MAX_EVENTS = 10000;
const store = [];

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
    const page = payload?.meta?.page;
    return page === "lp" ? "page_view_lp" : "page_view";
  }
  return event;
};

export const recordEvent = (body) => {
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
};

export const getDailyDashboardStats = (dateKey) => {
  const targetDate = dateKey || toDateKey();
  const counts = {
    page_view_lp: 0,
    draw_completed: 0,
    result_viewed: 0,
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
