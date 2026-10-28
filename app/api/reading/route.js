import { RequestError, readJson, validateReading } from "../../../lib/api/request";
import { NextResponse } from "next/server";
import { generateOracleMessage } from "../../../lib/ai/oracleMessage";
import { normalizeDiagnosisType } from "../../../lib/domain/diagnosis";

export async function POST(request) {
  try {
    const body = await readJson(request);
    validateReading(body);
    const cardName = body?.cardName;
    const theme = normalizeDiagnosisType(body?.theme || "", "");
    const diagnosisType = normalizeDiagnosisType(body?.diagnosisType || "", "");
    const deepFocus = body?.deepFocus;

    const result = await generateOracleMessage({
      cardName,
      theme,
      diagnosisType,
      deepFocus,
      signal: request.signal,
      apiKey: process.env.OPENAI_API_KEY
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof RequestError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "failed_to_generate_message" }, { status: 500 });
  }
}
