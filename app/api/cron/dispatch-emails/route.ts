import { createHash, timingSafeEqual } from "node:crypto";
import { dispatchEmails } from "@/lib/email/dispatch";

export const maxDuration = 60;

/**
 * Retries the email outbox: failures (up to five attempts) and anything an interrupted
 * `after()` left behind. `pg_cron` calls it every five minutes (migration 0011, Tech.md §9).
 */
export async function POST(request: Request) {
  if (!authorized(request.headers.get("authorization"))) {
    return Response.json({ error: "Not authorized." }, { status: 401 });
  }
  try {
    const result = await dispatchEmails({ maxRounds: 10 });
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Email dispatch failed", error);
    return Response.json({ error: "Dispatch failed." }, { status: 500 });
  }
}

function authorized(header: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header) return false;
  // Hashing first makes the comparison constant-time whatever the lengths.
  const expected = createHash("sha256").update(`Bearer ${secret}`).digest();
  const received = createHash("sha256").update(header).digest();
  return timingSafeEqual(expected, received);
}
