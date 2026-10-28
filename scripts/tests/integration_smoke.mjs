const baseUrl = process.argv[2] || "http://127.0.0.1:3101";

const fail = (message) => {
  throw new Error(message);
};

const assert = (condition, message) => {
  if (!condition) fail(message);
};

const postJson = async (path, body, headers = {}) => {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // keep null
  }
  return { status: res.status, json, text };
};

const getJson = async (path, headers = {}) => {
  const res = await fetch(`${baseUrl}${path}`, { headers });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // keep null
  }
  return { status: res.status, json, text };
};

const run = async () => {
  const ts = new Date().toISOString();
  const sessionId = `test_${Date.now()}`;

  const reading = await postJson("/api/reading", {
    cardName: "月のしずく",
    theme: "mutual",
    diagnosisType: "mutual"
  });
  assert(reading.status === 200, `reading api failed: status=${reading.status}`);
  assert(reading.json && typeof reading.json.message === "string", "reading.message is missing");
  assert(reading.json && typeof reading.json.actionTip === "string", "reading.actionTip is missing");
  assert(reading.json && typeof reading.json.afterglowLine === "string", "reading.afterglowLine is missing");

  const drawEvent = await postJson("/api/events", {
    event: "draw_executed",
    sessionId,
    ts,
    path: "/draw",
    theme: "mutual",
    cardId: 7,
    meta: { delayMs: 1234 }
  });
  assert(drawEvent.status === 200 && drawEvent.json?.ok === true, `draw event failed: ${drawEvent.text}`);

  const toggleEvent = await postJson("/api/events", {
    event: "other_actions_toggled",
    sessionId,
    ts: new Date().toISOString(),
    path: "/result",
    theme: "mutual",
    cardId: 7,
    meta: { open: true }
  });
  assert(toggleEvent.status === 200 && toggleEvent.json?.ok === true, `toggle event failed: ${toggleEvent.text}`);

  const invalidEvent = await postJson("/api/events", {
    event: "invalid_event",
    sessionId,
    ts: new Date().toISOString(),
    path: "/result"
  });
  assert(invalidEvent.status === 400, `invalid event should be rejected, got ${invalidEvent.status}`);

  for (const path of ["/api/reading", "/api/events", "/api/purchase/complete", "/api/purchase/webhook", "/api/premium/three-card"]) {
    const headers = path.endsWith("webhook") ? { "x-webhook-token": process.env.PURCHASE_WEBHOOK_TOKEN } : {};
    const invalid = await fetch(`${baseUrl}${path}`, { method: "POST", headers, body: "{" });
    assert(invalid.status === 400, `${path} malformed JSON: ${invalid.status}`);
    const large = await postJson(path, { cardName: "a".repeat(18000) }, headers);
    assert(large.status === 413, `${path} oversized: ${large.status}`);
  }
  const badReading = await postJson("/api/reading", { cardName: { invalid: true } });
  assert(badReading.status === 400, "invalid cardName accepted");
  const attemptId = `attempt_${Date.now()}`;
  const purchase = { attemptId, sessionId, theme: "mutual", success: true };
  const checkout = await postJson("/api/events", {
    event: "premium_checkout_clicked", sessionId, ts: new Date().toISOString(), path: "/premium/intro", meta: { attemptId }
  });
  assert(checkout.status === 200, `checkout failed: ${checkout.text}`);
  assert((await postJson("/api/premium/three-card", purchase)).status === 403, "unpaid access allowed");
  assert((await postJson("/api/purchase/complete", purchase)).status === 400, "completion before payment allowed");
  assert((await postJson("/api/purchase/webhook", purchase)).status === 401, "unauthenticated webhook allowed");
  assert((await postJson("/api/events", {
    event: "purchase_success", sessionId, ts: new Date().toISOString(), path: "/premium/complete", meta: { attemptId, success: true }
  })).status === 403, "browser purchase_success allowed");
  const webhookHeaders = { "x-webhook-token": process.env.PURCHASE_WEBHOOK_TOKEN };
  const notifications = await Promise.all(Array.from({ length: 3 }, () => postJson("/api/purchase/webhook", purchase, webhookHeaders)));
  assert(notifications.every(result => result.status === 200), "webhook failed");
  assert(notifications.filter(result => result.json?.duplicate).length === 2, "webhook not idempotent");
  assert((await postJson("/api/purchase/complete", purchase)).status === 200, "completion failed");
  assert((await postJson("/api/purchase/complete", purchase)).json?.duplicate, "completion not idempotent");
  assert((await postJson("/api/premium/three-card", { ...purchase, sessionId: "wrong" })).status === 403, "wrong session allowed");
  const premium = await postJson("/api/premium/three-card", purchase);
  assert(premium.status === 200 && premium.json?.result?.cards?.length === 3, "paid reading failed");
  assert(new Set(premium.json.result.cards.map(item => item.card.id)).size === 3, "duplicate cards");
  for (const path of ["/api/events?date=2026-02-30", "/api/analytics/daily?date=no", "/api/analytics/funnel?date_from=2026-03-01&date_to=2026-02-01"]) {
    assert((await getJson(path, { "x-admin-token": process.env.ANALYTICS_ADMIN_TOKEN })).status === 400, `invalid date accepted: ${path}`);
  }
  assert((await getJson("/api/analytics/daily")).status === 401, "unauthenticated analytics allowed");

  const expectedAdminToken = process.env.ANALYTICS_ADMIN_TOKEN || "";
  if (expectedAdminToken) {
    const dateKey = ts.slice(0, 10);
    const daily = await getJson(`/api/analytics/daily?date=${dateKey}`, { "x-admin-token": expectedAdminToken });
    assert(daily.status === 200, `daily analytics failed: status=${daily.status} body=${daily.text}`);
    const counts = daily.json?.stats?.counts || {};
    assert(typeof counts.draw_completed === "number", "daily.counts.draw_completed is missing");
    assert(typeof counts.other_actions_toggled === "number", "daily.counts.other_actions_toggled is missing");
  }

  console.log("integration smoke test passed");
};

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
