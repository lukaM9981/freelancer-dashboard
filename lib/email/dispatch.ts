import "server-only";

import { after } from "next/server";
import { appUrl } from "@/lib/auth/urls";
import { emailConfigured, sendEmail } from "@/lib/email/send";
import { composeEmail, type EmailEvent } from "@/lib/email/templates/content";
import { NotificationEmail } from "@/lib/email/templates/notification-email";
import type { Currency, Money } from "@/lib/money";
import { toCents } from "@/lib/money";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/database.types";

type Admin = ReturnType<typeof createAdminClient>;
type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

/** Groups (one action for one person) claimed per round. */
const BATCH_GROUPS = 20;
/** Resend's default limit is two requests a second. */
const SEND_SPACING_MS = 550;

export type DispatchResult = { sent: number; failed: number; configured: boolean };

/**
 * Queues a dispatch after the response, so the action that created the notifications is
 * never slowed down or undone by email (Tech.md §9, PRD §6.12). Anything this misses is
 * retried by `/api/cron/dispatch-emails`.
 */
export function scheduleEmailDispatch() {
  after(async () => {
    try {
      await dispatchEmails({ maxRounds: 3 });
    } catch (error) {
      console.error("Email dispatch failed", error);
    }
  });
}

/** Sends what is due in the outbox, one email per recipient per action. */
export async function dispatchEmails({ maxRounds }: { maxRounds: number }): Promise<DispatchResult> {
  const result: DispatchResult = { sent: 0, failed: 0, configured: emailConfigured() };
  // Unconfigured, the rows stay pending until a key is set.
  if (!result.configured) return result;

  const admin = createAdminClient();
  for (let round = 0; round < maxRounds; round += 1) {
    const { data, error } = await admin.rpc("claim_email_batch", { p_limit: BATCH_GROUPS });
    if (error) throw new Error(`Claiming emails failed: ${error.message}`);
    const rows = data ?? [];
    if (rows.length === 0) break;

    const groups = groupRows(rows);
    const context = await loadContext(admin, rows);
    const failedBefore = result.failed;
    for (const [index, group] of groups.entries()) {
      if (index > 0) await sleep(SEND_SPACING_MS);
      const outcome = await sendGroup(group, context);
      const ids = group.map((row) => row.id);
      const { error: completeError } = await admin.rpc("complete_email_batch", {
        p_ids: ids,
        p_sent: outcome.ok,
        ...(outcome.ok ? {} : { p_error: outcome.error }),
      });
      if (completeError) console.error("Recording an email result failed", completeError);
      if (outcome.ok) {
        result.sent += 1;
      } else {
        result.failed += 1;
        console.error(`Email to ${group[0].recipient_id} failed: ${outcome.error}`);
      }
    }
    // A failed row is claimable again at once, so another round would spend its five
    // attempts within seconds. The next action or the cron run retries it.
    if (result.failed > failedBefore) break;
  }
  return result;
}

type Context = {
  recipients: Map<string, { email: string; status: string }>;
  events: Map<number, { actorId: string | null; entityId: string | null }>;
  actors: Map<string, { fullName: string; email: string }>;
  taskTitles: Map<string, string>;
  projectNames: Map<string, string>;
  monthTotals: Map<string, { countedMinutes: number; amounts: Money[] }>;
};

async function sendGroup(group: NotificationRow[], context: Context): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const first = group[0];
    const recipient = context.recipients.get(first.recipient_id);
    if (!recipient || recipient.status !== "active") return { ok: false, error: "The recipient is not active." };

    const actorId = group.map((row) => context.events.get(row.event_id)?.actorId).find((id) => id != null) ?? null;
    const actor = actorId && actorId !== first.recipient_id ? (context.actors.get(actorId) ?? null) : null;
    const events = group.map(
      (row): EmailEvent => ({
        type: row.type,
        data: row.data,
        taskId: row.task_id,
        projectId: row.project_id,
        entityId: context.events.get(row.event_id)?.entityId ?? null,
      }),
    );
    const month = monthOf(group.find((row) => row.type === "month.closed")?.data);

    const content = composeEmail(events, {
      actorName: actor?.fullName ?? null,
      taskTitles: context.taskTitles,
      projectNames: context.projectNames,
      monthTotals: month ? (context.monthTotals.get(`${first.recipient_id}:${month}`) ?? null) : null,
      url: appUrl,
    });

    return await sendEmail({
      to: recipient.email,
      subject: content.subject,
      replyTo: actor?.email ?? null,
      idempotencyKey: `${first.recipient_id}:${first.txid}`,
      react: NotificationEmail({ content, logoUrl: appUrl("/brand/logo-full.png") }),
    });
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

