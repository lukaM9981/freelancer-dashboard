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
          <Heading style={heading}>You're invited</Heading>
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

const body = {
  backgroundColor: "#FFFEF9",
  fontFamily: "Georgia, 'Times New Roman', serif",
  margin: "0",
  padding: "32px 16px",
};

const container = {
  backgroundColor: "#ffffff",
  border: "1px solid #d1cdc7",
  borderRadius: "16px",
  margin: "0 auto",
  maxWidth: "480px",
  padding: "32px",
};

const heading = {
  color: "#19130D",
  fontSize: "28px",
  fontWeight: "700",
  lineHeight: "1.2",
  margin: "24px 0 8px",
};

const text = {
  color: "#19130D",
  fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
  fontSize: "16px",
  lineHeight: "1.5",
  margin: "0 0 24px",
};

const button = {
  backgroundColor: "#ffd046",
  borderRadius: "999px",
  color: "#19130D",
  display: "inline-block",
  fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
  fontSize: "16px",
  fontWeight: "700",
  padding: "12px 24px",
  textDecoration: "none",
};

const fine = {
  color: "#70675c",
  fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
  fontSize: "13px",
  lineHeight: "1.4",
  margin: "24px 0 0",
};
