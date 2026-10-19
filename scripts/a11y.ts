/**
 * Accessibility checks for the screens in PRD §9 (Tech.md §16).
 *
 *   npm run test:a11y
 *
 * Reads only .env.test.local. Refuses the development project and any database that has
 * a person outside @example.com. Does not call tests.reset_data(), so it leaves the
 * pgTAP fixtures alone and a later test:db run may delete these people.
 *
 * Builds into .next-a11y and serves that build on port 3100, so it does not reuse the
 * dev server's cache or its inlined keys. Playwright and axe then walk the screens.
 */
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../lib/database.types";
import { generateInvitationToken, hashInvitationToken } from "../lib/invitations/tokens";

const ADMIN_EMAIL = "a11y-admin@example.com";
const FREELANCER_EMAIL = "a11y-freelancer@example.com";
const INVITEE_EMAIL = "a11y-invitee@example.com";
const PASSWORD = "A11y-fixture-16b";
const PROJECT_NAME = "A11y Review";
const PORT = 3100;
const ORIGIN = `http://127.0.0.1:${PORT}`;

type Db = SupabaseClient<Database>;

function fail(message: string): never {
  throw new Error(message);
}

function parseEnv(file: string): Record<string, string> {
  let text: string;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    fail(`Could not read ${file}.`);
  }
  const env: Record<string, string> = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const body = line.startsWith("export ") ? line.slice(7) : line;
    const eq = body.indexOf("=");
    if (eq <= 0) continue;
    const key = body.slice(0, eq).trim();
    let value = body.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function requireKey(env: Record<string, string>, key: string) {
  const value = env[key];
  if (!value) fail(`${key} is not set in .env.test.local.`);
  return value;
}

/** The client bundle must carry the test project, never the development one. */
function assertBuildUsesTestProject(testHost: string, devHost: string) {
  const root = path.join(process.cwd(), ".next-a11y");
  let sawTest = false;
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "cache") stack.push(full);
        continue;
      }
      if (!entry.name.endsWith(".js")) continue;
      if (statSync(full).size > 8_000_000) continue;
      const text = readFileSync(full, "utf8");
      if (text.includes(devHost)) fail("The build inlined the development project. Refusing to start it.");
      if (text.includes(testHost)) sawTest = true;
    }
  }
  if (!sawTest) fail("The build did not inline the test project.");
}

function stripA11yTypes() {
  const file = path.join(process.cwd(), "tsconfig.json");
  const text = readFileSync(file, "utf8");
  const next = text
    .replace(/,?\r?\n\s*"\.next-a11y\/types\/\*\*\/\*\.ts"/, "")
    .replace(/,?\r?\n\s*"\.next-a11y\/dev\/types\/\*\*\/\*\.ts"/, "");
  if (next !== text) writeFileSync(file, next);
}

