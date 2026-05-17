const baseUrl = process.argv[2] || "http://127.0.0.1:3101";

const fail = (message) => {
  throw new Error(message);
};

const assert = (condition, message) => {
  if (!condition) fail(message);
};

const postJson = async (path, body) => {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
