export function buildBackfillDates({ from, to }) {
  const start = parseDateKey(from);
  const end = parseDateKey(to);
  if (!start || !end) throw new Error("from and to must be YYYY-MM-DD dates");
  if (start > end) throw new Error("from must be on or before to");

  const dates = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function parseDateKey(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}
