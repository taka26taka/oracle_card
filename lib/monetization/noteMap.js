export const NOTE_URL_MAP = {
  mutual: process.env.NEXT_PUBLIC_NOTE_URL_MUTUAL || "",
  waiting_love: process.env.NEXT_PUBLIC_NOTE_URL_WAITING_LOVE || "",
  waiting_contact: process.env.NEXT_PUBLIC_NOTE_URL_WAITING_CONTACT || "",
  unrequited: process.env.NEXT_PUBLIC_NOTE_URL_UNREQUITED || "",
  reconciliation: process.env.NEXT_PUBLIC_NOTE_URL_RECONCILIATION || ""
};

export const getNoteUrlByDiagnosisType = (diagnosisType) => {
  if (diagnosisType && NOTE_URL_MAP[diagnosisType]) return NOTE_URL_MAP[diagnosisType];
  return process.env.NEXT_PUBLIC_NOTE_URL_DEFAULT || "https://note.com/";
};

export const buildTrackedNoteUrl = (baseUrl, params = {}) => {
  try {
    const url = new URL(baseUrl);
    const entries = Object.entries(params);
    for (const [key, value] of entries) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
    return url.toString();
  } catch {
    return baseUrl;
  }
};
