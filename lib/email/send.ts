import "server-only";

import type { ReactElement } from "react";
import { render } from "@react-email/components";
import { Resend } from "resend";

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export type SendResult = { ok: true } | { ok: false; error: string };

/** One email through Resend from `EMAIL_FROM` (Tech.md §9). */
export async function sendEmail(input: {
  to: string;
  subject: string;
  react: ReactElement;
  replyTo?: string | null;
  idempotencyKey?: string;
}): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return { ok: false, error: "Email isn't configured." };

  // Rendered here: Resend's own React rendering can't load its renderer inside the Next bundle.
  const [html, text] = await Promise.all([render(input.react), render(input.react, { plainText: true })]);
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send(
    {
      from,
      to: input.to,
      subject: input.subject,
      html,
      text,
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
    },
    input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined,
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
