import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Role } from "@/lib/auth/queries";
import { hashInvitationToken, isWellFormedToken } from "@/lib/invitations/tokens";

export type PendingInvitation = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
};

/**
 * Looks up an invitation by its raw token for someone who has no session yet, so it uses
 * the admin client (Tech.md §5.2). Returns null when the link is unknown, accepted,
 * revoked, or expired.
 */
export async function findPendingInvitation(token: string): Promise<PendingInvitation | null> {
  if (!isWellFormedToken(token)) return null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("invitations")
    .select("id, email, full_name, role, expires_at, accepted_at, revoked_at")
    .eq("token_hash", hashInvitationToken(token))
    .maybeSingle();

  if (error) throw new Error(`Invitation lookup failed: ${error.message}`);
  if (!data || data.accepted_at || data.revoked_at) return null;
  if (new Date(data.expires_at).getTime() <= Date.now()) return null;

  return {
    id: data.id,
    email: data.email,
    fullName: data.full_name,
    role: data.role as Role,
  };
}
