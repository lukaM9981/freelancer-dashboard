import { eventTypesFor } from "@/lib/audit/events";

export const PAGE_STEP = 50;
export const PAGE_MAX = 500;

/** Audit log filters (PRD §6.13), read from and written to the URL. Dates are `yyyy-MM-dd`, org-local. */
export type AuditFilters = {
  person: string | null;
  project: string | null;
  type: string | null;
  from: string | null;
  to: string | null;
};

export const NO_FILTERS: AuditFilters = { person: null, project: null, type: null, from: null, to: null };

type Param = string | string[] | undefined;
export type AuditSearchParams = Partial<Record<keyof AuditFilters | "show", Param>>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Unknown or malformed values are dropped, so a hand-edited URL never breaks the page. */
export function parseAuditFilters(params: AuditSearchParams): AuditFilters {
  const person = first(params.person);
  const project = first(params.project);
  const type = first(params.type);
  const from = first(params.from);
  const to = first(params.to);
  return {
    person: person && UUID.test(person) ? person.toLowerCase() : null,
    project: project && UUID.test(project) ? project.toLowerCase() : null,
    type: type && eventTypesFor(type) ? type : null,
    from: from && validDate(from) ? from : null,
    to: to && validDate(to) ? to : null,
  };
}

export function shownCount(raw: Param): number {
  const value = Number(first(raw));
  if (!Number.isInteger(value) || value <= PAGE_STEP) return PAGE_STEP;
  return Math.min(PAGE_MAX, Math.ceil(value / PAGE_STEP) * PAGE_STEP);
}

export function hasFilters(filters: AuditFilters): boolean {
  return Object.values(filters).some((value) => value != null);
}

/** The start date is after the end date, so nothing can match. */
export function rangeIsInverted(filters: AuditFilters): boolean {
  return filters.from != null && filters.to != null && filters.from > filters.to;
}

export function auditHref(filters: AuditFilters, show?: number): string {
  const params = new URLSearchParams();
  for (const key of ["person", "project", "type", "from", "to"] as const) {
    const value = filters[key];
    if (value) params.set(key, value);
  }
  if (show && show > PAGE_STEP) params.set("show", String(show));
  const query = params.toString();
  return query ? `/audit?${query}` : "/audit";
}

function first(value: Param): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.trim() || undefined;
}

function validDate(value: string): boolean {
  if (!DATE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