function run(command: string, env: NodeJS.ProcessEnv) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, { env, stdio: "inherit", shell: true });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command failed (${code ?? "signal"}): ${command}`));
    });
  });
}

function stop(child: ChildProcess | null) {
  if (!child?.pid) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    child.kill("SIGTERM");
  }
}

async function waitForServer(child: ChildProcess) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (child.exitCode != null) fail(`The accessibility server exited (${child.exitCode}).`);
    try {
      const response = await fetch(`${ORIGIN}/login`);
      if (response.ok) return;
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  fail("The accessibility server did not start.");
}

async function rpc<T>(client: Db, fn: string, args: Record<string, unknown>) {
  const { data, error } = await client.rpc(fn as never, args as never);
  if (error) throw new Error(`${fn}: ${error.message}`);
  return data as T;
}

async function main() {
  const testEnv = parseEnv(".env.test.local");
  const devEnv = parseEnv(".env.local");
  const testUrl = requireKey(testEnv, "NEXT_PUBLIC_SUPABASE_URL");
  const devUrl = devEnv.NEXT_PUBLIC_SUPABASE_URL;
  if (!devUrl) fail("NEXT_PUBLIC_SUPABASE_URL is not set in .env.local, so the projects cannot be compared.");
  if (new URL(testUrl).origin === new URL(devUrl).origin) {
    fail("Refusing to run: .env.test.local points at the development project.");
  }
  requireKey(testEnv, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  requireKey(testEnv, "SUPABASE_SECRET_KEY");
  const dbUrl = requireKey(testEnv, "SUPABASE_TEST_DB_URL");

  const db = new Client({ connectionString: dbUrl });
  await db.connect();
  try {
    const outside = await db.query<{ outside: number }>(
      "select count(*)::int as outside from auth.users where email not ilike '%@example.com'",
    );
    if (outside.rows[0].outside > 0) {
      fail(
        `Refusing to run: this database has ${outside.rows[0].outside} people outside @example.com, ` +
          "so it is not the test project.",
      );
    }
    const org = await db.query<{ today: string; month_closed: boolean }>(
      `select (now() at time zone s.time_zone)::date::text as today,
              exists (
                select 1 from public.month_closures c
                where c.month >= date_trunc('month', (now() at time zone s.time_zone))::date
              ) as month_closed
         from public.organization_settings s
        where s.id = 1`,
    );
    if (!org.rows[0]) fail("The test project has no organization settings.");
    const today = org.rows[0].today;
    const monthClosed = org.rows[0].month_closed;

    const service = createClient<Database>(testUrl, testEnv.SUPABASE_SECRET_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const adminId = await ensurePerson(service, ADMIN_EMAIL, "A11y Admin", "admin", null);
    const admin = await signIn(testEnv, ADMIN_EMAIL);
    const freelancerId = await ensurePerson(service, FREELANCER_EMAIL, "A11y Freelancer", "freelancer", async () => {
      await ensureInvitation(service, admin, FREELANCER_EMAIL, "A11y Freelancer", "freelancer");
    });
    const freelancer = await signIn(testEnv, FREELANCER_EMAIL);
    const inviteToken = await ensureInvitation(service, admin, INVITEE_EMAIL, "A11y Invitee", "freelancer");

    await discardRunningTimer(service, freelancer, freelancerId);

    const projectId = await ensureProject(admin);
    await rpc(admin, "add_project_member", { p_project_id: projectId, p_user_id: freelancerId });
    await ensureRate(service, admin, freelancerId, today);

    const draftTaskId = await ensureDraft(service, freelancer, projectId);
    const proposal = await ensurePending(service, freelancer, projectId);
    const trackedTaskId = await ensureTracked(service, freelancer, admin, projectId, today, monthClosed);

    mkdirSync("a11y", { recursive: true });
    writeFileSync(
      "a11y/routes.json",
      JSON.stringify(
        {
          projectId,
          trackedTaskId,
          draftTaskId,
          proposalId: proposal.proposalId,
          personId: freelancerId,
          inviteToken,
        },
        null,
        2,
      ),
    );
    console.log(`Fixture ready (admin ${adminId.slice(0, 8)}…).`);
  } finally {
    await db.end();
  }

  const serverEnv: NodeJS.ProcessEnv = {
    ...process.env,
    ...testEnv,
    NEXT_DIST_DIR: ".next-a11y",
    NEXT_PUBLIC_APP_URL: ORIGIN,
    PORT: String(PORT),
  };

  stripA11yTypes();
  let server: ChildProcess | null = null;
  try {
    console.log("Installing Chromium if needed…");
    await run("npx playwright install chromium", process.env);
    console.log("Building the accessibility server…");
    await run("npx next build", serverEnv);
    assertBuildUsesTestProject(new URL(testUrl).host, new URL(devUrl).host);
    stripA11yTypes();
    mkdirSync("a11y/.auth", { recursive: true });
    server = spawn("npx next start -p 3100 -H 127.0.0.1", {
      env: serverEnv,
      stdio: "inherit",
      shell: true,
    });
    await waitForServer(server);
    await run("npx playwright test -c playwright.a11y.config.ts", {
      ...process.env,
      A11Y_PASSWORD: PASSWORD,
      A11Y_ADMIN_EMAIL: ADMIN_EMAIL,
      A11Y_FREELANCER_EMAIL: FREELANCER_EMAIL,
      CI: "1",
    });
  } finally {
    stop(server);
    stripA11yTypes();
  }
}

async function signIn(env: Record<string, string>, email: string): Promise<Db> {
  const client = createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) fail(`Could not sign in as the fixture user: ${error.message}`);
  return client;
}

async function ensurePerson(
  service: Db,
  email: string,
  fullName: string,
  role: "admin" | "freelancer",
  invite: (() => Promise<unknown>) | null,
) {
  const { data: profile, error } = await service.from("profiles").select("id").ilike("email", email).maybeSingle();
  if (error) fail(`Could not look up a fixture profile: ${error.message}`);
  if (profile) {
    const { error: updateError } = await service.auth.admin.updateUserById(profile.id, { password: PASSWORD });
    if (updateError) fail(`Could not refresh a fixture password: ${updateError.message}`);
    return profile.id;
  }

  if (invite) await invite();
  else await insertBootstrapInvitation(service, email, fullName, role);

  const { data, error: createError } = await service.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (createError || !data.user) fail(`Could not create a fixture user: ${createError?.message ?? "no user"}`);
  return data.user.id;
}

async function insertBootstrapInvitation(service: Db, email: string, fullName: string, role: "admin" | "freelancer") {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await service.from("invitations").insert({
    email,
    full_name: fullName,
    role,
    token_hash: hashInvitationToken(generateInvitationToken()),
    expires_at: expiresAt,
    invited_by: null,
  });
  if (!error) return;
  if (error.code !== "23505") fail(`Could not invite the fixture admin: ${error.message}`);
  const { error: updateError } = await service
    .from("invitations")
    .update({ expires_at: expiresAt, token_hash: hashInvitationToken(generateInvitationToken()) })
    .ilike("email", email)
    .is("accepted_at", null)
    .is("revoked_at", null);
  if (updateError) fail(`Could not refresh the fixture invitation: ${updateError.message}`);
}

/** Leaves a pending invitation and returns a token the accept screen can open. */
async function ensureInvitation(
  service: Db,
  admin: Db,
  email: string,
  fullName: string,
  role: "admin" | "freelancer",
) {
  const token = generateInvitationToken();
  const tokenHash = hashInvitationToken(token);
  const { data: pending, error } = await service
    .from("invitations")
    .select("id")
    .ilike("email", email)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .maybeSingle();
  if (error) fail(`Could not look up an invitation: ${error.message}`);

  if (!pending) {
    await rpc(admin, "create_invitation", {
      p_email: email,
      p_full_name: fullName,
      p_role: role,
      p_token_hash: tokenHash,
    });
    return token;
  }

  await rpc(admin, "renew_invitation", { p_invitation_id: pending.id, p_token_hash: tokenHash });
  return token;
}

async function discardRunningTimer(service: Db, freelancer: Db, userId: string) {
  const { count, error } = await service
    .from("timers")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("stopped_at", null);
  if (error) fail(`Could not look up a running timer: ${error.message}`);
  if (!count) return;
  const { error: discardError } = await freelancer.rpc("discard_timer");
  if (discardError) fail(`Could not discard a running fixture timer: ${discardError.message}`);
}

async function ensureProject(admin: Db) {
  const { data, error } = await admin.from("projects").select("id").eq("name", PROJECT_NAME).limit(1);
  if (error) fail(`Could not look up the fixture project: ${error.message}`);
  if (data?.[0]) return data[0].id;
  return rpc<string>(admin, "create_project", {
    p_name: PROJECT_NAME,
    p_description: "Fixture for the accessibility checks.",
  });
}

async function ensureRate(service: Db, admin: Db, userId: string, today: string) {
  const { count, error } = await service
    .from("rates")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) fail(`Could not look up the fixture rate: ${error.message}`);
  if (count) return;
  await rpc(admin, "add_rate", {
    p_user_id: userId,
    p_hourly_rate: 25,
    p_currency: "EUR",
    p_effective_from: today,
  });
}

async function taskByTitle(service: Db, projectId: string, title: string) {
  const { data, error } = await service
    .from("tasks")
    .select("id, status")
    .eq("project_id", projectId)
    .eq("title", title)
    .maybeSingle();
  if (error) fail(`Could not look up “${title}”: ${error.message}`);
  return data;
}

async function ensureDraft(service: Db, freelancer: Db, projectId: string) {
  const title = "Draft sample";
  let task = await taskByTitle(service, projectId, title);
  if (!task) {
    const id = await rpc<string>(freelancer, "create_task", {
      p_project_id: projectId,
      p_title: title,
      p_description: "Left as a draft for the editor and the new proposal screen.",
    });
    task = { id, status: "draft" };
  }
  if (task.status !== "draft" && task.status !== "changes_requested") {
    fail(`“${title}” is ${task.status}. Leave that fixture task as a draft.`);
  }
  await rpc(freelancer, "set_task_estimate", {
    p_task_id: task.id,
    p_min_minutes: 60,
    p_max_minutes: 120,
  });
  return task.id;
}

async function ensurePending(service: Db, freelancer: Db, projectId: string) {
  const title = "Proposal sample";
  let task = await taskByTitle(service, projectId, title);
  if (!task) {
    const id = await rpc<string>(freelancer, "create_task", {
      p_project_id: projectId,
      p_title: title,
      p_description: "Waiting for a decision, so the proposal screen can show its actions.",
    });
    task = { id, status: "draft" };
  }
  if (task.status === "draft" || task.status === "changes_requested") {
    await rpc(freelancer, "set_task_estimate", {
      p_task_id: task.id,
      p_min_minutes: 60,
      p_max_minutes: 120,
    });
    const proposalId = await rpc<string>(freelancer, "submit_proposal", {
      p_project_id: projectId,
      p_task_ids: [task.id],
    });
    return { taskId: task.id, proposalId };
  }
  if (task.status !== "pending_approval") {
    fail(`“${title}” is ${task.status}. Leave that fixture task waiting for a decision.`);
  }
  const { data, error } = await service
    .from("estimate_revisions")
    .select("proposal_id")
    .eq("task_id", task.id)
    .eq("decision", "pending")
    .maybeSingle();
  if (error || !data?.proposal_id) fail(`“${title}” has no pending revision.`);
  return { taskId: task.id, proposalId: data.proposal_id };
}

async function ensureTracked(
  service: Db,
  freelancer: Db,
  admin: Db,
  projectId: string,
  today: string,
  monthClosed: boolean,
) {
  const title = "Tracked sample";
  let task = await taskByTitle(service, projectId, title);
  if (!task) {
    const id = await rpc<string>(freelancer, "create_task", {
      p_project_id: projectId,
      p_title: title,
      p_description: "Approved work, so the timer and My time have something to show.",
    });
    task = { id, status: "draft" };
  }

  if (task.status === "draft" || task.status === "changes_requested") {
    await rpc(freelancer, "set_task_estimate", {
      p_task_id: task.id,
      p_min_minutes: 60,
      p_max_minutes: 120,
    });
    await rpc(freelancer, "submit_proposal", { p_project_id: projectId, p_task_ids: [task.id] });
    task = { id: task.id, status: "pending_approval" };
  }
  if (task.status === "pending_approval") {
    const { data, error } = await service
      .from("estimate_revisions")
      .select("id")
      .eq("task_id", task.id)
      .eq("decision", "pending")
      .maybeSingle();
    if (error || !data) fail(`“${title}” has no pending revision to approve.`);
    await rpc(admin, "decide_estimates", {
      p_decisions: [{ revision_id: data.id, decision: "approved" }],
    });
    task = { id: task.id, status: "approved" };
  }
  if (task.status !== "approved" && task.status !== "in_progress") {
    fail(`“${title}” is ${task.status}. It needs to stay approved or in progress.`);
  }

  const { count, error } = await service
    .from("time_entries")
    .select("id", { count: "exact", head: true })
    .eq("task_id", task.id);
  if (error) fail(`Could not look up time on “${title}”: ${error.message}`);
  if (!count && !monthClosed) {
    await rpc(freelancer, "add_time_entry", {
      p_task_id: task.id,
      p_work_date: today,
      p_minutes: 30,
      p_description: "Accessibility fixture entry.",
    });
  } else if (!count && monthClosed) {
    console.log("The current month is closed, so the fixture task has no time entry.");
  }
  return task.id;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  stripA11yTypes();
  process.exit(1);
});
