const RECIPIENT_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type CloudflareEmailMessage = {
  to: string[];
  from: string;
  subject: string;
  text: string;
};

export type CloudflareEmailBinding = {
  send(message: CloudflareEmailMessage): Promise<{ messageId?: string } | void>;
};

export function parseNotifyRecipients(raw: string): string[] {
  const recipients = [
    ...new Set(
      raw
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ];
  if (recipients.length === 0 || recipients.some((value) => !RECIPIENT_PATTERN.test(value))) {
    throw new Error("Cloudflare email requires a valid recipient");
  }
  return recipients;
}

export async function sendThroughCloudflareEmail(
  binding: CloudflareEmailBinding,
  message: CloudflareEmailMessage,
): Promise<void> {
  if (message.to.length === 0) {
    throw new Error("Cloudflare email requires a valid recipient");
  }
  await binding.send(message);
}
