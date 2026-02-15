export const NOTE_URL_MAP = {
  mutual: "https://note.com/",
  waiting_love: "https://note.com/",
  waiting_contact: "https://note.com/",
  unrequited: "https://note.com/",
  reconciliation: "https://note.com/"
};

export const getNoteUrlByDiagnosisType = (diagnosisType) => {
  if (diagnosisType && NOTE_URL_MAP[diagnosisType]) return NOTE_URL_MAP[diagnosisType];
  return "https://note.com/";
};
