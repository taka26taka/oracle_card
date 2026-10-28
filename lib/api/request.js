import { calendarDay } from "../domain/calendar.js";
import { isDiagnosisType } from "../domain/diagnosis.js";

export class RequestError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

/** Limit actual streamed bytes, including requests without Content-Length. */
export async function readJson(request, maxBytes = 16 * 1024) {
  if (Number(request.headers.get("content-length")) > maxBytes) throw new RequestError("payload_too_large", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new RequestError("invalid_json");
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new RequestError("payload_too_large", 413);
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    const body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new RequestError("invalid_payload");
    return body;
  } catch (error) {
    if (error instanceof RequestError) throw error;
    throw new RequestError("invalid_json");
  } finally {
    reader.releaseLock();
  }
}

export const validateReading = (body, { premium = false } = {}) => {
  if (!premium && (typeof body.cardName !== "string" || !body.cardName.trim() || body.cardName.length > 80)) {
    throw new RequestError("invalid_card_name");
  }
  for (const key of ["theme", "diagnosisType"]) {
    if (body[key] !== undefined && body[key] !== "" && !isDiagnosisType(body[key])) throw new RequestError(`invalid_${key}`);
  }
  if (body.deepFocus !== undefined && body.deepFocus !== "" && !["partner_feeling", "contact_timing", "reconciliation"].includes(body.deepFocus)) {
    throw new RequestError("invalid_deep_focus");
  }
};

export const validatePurchase = (body) => {
  for (const key of ["attemptId", "sessionId"]) {
    if (typeof body[key] !== "string" || !body[key].trim() || body[key].length > 120) throw new RequestError(`invalid_${key}`);
  }
  validateReading(body, { premium: true });
  for (const key of ["source", "provider", "externalOrderId", "price"]) {
    if (body[key] !== undefined && (typeof body[key] !== "string" || body[key].length > 300)) throw new RequestError(`invalid_${key}`);
  }
  if (body.amount !== undefined && (!Number.isSafeInteger(body.amount) || body.amount < 0)) throw new RequestError("invalid_amount");
  if (body.cardId != null && (!Number.isSafeInteger(body.cardId) || body.cardId < 1)) throw new RequestError("invalid_card_id");
};

export const validateAnalyticsQuery = (params) => {
  for (const key of ["date", "date_from", "date_to"]) {
    if (params.has(key) && calendarDay(params.get(key)) === null) throw new RequestError("invalid_date");
  }
  if (params.get("date_from") && params.get("date_to") && params.get("date_from") > params.get("date_to")) throw new RequestError("invalid_date_range");
  for (const key of ["experiment_id", "variant"]) {
    if ((params.get(key) || "").length > 64) throw new RequestError(`invalid_${key}`);
  }
  if (params.has("compare") && !["0", "1"].includes(params.get("compare"))) throw new RequestError("invalid_compare");
};
