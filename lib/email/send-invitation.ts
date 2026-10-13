import "server-only";

import { appUrl } from "@/lib/auth/urls";
import { InvitationEmail } from "@/lib/email/invitation";
import { emailConfigured, sendEmail } from "@/lib/email/send";

export function invitationEmailConfigured(): boolean {
  return emailConfigured();
}

export async function sendInvitationEmail(input: {
  to: string;
  fullName: string;
  inviteUrl: string;
  replyTo: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  return sendEmail({
    to: input.to,
    subject: "You're invited to Olifant Workboard",
    replyTo: input.replyTo,
    react: InvitationEmail({
      fullName: input.fullName,
      inviteUrl: input.inviteUrl,
      logoUrl: appUrl("/brand/logo-full.png"),
    }),
  });
}
