export type LeadEmailInput = {
  status: "qualified" | "secondary";
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  city: string;
  services: string[];
  reasons: string[];
  fileLinks: string[];
  calendlyOffered: boolean;
};

export function buildEstimatingEmail(input: LeadEmailInput) {
  const who = input.company || `${input.firstName} ${input.lastName}`;
  return {
    subject: `New estimate · ${input.status} · ${who} · ${input.city}`,
    text: [
      `Lead type: ${input.status}`,
      `Name: ${input.firstName} ${input.lastName}`,
      `Company: ${input.company || "(none)"}`,
      `City: ${input.city}`,
      `Services: ${input.services.join(", ") || "(none)"}`,
      `Qualification reasons: ${input.reasons.join(", ") || "(qualified)"}`,
      `Calendly offered: ${input.calendlyOffered ? "yes" : "no"}`,
      `Files:`,
      ...input.fileLinks,
    ].join("\n"),
  };
}

export function buildVisitorEmail(input: LeadEmailInput) {
  const qualified =
    "We received your estimate request. You can book a call on the thanks page.";
  const secondary =
    "We received your request. Estimating will follow up. This form does not book a site visit.";
  return {
    subject: "Strong Foam received your estimate request",
    text: input.status === "qualified" ? qualified : secondary,
  };
}
