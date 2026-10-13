export type LeadEmailInput = {
  intakeType: "estimate" | "general";
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
  message?: string;
};

export function buildEstimatingEmail(input: LeadEmailInput) {
  const who = input.company || `${input.firstName} ${input.lastName}`;
  if (input.intakeType === "general") {
    return {
      subject: `General inquiry · ${who}`,
      text: [
        "Lead type: general inquiry",
        `Name: ${input.firstName} ${input.lastName}`,
        `Company: ${input.company || "(none)"}`,
        `Email: ${input.email}`,
        "Location: not supplied",
        "Services: (none)",
        "Calendly offered: no",
        "Message:",
        input.message ?? "",
      ].join("\n"),
    };
  }
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
  if (input.intakeType === "general") {
    return {
      subject: "Strong Foam received your inquiry",
      text: "We received your message. The office will reply. This form does not book a site visit.",
    };
  }
  const qualified =
    "We received your estimate request. You can book a call on the thanks page.";
  const secondary =
    "We received your request. Estimating will follow up. This form does not book a site visit.";
  return {
    subject: "Strong Foam received your estimate request",
    text: input.status === "qualified" ? qualified : secondary,
  };
}
