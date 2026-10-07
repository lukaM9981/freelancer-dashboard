import "server-only";

import { Resend } from "resend";
import { appUrl } from "@/lib/auth/urls";
import { InvitationEmail } from "@/lib/email/invitation";

export function invitationEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendInvitationEmail(input: {
  to: string;
  fullName: string;
  inviteUrl: string;
  replyTo: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return { ok: false, error: "Email isn't configured." };

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: input.to,
    subject: "You're invited to Olifant Workboard",
    replyTo: input.replyTo,
    react: InvitationEmail({
      fullName: input.fullName,
      inviteUrl: input.inviteUrl,
      logoUrl: appUrl("/brand/logo-full.png"),
    }),
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
