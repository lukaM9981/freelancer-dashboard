import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Text,
} from "@react-email/components";
import { body, button, container, fine, heading, text } from "@/lib/email/styles";

type InvitationEmailProps = {
  fullName: string;
  inviteUrl: string;
  logoUrl: string;
};

export function InvitationEmail({ fullName, inviteUrl, logoUrl }: InvitationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Set your password to join Olifant Workboard. The link works for 7 days.</Preview>
      <Body style={body}>
        <Container style={container}>
          <Img src={logoUrl} alt="Olifant Workboard" width={160} height={65} />
          <Heading style={heading}>You&apos;re invited</Heading>
          <Text style={text}>
            {fullName}, Olifant invited you to Olifant Workboard. Set your password to sign in. This
            link works for 7 days.
          </Text>
          <Button href={inviteUrl} style={button}>
            Accept Invitation
          </Button>
          <Text style={fine}>If you were not expecting this, you can ignore the email.</Text>
        </Container>
      </Body>
    </Html>
  );
}
