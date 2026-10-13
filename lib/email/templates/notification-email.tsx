import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { body, button, container, fine, heading, item, itemDetail, itemTitle, text } from "@/lib/email/styles";

export type EmailItem = { title: string; detail?: string };

/** What one email says. Built per event type in `lib/email/templates/content.ts`. */
export type EmailContent = {
  subject: string;
  heading: string;
  summary: string;
  items?: EmailItem[];
  button: { label: string; href: string };
};

/** The shared frame: logo, heading, a short summary, optional items, one yellow button. */
export function NotificationEmail({ content, logoUrl }: { content: EmailContent; logoUrl: string }) {
  return (
    <Html>
      <Head />
      <Preview>{content.summary}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Img src={logoUrl} alt="Olifant Workboard" width={160} height={65} />
          <Heading style={heading}>{content.heading}</Heading>
          <Text style={text}>{content.summary}</Text>
          {content.items && content.items.length > 0 ? (
            <Section style={{ margin: "0 0 24px" }}>
              {content.items.map((entry, index) => (
                <Section key={index} style={item}>
                  <Text style={itemTitle}>{entry.title}</Text>
                  {entry.detail ? <Text style={itemDetail}>{entry.detail}</Text> : null}
                </Section>
              ))}
            </Section>
          ) : null}
          <Button href={content.button.href} style={button}>
            {content.button.label}
          </Button>
          <Text style={fine}>You get this email because of your work in Olifant Workboard.</Text>
        </Container>
      </Body>
    </Html>
  );
}