function groupRows(rows: NotificationRow[]): NotificationRow[][] {
  const groups = new Map<string, NotificationRow[]>();
  for (const row of [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.event_id - b.event_id)) {
    const key = `${row.recipient_id}:${row.txid}`;
    const group = groups.get(key);
    if (group) group.push(row);
    else groups.set(key, [row]);
  }
  return [...groups.values()];
}

async function loadContext(admin: Admin, rows: NotificationRow[]): Promise<Context> {
  const recipientIds = unique(rows.map((row) => row.recipient_id));
  const eventIds = [...new Set(rows.map((row) => row.event_id))];
  const taskIds = unique(rows.map((row) => row.task_id));
  const projectIds = unique(rows.map((row) => row.project_id));
  const months = rows.flatMap((row) => {
    const month = row.type === "month.closed" ? monthOf(row.data) : null;
    return month ? [{ recipientId: row.recipient_id, month }] : [];
  });

  const [recipients, events, tasks, projects] = await Promise.all([
    admin.from("profiles").select("id, email, status").in("id", recipientIds),
    admin.from("audit_events").select("id, actor_id, entity_id").in("id", eventIds),
    taskIds.length > 0 ? admin.from("tasks").select("id, title").in("id", taskIds) : Promise.resolve({ data: [], error: null }),
    projectIds.length > 0
      ? admin.from("projects").select("id, name").in("id", projectIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  for (const lookup of [recipients, events, tasks, projects]) {
    if (lookup.error) throw new Error(`Loading email details failed: ${lookup.error.message}`);
  }

  const actorIds = unique((events.data ?? []).map((event) => event.actor_id));
  const actors =
    actorIds.length > 0 ? await admin.from("profiles").select("id, full_name, email").in("id", actorIds) : { data: [], error: null };
  if (actors.error) throw new Error(`Loading email details failed: ${actors.error.message}`);

  return {
    recipients: new Map((recipients.data ?? []).map((row) => [row.id, { email: row.email, status: row.status }])),
    events: new Map((events.data ?? []).map((row) => [row.id, { actorId: row.actor_id, entityId: row.entity_id }])),
    actors: new Map((actors.data ?? []).map((row) => [row.id, { fullName: row.full_name, email: row.email }])),
    taskTitles: new Map((tasks.data ?? []).map((row) => [row.id, row.title])),
    projectNames: new Map((projects.data ?? []).map((row) => [row.id, row.name])),
    monthTotals: await loadMonthTotals(admin, months),
  };
}

/** The recipient's frozen month report, summed per currency and never across currencies. */
async function loadMonthTotals(
  admin: Admin,
  months: { recipientId: string; month: string }[],
): Promise<Map<string, { countedMinutes: number; amounts: Money[] }>> {
  const totals = new Map<string, { countedMinutes: number; amounts: Money[] }>();
  for (const { recipientId, month } of months) {
    const key = `${recipientId}:${month}`;
    if (totals.has(key)) continue;
    const { data, error } = await admin
      .from("month_report_lines")
      .select("counted_minutes, amount, currency")
      .eq("month", month)
      .eq("user_id", recipientId);
    if (error) throw new Error(`Loading the month report failed: ${error.message}`);

    let countedMinutes = 0;
    const cents = new Map<Currency, number>();
    for (const line of data ?? []) {
      countedMinutes += line.counted_minutes;
      if (line.currency && line.amount != null) {
        const currency = line.currency as Currency;
        cents.set(currency, (cents.get(currency) ?? 0) + toCents(line.amount));
      }
    }
    const amounts = [...cents.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([currency, value]): Money => ({ currency, cents: value }));
    totals.set(key, { countedMinutes, amounts });
  }
  return totals;
}

function monthOf(data: unknown): string | null {
  if (data == null || typeof data !== "object" || Array.isArray(data)) return null;
  const month = (data as Record<string, unknown>).month;
  return typeof month === "string" && /^\d{4}-\d{2}-01$/.test(month) ? month : null;
}

function unique(values: readonly (string | null)[]): string[] {
  return [...new Set(values.filter((value): value is string => value != null))];
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
