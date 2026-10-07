import { createHash, randomBytes } from "node:crypto";

// Also imported by scripts/, so no "server-only" here.

export const INVITATION_VALID_DAYS = 7;

export function generateInvitationToken() {
  return randomBytes(32).toString("base64url");
}

export function hashInvitationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

// 32 bytes in base64url without padding is 43 characters.
export function isWellFormedToken(token: string) {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}
