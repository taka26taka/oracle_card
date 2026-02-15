import { NextResponse } from "next/server";
import { generateOracleMessage } from "../../../lib/ai/oracleMessage";
import { normalizeDiagnosisType } from "../../../lib/domain/diagnosis";

export async function POST(request) {
  try {
    const body = await request.json();
    const cardName = body?.cardName;
    const theme = normalizeDiagnosisType(body?.theme || "", "");
    const diagnosisType = normalizeDiagnosisType(body?.diagnosisType || "", "");
    const deepFocus = body?.deepFocus;

    if (!cardName) {
      return NextResponse.json({ error: "cardName is required" }, { status: 400 });
    }

    const result = await generateOracleMessage({
      cardName,
      theme,
      diagnosisType,
      deepFocus,
      apiKey: process.env.OPENAI_API_KEY
    });

    return NextResponse.json(result, { status: 200 });
  } catch {
    return NextResponse.json({ error: "failed_to_generate_message" }, { status: 500 });
  }
}
