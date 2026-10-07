import type { Metadata } from "next";
import { AcceptInvitationForm } from "@/components/auth/accept-invitation-form";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { findPendingInvitation } from "@/lib/invitations/queries";

export const metadata: Metadata = { title: "Accept your invitation · Olifant Workboard" };

export default async function InvitePage({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const invitation = await findPendingInvitation(token);

  if (!invitation) {
    return (
      <Card>
        <CardHeader>
          <h1 className="text-heading-md">Invitation expired</h1>
          <CardDescription>This invitation link has expired. Ask Olifant for a new one.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const role = invitation.role === "admin" ? "an Admin" : "a Freelancer";

  return (
    <Card>
      <CardHeader>
        <h1 className="text-heading-md">Set up your account</h1>
        <CardDescription>
          You&apos;ve been invited to Olifant Workboard as {role}. Check your name and choose a
          password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AcceptInvitationForm token={token} email={invitation.email} fullName={invitation.fullName} />
      </CardContent>
    </Card>
  );
}
