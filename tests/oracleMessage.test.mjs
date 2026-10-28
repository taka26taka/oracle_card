import test from "node:test";
import assert from "node:assert/strict";
import { generateOracleMessage } from "../lib/ai/oracleMessage.js";

const input = { cardName: "月のしずく", theme: "mutual", apiKey: "test-secret" };
const validText = ["関係の温度は少しずつ変わっています。", "未読の時間は結論を急ぐ理由にはなりません。相手の生活時間と連絡の間合いを見ながら、次に会ったときの言葉や目線に注目してください。返信の速さだけで判断せず、会話の内容をゆっくり振り返ってください。", "質問をひとつだけ送る。", "短い言葉から始めましょう。"].join("\n");
test("missing key never calls external API", async () => {
  const result = await generateOracleMessage({ ...input, apiKey: "" }, { fetchImpl: () => assert.fail("network") });
  assert.equal(result.fallback, true);
  assert.ok(result.message && result.actionTip && result.afterglowLine);
});
test("Responses API output blocks preserve four-line structure", async () => {
  let calls = 0;
  const result = await generateOracleMessage(input, { fetchImpl: async (_, options) => {
    calls++;
    assert.equal(options.headers.Authorization, "Bearer test-secret");
    return Response.json({ output: [{ content: validText.split("\n").map(text => ({ type: "output_text", text })) }] });
  } });
  assert.equal(result.fallback, false);
  assert.equal(result.actionTip, "質問をひとつだけ送る。");
  assert.equal(calls, 1);
});
for (const status of [401, 429, 500, 503]) {
  test(`HTTP ${status} returns safe fallback without retry or error body`, async () => {
    let calls = 0;
    const result = await generateOracleMessage(input, { fetchImpl: async () => {
      calls++;
      return new Response("test-secret upstream sensitive detail", { status, headers: { "Retry-After": "1" } });
    } });
    assert.equal(result.fallback, true);
    assert.equal(calls, 1);
    assert.ok(!JSON.stringify(result).includes("test-secret"));
    assert.ok(!("detail" in result));
  });
}
for (const data of [null, {}, { output: {} }, { output: [null] }, { output_text: 123 }, { output_text: "短い文" }, { output_text: validText.replace("短い言葉", "前向きに") }, { output_text: validText, status: "incomplete" }]) {
  test(`invalid response ${JSON.stringify(data).slice(0, 40)}`, async () => {
    assert.equal((await generateOracleMessage(input, { fetchImpl: async () => Response.json(data) })).fallback, true);
  });
}
test("network and malformed JSON fall back", async () => {
  for (const fetchImpl of [async () => { throw new Error("test-secret"); }, async () => new Response("{")]) {
    const result = await generateOracleMessage(input, { fetchImpl });
    assert.equal(result.fallback, true);
    assert.ok(!JSON.stringify(result).includes("test-secret"));
  }
});
test("timeout aborts fetch and response body parsing", async () => {
  for (const bodyStage of [false, true]) {
    const result = await generateOracleMessage(input, { timeoutMs: 5, fetchImpl: async (_, { signal }) => {
      const pending = () => new Promise((_, reject) => signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true }));
      return bodyStage ? { ok: true, json: pending } : pending();
    } });
    assert.equal(result.reason, "timeout");
  }
});
test("client cancellation stops request and skips already cancelled calls", async () => {
  const controller = new AbortController();
  const pending = generateOracleMessage({ ...input, signal: controller.signal }, { fetchImpl: async (_, { signal }) => {
    return new Promise((_, reject) => signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true }));
  } });
  controller.abort();
  assert.equal((await pending).reason, "cancelled");
  assert.equal((await generateOracleMessage({ ...input, signal: controller.signal }, { fetchImpl: () => assert.fail("network") })).reason, "cancelled");
});
test("429 with short Retry-After retries once, within the same deadline", async () => {
  let calls = 0;
  const result = await generateOracleMessage(input, { fetchImpl: async () => {
    calls++;
    return calls === 1 ? new Response('', { status: 429, headers: { 'Retry-After': '0' } }) : Response.json({ output_text: validText });
  } });
  assert.equal(result.fallback, false);
  assert.equal(calls, 2);
  calls = 0;
  await generateOracleMessage(input, { fetchImpl: async () => {
    calls++;
    return new Response('', { status: 429, headers: { 'Retry-After': '0' } });
  } });
  assert.equal(calls, 2);
});
