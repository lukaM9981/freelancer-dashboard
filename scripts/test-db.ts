/**
 * Runs the pgTAP tests in supabase/tests/ against the Supabase test project
 * (Tech.md §16, DB.md §12):
 *
 *   npm run test:db
 *
 * `supabase test db` needs Docker even for a remote database, so this runner talks to
 * the database directly. It reads only .env.test.local (or the CI environment), refuses
 * a database with anyone outside @example.com, empties the test data, and then runs every
 * *.test.sql file in name order. The files build on each other, like the scenario scripts
 * they came from. Statements run one by one, each in its own transaction, because the
 * rules depend on now() and the transaction id changing between actions.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { Client, type QueryResult } from "pg";

// "test" mode loads .env.test.local and never .env.local, so the development project
// is out of reach.
(process.env as Record<string, string>).NODE_ENV = "test";
loadEnvConfig(process.cwd(), false);

const TESTS_DIR = path.join(process.cwd(), "supabase", "tests");

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

const dbUrl = process.env.SUPABASE_TEST_DB_URL;
if (!dbUrl) fail("SUPABASE_TEST_DB_URL is not set. Add it to .env.test.local.");

function connect() {
  return new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
}

type Statement = { sql: string; line: number };

/** Splits a SQL file on top-level semicolons, respecting quotes, comments, and $tags$. */
function splitStatements(source: string): Statement[] {
  const statements: Statement[] = [];
  let start = 0;
  let i = 0;
  let dollarTag: string | null = null;

  const push = (end: number) => {
    const raw = source.slice(start, end);
    const sql = raw.trim();
    const code = sql
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("--"))
      .join("\n")
      .trim();
    if (code) {
      const leading = raw.length - raw.trimStart().length;
      const line = source.slice(0, start + leading).split("\n").length;
      statements.push({ sql, line });
    }
  };

  while (i < source.length) {
    const ch = source[i];
    if (dollarTag) {
      if (source.startsWith(dollarTag, i)) {
        i += dollarTag.length;
        dollarTag = null;
      } else {
        i++;
      }
    } else if (ch === "-" && source[i + 1] === "-") {
      const end = source.indexOf("\n", i);
      i = end === -1 ? source.length : end + 1;
    } else if (ch === "/" && source[i + 1] === "*") {
      const end = source.indexOf("*/", i + 2);
      i = end === -1 ? source.length : end + 2;
    } else if (ch === "'" || ch === '"') {
      i++;
      while (i < source.length) {
        if (source[i] === ch && source[i + 1] === ch) i += 2;
        else if (source[i] === ch) break;
        else i++;
      }
      i++;
    } else if (ch === "$") {
      const match = /^\$[A-Za-z_]*\$/.exec(source.slice(i));
      if (match) {
        dollarTag = match[0];
        i += dollarTag.length;
      } else {
        i++;
      }
    } else if (ch === ";") {
      push(i);
      i++;
      start = i;
    } else {
      i++;
    }
  }
  push(source.length);
  return statements;
}

/** pgTAP functions return their output as text rows; everything else is ignored. */
function tapLines(result: QueryResult | QueryResult[]): string[] {
  const results = Array.isArray(result) ? result : [result];
  const lines: string[] = [];
  for (const r of results) {
    for (const row of r.rows ?? []) {
      for (const value of Object.values(row)) {
        if (typeof value !== "string") continue;
        for (const line of value.split("\n")) {
          if (/^(ok |not ok |#|1\.\.)/.test(line)) lines.push(line);
        }
      }
    }
  }
  return lines;
}

async function runSetup() {
  const client = connect();
  await client.connect();
  try {
    const { rows } = await client.query<{ outside: number }>(
      "select count(*)::int as outside from auth.users where email not ilike '%@example.com'",
    );
    if (rows[0].outside > 0) {
      fail(
        `Refusing to run: this database has ${rows[0].outside} people outside @example.com, ` +
          "so it is not the test project. Check SUPABASE_TEST_DB_URL.",
      );
    }
    await client.query(readFileSync(path.join(TESTS_DIR, "setup.sql"), "utf8"));
    await client.query("select tests.reset_data()");
  } finally {
    await client.end();
  }
}

type FileResult = { passed: number; failed: number; error?: string };

async function runFile(file: string): Promise<FileResult> {
  const source = readFileSync(path.join(TESTS_DIR, file), "utf8");
  const result: FileResult = { passed: 0, failed: 0 };
  const client = connect();
  await client.connect();
  try {
    for (const statement of splitStatements(source)) {
      let output: QueryResult | QueryResult[];
      try {
        output = await client.query(statement.sql);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        result.error = `${file}:${statement.line}: ${message}\n  ${statement.sql.split("\n")[0]}`;
        return result;
      }
      for (const line of tapLines(output)) {
        if (line.startsWith("ok ")) {
          result.passed++;
        } else if (line.startsWith("not ok ")) {
          result.failed++;
          console.log(`  ${line}`);
        } else if (line.startsWith("# Looks like you planned")) {
          result.failed++;
          console.log(`  ${line}`);
        } else if (line.startsWith("#") && result.failed > 0) {
          console.log(`  ${line}`);
        }
      }
    }
  } finally {
    await client.end();
  }
  return result;
}

async function main() {
  const files = readdirSync(TESTS_DIR)
    .filter((name) => name.endsWith(".test.sql"))
    .sort();
  if (files.length === 0) fail("No *.test.sql files in supabase/tests/.");

  await runSetup();

  let passed = 0;
  let failed = 0;
  for (const file of files) {
    const result = await runFile(file);
    passed += result.passed;
    failed += result.failed;
    if (result.error) {
      console.log(`✗ ${file}: stopped by an unexpected error after ${result.passed} passing checks`);
      console.log(`  ${result.error}`);
      failed++;
      break;
    }
    const mark = result.failed === 0 ? "✓" : "✗";
    console.log(`${mark} ${file}: ${result.passed} passed, ${result.failed} failed`);
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
