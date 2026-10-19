/**
 * End-to-end smoke test (Tech.md §16).
 *
 *   npm run test:e2e
 *
 * Reads only .env.test.local. Refuses the development project and any database that has
 * a person outside @example.com. Empties the test project with tests.reset_data(), so it
 * must not run beside npm run test:db or npm run test:a11y.
 *
 * Builds into .next-e2e and serves that build on port 3200. Resend is left unset, so the
 * invitation is shown as a link. Playwright then walks the work loop.
 */
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Client } from "pg";
import { formatMonth } from "../lib/dates";
import type { Database } from "../lib/database.types";
import { INVITATION_VALID_DAYS, generateInvitationToken, hashInvitationToken } from "../lib/invitations/tokens";

const ADMIN_EMAIL = "smoke-admin@example.com";
const ADMIN_NAME = "Smoke Admin";
const FREELANCER_EMAIL = "smoke-freelancer@example.com";
const FREELANCER_NAME = "Smoke Freelancer";
const PASSWORD = "Smoke-test-16c";
const PORT = 3200;
const ORIGIN = `http://127.0.0.1:${PORT}`;

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
  const root = path.join(process.cwd(), ".next-e2e");
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

function stripE2eTypes() {
  const file = path.join(process.cwd(), "tsconfig.json");
  const text = readFileSync(file, "utf8");
  const next = text
    .replace(/,?\r?\n\s*"\.next-e2e\/types\/\*\*\/\*\.ts"/, "")
    .replace(/,?\r?\n\s*"\.next-e2e\/dev\/types\/\*\*\/\*\.ts"/, "");
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
    if (child.exitCode != null) fail(`The smoke-test server exited (${child.exitCode}).`);
    try {
      const response = await fetch(`${ORIGIN}/login`);
      if (response.ok) return;
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  fail("The smoke-test server did not start.");
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
  const secretKey = requireKey(testEnv, "SUPABASE_SECRET_KEY");
  const dbUrl = requireKey(testEnv, "SUPABASE_TEST_DB_URL");

  const db = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await db.connect();
  let lastMonthStart = "";
  let lastMonth = "";
  let adminToken = "";
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
    console.log("Emptying the test project (this also removes accessibility fixtures)…");
    await db.query(readFileSync(path.join(process.cwd(), "supabase", "tests", "setup.sql"), "utf8"));
    await db.query("select tests.reset_data()");

    const dates = await db.query<{ start: string }>(
      `select to_char((app.month_start(app.org_today()) + make_interval(months => -1))::date, 'YYYY-MM-DD') as start`,
    );
    lastMonthStart = dates.rows[0]?.start ?? "";
    if (!/^\d{4}-\d{2}-01$/.test(lastMonthStart)) fail("Could not resolve last month in the organization time zone.");
    lastMonth = lastMonthStart.slice(0, 7);

    adminToken = generateInvitationToken();
    const service: SupabaseClient<Database> = createClient<Database>(testUrl, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const expiresAt = new Date(Date.now() + INVITATION_VALID_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await service.from("invitations").insert({
      email: ADMIN_EMAIL,
      full_name: ADMIN_NAME,
      role: "admin",
      token_hash: hashInvitationToken(adminToken),
      expires_at: expiresAt,
      invited_by: null,
    });
    if (error) fail(`Could not bootstrap the Admin invitation: ${error.message}`);
    console.log(`Admin invitation ready. Last month to close is ${formatMonth(lastMonthStart)}.`);
  } finally {
    await db.end();
  }

  const serverEnv: NodeJS.ProcessEnv = {
    ...process.env,
    ...testEnv,
    NEXT_DIST_DIR: ".next-e2e",
    NEXT_PUBLIC_APP_URL: ORIGIN,
    PORT: String(PORT),
    // An empty value stays set, so Next does not fill these from .env.local.
    // The invitation is then a link on screen (Tech.md §16).
    RESEND_API_KEY: "",
    EMAIL_FROM: "",
  };

  stripE2eTypes();
  let server: ChildProcess | null = null;
  try {
    console.log("Installing Chromium if needed…");
    await run("npx playwright install chromium", process.env);
    console.log("Building the smoke-test server…");
    await run("npx next build", serverEnv);
    assertBuildUsesTestProject(new URL(testUrl).host, new URL(devUrl).host);
    stripE2eTypes();
    server = spawn("npx next start -p 3200 -H 127.0.0.1", {
      env: serverEnv,
      stdio: "inherit",
      shell: true,
    });
    await waitForServer(server);
    await run("npx playwright test -c playwright.e2e.config.ts", {
      ...process.env,
      E2E_PASSWORD: PASSWORD,
      E2E_ADMIN_EMAIL: ADMIN_EMAIL,
      E2E_ADMIN_NAME: ADMIN_NAME,
      E2E_ADMIN_TOKEN: adminToken,
      E2E_FREELANCER_EMAIL: FREELANCER_EMAIL,
      E2E_FREELANCER_NAME: FREELANCER_NAME,
      E2E_LAST_MONTH_START: lastMonthStart,
      E2E_LAST_MONTH: lastMonth,
      E2E_LAST_MONTH_LABEL: formatMonth(lastMonthStart),
      SUPABASE_TEST_DB_URL: dbUrl,
      CI: "1",
    });
  } finally {
    stop(server);
    stripE2eTypes();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  stripE2eTypes();
  process.exit(1);
});
