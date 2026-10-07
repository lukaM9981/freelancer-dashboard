import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import type { Role } from "@/lib/auth/queries";
import { isoDateInZone, nextMonthStart } from "@/lib/dates";
import { getOrganizationSettings } from "@/lib/settings/queries";
import { currentRate, toDisplayRate, type DisplayRate } from "@/lib/people/rates";

export type PersonStatus = "invited" | "active" | "deactivated";

export type PersonListRow = {
  kind: "person" | "invitation";
  id: string;
  fullName: string;
  email: string;
  role: Role;
  status: PersonStatus;
  expired: boolean;
  expiresAt: string | null;
  emailFailed: boolean;
  projects: string[];
  currentRate: DisplayRate | null;
};

export type Membership = {
  projectId: string;
  projectName: string;
  projectStatus: string;
};

export type PersonDetail = {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  status: "active" | "deactivated";
  memberships: Membership[];
  rates: DisplayRate[];
  today: string;
  earliestRateDate: string | null;
  defaultCurrency: "EUR" | "USD";
  activeAdminCount: number;
};

type ProjectEmbed =
  | { id: string; name: string; status: string }
  | { id: string; name: string; status: string }[]
  | null;

function embeddedProject(value: ProjectEmbed): { id: string; name: string; status: string } | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function asRole(value: string): Role {
  return value === "admin" ? "admin" : "freelancer";
}

export async function listPeople(): Promise<PersonListRow[]> {
  const supabase = createClient(await cookies());
  const settings = await getOrganizationSettings();
  const today = isoDateInZone(settings.timeZone);

  const [profiles, invitations, members, rates] = await Promise.all([
    supabase.from("profiles").select("id, email, full_name, role, status"),
    supabase
      .from("invitations")
      .select("id, email, full_name, role, expires_at, last_send_error")
      .is("accepted_at", null)
      .is("revoked_at", null),
    supabase.from("project_members").select("user_id, projects(id, name, status)"),
    supabase.from("rates").select("id, user_id, hourly_rate, currency, effective_from"),
  ]);

  for (const result of [profiles, invitations, members, rates]) {
    if (result.error) throw new Error(`People list failed: ${result.error.message}`);
  }

  const projectsByUser = new Map<string, string[]>();
  for (const member of members.data ?? []) {
    const project = embeddedProject(member.projects as ProjectEmbed);
    if (!project) continue;
    const names = projectsByUser.get(member.user_id) ?? [];
    names.push(project.name);
    projectsByUser.set(member.user_id, names);
  }

  const ratesByUser = new Map<string, DisplayRate[]>();
  for (const rate of rates.data ?? []) {
    const display = toDisplayRate({
      id: rate.id,
      hourlyRate: rate.hourly_rate,
      currency: rate.currency,
      effectiveFrom: rate.effective_from,
    });
    const list = ratesByUser.get(rate.user_id) ?? [];
    list.push(display);
    ratesByUser.set(rate.user_id, list);
  }

  const people: PersonListRow[] = (profiles.data ?? []).map((profile) => ({
    kind: "person",
    id: profile.id,
    fullName: profile.full_name,
    email: profile.email,
    role: asRole(profile.role),
    status: profile.status === "deactivated" ? "deactivated" : "active",
    expired: false,
    expiresAt: null,
    emailFailed: false,
    projects: (projectsByUser.get(profile.id) ?? []).sort((a, b) => a.localeCompare(b, "en")),
    currentRate: profile.role === "freelancer" ? currentRate(ratesByUser.get(profile.id) ?? [], today) : null,
  }));

  const pending: PersonListRow[] = (invitations.data ?? []).map((invitation) => ({
    kind: "invitation",
    id: invitation.id,
    fullName: invitation.full_name,
    email: invitation.email,
    role: asRole(invitation.role),
    status: "invited",
    expired: new Date(invitation.expires_at).getTime() <= Date.now(),
    expiresAt: invitation.expires_at,
    emailFailed: invitation.last_send_error != null,
    projects: [],
    currentRate: null,
  }));

  return [...people, ...pending].sort(compareRows);
}

export const getPerson = cache(async (userId: string): Promise<PersonDetail | null> => {
  const supabase = createClient(await cookies());
  const settings = await getOrganizationSettings();
  const today = isoDateInZone(settings.timeZone);

  const [profile, members, rates, admins, closures] = await Promise.all([
    supabase.from("profiles").select("id, email, full_name, role, status").eq("id", userId).maybeSingle(),
    supabase.from("project_members").select("projects(id, name, status)").eq("user_id", userId),
    supabase
      .from("rates")
      .select("id, hourly_rate, currency, effective_from")
      .eq("user_id", userId)
      .order("effective_from", { ascending: false }),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin")
      .eq("status", "active"),
    supabase.from("month_closures").select("month").order("month", { ascending: false }).limit(1),
  ]);

  if (profile.error) throw new Error(`Person lookup failed: ${profile.error.message}`);
  if (!profile.data) return null;
  for (const result of [members, rates, admins, closures]) {
    if (result.error) throw new Error(`Person lookup failed: ${result.error.message}`);
  }

  const latestClosed = closures.data?.[0]?.month ?? null;

  return {
    id: profile.data.id,
    fullName: profile.data.full_name,
    email: profile.data.email,
    role: asRole(profile.data.role),
    status: profile.data.status === "deactivated" ? "deactivated" : "active",
    memberships: (members.data ?? [])
      .map((member) => embeddedProject(member.projects as ProjectEmbed))
      .filter((project): project is { id: string; name: string; status: string } => project != null)
      .map((project) => ({
        projectId: project.id,
        projectName: project.name,
        projectStatus: project.status,
      }))
      .sort((a, b) => a.projectName.localeCompare(b.projectName, "en")),
    rates: (rates.data ?? []).map((rate) =>
      toDisplayRate({
        id: rate.id,
        hourlyRate: rate.hourly_rate,
        currency: rate.currency,
        effectiveFrom: rate.effective_from,
      }),
    ),
    today,
    earliestRateDate: latestClosed ? nextMonthStart(latestClosed) : null,
    defaultCurrency: settings.defaultCurrency,
    activeAdminCount: admins.count ?? 0,
  };
});

export async function listOwnRates(userId: string): Promise<{ rates: DisplayRate[]; today: string }> {
  const supabase = createClient(await cookies());
  const settings = await getOrganizationSettings();
  const today = isoDateInZone(settings.timeZone);
  const { data, error } = await supabase
    .from("rates")
    .select("id, hourly_rate, currency, effective_from")
    .eq("user_id", userId)
    .order("effective_from", { ascending: false });
  if (error) throw new Error(`Rate history failed: ${error.message}`);
  return {
    today,
    rates: (data ?? []).map((rate) =>
      toDisplayRate({
        id: rate.id,
        hourlyRate: rate.hourly_rate,
        currency: rate.currency,
        effectiveFrom: rate.effective_from,
      }),
    ),
  };
}

const statusOrder: Record<PersonStatus, number> = { invited: 0, active: 1, deactivated: 2 };

function compareRows(a: PersonListRow, b: PersonListRow): number {
  const byStatus = statusOrder[a.status] - statusOrder[b.status];
  if (byStatus !== 0) return byStatus;
  if (a.expired !== b.expired) return a.expired ? -1 : 1;
  return a.fullName.localeCompare(b.fullName, "en");
}
