/** Report URL. The current month has no segment, matching My time. `month` is `yyyy-MM-01`. */
export function reportPath(month: string, currentMonth: string, userId: string | null): string {
  const base = month === currentMonth ? "/reports" : `/reports/${month.slice(0, 7)}`;
  if (!userId) return base;
  return `${base}?user=${encodeURIComponent(userId)}`;
}

/** CSV for one month. `userId` limits an Admin export to one freelancer. */
export function csvPath(month: string, userId: string | null): string {
  const base = `/api/reports/${month.slice(0, 7)}/csv`;
  if (!userId) return base;
  return `${base}?user=${encodeURIComponent(userId)}`;
}

export function csvFilename(month: string): string {
  return `olifant-workboard-${month.slice(0, 7)}.csv`;
}
