/**
 * Creates the invitation for the first Admin (Tech.md §5.3). Run once per environment:
 *
 *   npx tsx scripts/bootstrap-admin.ts <email> "<full name>"
 *
 * This is the only code that inserts into an app table directly. It builds its own
 * secret-key client because lib/supabase/admin.ts is "server-only", which throws
 * outside Next.js.
 */
import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/database.types";
import {
  INVITATION_VALID_DAYS,
  generateInvitationToken,
  hashInvitationToken,
} from "../lib/invitations/tokens";

loadEnvConfig(process.cwd(), true);

// Same rules as the invitations table (DB.md §4.3).
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) fail(`${name} is not set. Add it to .env.local.`);
  return value;
}

async function main() {
  const [rawEmail, rawName] = process.argv.slice(2);
  if (!rawEmail || !rawName) {
    fail('Usage: npx tsx scripts/bootstrap-admin.ts <email> "<full name>"');
  }

  const email = rawEmail.trim().toLowerCase();
  const fullName = rawName.trim();
  if (!EMAIL_PATTERN.test(email)) fail(`"${rawEmail}" is not a valid email address.`);
  if (fullName.length < 1 || fullName.length > 120) fail("The name must be 1 to 120 characters.");

  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const secretKey = requireEnv("SUPABASE_SECRET_KEY");
  const appUrl = requireEnv("NEXT_PUBLIC_APP_URL");

  const admin = createClient<Database>(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { data: existing, error: lookupError } = await admin
    .from("profiles")
    .select("id")
    .ilike("email", email.replace(/[\\%_]/g, "\\$&"))
    .maybeSingle();
  if (lookupError) fail(`Could not check existing people: ${lookupError.message}`);
  if (existing) fail(`${email} already has an account. Sign in or reset the password instead.`);

  const token = generateInvitationToken();
  const expiresAt = new Date(Date.now() + INVITATION_VALID_DAYS * 24 * 60 * 60 * 1000);

  const { error } = await admin.from("invitations").insert({
    email,
    full_name: fullName,
    role: "admin",
    token_hash: hashInvitationToken(token),
    expires_at: expiresAt.toISOString(),
    invited_by: null,
  });
  if (error) {
    if (error.code === "23505") {
      fail(`${email} already has a pending invitation. Revoke it in the database or use that link.`);
    }
    fail(`Could not create the invitation: ${error.message}`);
  }

  const link = new URL(`/invite/${token}`, appUrl).toString();
  console.log(`Invitation for ${fullName} <${email}> created. It expires ${expiresAt.toISOString()}.`);
  console.log(link);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
