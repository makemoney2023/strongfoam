import { verifyLeadId } from "@/lib/leads/hmac";

export type ThanksLead = {
  status: "qualified" | "secondary";
  firstName: string;
  lastName: string;
  email: string;
};

export type ThanksView = {
  showCalendly: boolean;
  name?: string;
  email?: string;
};

export async function resolveThanksView(args: {
  lid: string;
  k: string;
  secret: string;
  loadLead: (id: string) => Promise<ThanksLead | null>;
}): Promise<ThanksView> {
  if (!args.lid || !args.k || !args.secret) {
    return { showCalendly: false };
  }
  if (!verifyLeadId(args.lid, args.k, args.secret)) {
    return { showCalendly: false };
  }
  const lead = await args.loadLead(args.lid);
  if (!lead || lead.status !== "qualified") {
    return { showCalendly: false };
  }
  return {
    showCalendly: true,
    name: `${lead.firstName} ${lead.lastName}`.trim(),
    email: lead.email,
  };
}
