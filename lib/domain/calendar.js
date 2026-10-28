const DAY_MS = 24 * 60 * 60 * 1000;

// Interpret local calendar labels on a UTC scale; DST never changes calendar-day distance.
export const calendarDay = (text) => {
  if (typeof text !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const ms = Date.parse(`${text}T00:00:00Z`);
  return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === text ? ms / DAY_MS : null;
};
