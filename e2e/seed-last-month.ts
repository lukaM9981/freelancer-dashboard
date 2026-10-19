import { Client } from "pg";

/** One manual entry in last month, on a task that is still Approved or In progress. */
export const SEEDED_DESCRIPTION = "Seeded work from last month";
export const SEEDED_MINUTES = 90;

/**
 * A task approved today cannot take a work date in last month (`work_date_before_approval`),
 * and an accepted task cannot take time at all. The smoke test moves this task's approval
 * date back, then inserts the entry through `add_time_entry` (Tech.md §16).
 */
export async function seedLastMonth(dbUrl: string, email: string, taskTitle: string) {
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const found = await client.query<{ id: string; user_id: string; work_date: string }>(
      `select t.id::text as id,
              p.id::text as user_id,
              ((app.month_start(app.org_today()) + make_interval(months => -1))::date + 14)::text as work_date
         from public.tasks t
         join public.profiles p on p.id = t.assignee_id
        where lower(p.email) = lower($1)
          and t.title = $2
          and t.status in ('approved', 'in_progress')`,
      [email, taskTitle],
    );
    const task = found.rows[0];
    if (found.rowCount !== 1 || !task) {
      throw new Error(`Expected one open “${taskTitle}” task for ${email}, found ${found.rowCount ?? 0}.`);
    }
    const taskId = task.id;
    const userId = task.user_id;
    const workDate = task.work_date.slice(0, 10);

    const updated = await client.query(
      `update public.tasks t
          set first_approved_on = $2::date,
              first_approved_at = ($2::timestamp at time zone s.time_zone)
         from public.organization_settings s
        where s.id = 1
          and t.id = $1::uuid`,
      [taskId, workDate],
    );
    if (updated.rowCount !== 1) {
      throw new Error("Could not move the task's approval date into last month.");
    }

    await client.query("set role authenticated");
    try {
      await client.query("select tests.as_user($1::uuid)", [userId]);
      const inserted = await client.query<{ id: string }>(
        "select public.add_time_entry($1::uuid, $2::date, $3::integer, $4)::text as id",
        [taskId, workDate, SEEDED_MINUTES, SEEDED_DESCRIPTION],
      );
      if (!inserted.rows[0]?.id) throw new Error("The seeded time entry was not created.");
    } finally {
      await client.query("reset role");
    }
  } finally {
    await client.end();
  }
}
