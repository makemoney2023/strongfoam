import { z, type ZodError } from "zod";
import { SERVICE_IDS } from "@/lib/leads/types";

const uuid = z.string().uuid();

const contactFields = {
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  phone: z.string().trim().min(7).max(40),
  consent: z.literal(true),
  companyWebsite: z.string().max(200),
  startedAt: z.number().int().positive(),
  draftId: uuid,
  uploadPaths: z.array(z.string().max(500)).max(5),
};

const shortSchema = z.object({
  projectType: z.literal("residential_other"),
  city: z.string().trim().min(1).max(80),
  province: z.enum(["ON", "outside_ontario"]),
  notes: z.string().max(2000).optional().default(""),
  company: z.string().trim().max(120).optional().default(""),
  services: z.array(z.never()).optional().default([]),
  ...contactFields,
});

const fullSchema = z.object({
  projectType: z.enum(["commercial_ici", "multi_unit", "industrial"]),
  city: z.string().trim().min(1).max(80),
  province: z.enum(["ON", "outside_ontario"]),
  services: z.array(z.enum(SERVICE_IDS)).min(1),
  role: z.enum(["gc", "owner_rep", "consultant", "property_manager", "other"]),
  buildingType: z.string().trim().max(120).optional().default(""),
  timeline: z.enum([
    "now_tendering",
    "0_3_months",
    "3_12_months",
    "exploratory",
  ]),
  drawingsReady: z.enum(["yes", "no", "later"]),
  notes: z.string().max(2000).optional().default(""),
  company: z.string().trim().min(1).max(120),
  ...contactFields,
});

export const leadPayloadSchema = z
  .union([shortSchema, fullSchema])
  .transform(({ companyWebsite, ...data }) => {
    void companyWebsite;
    return data;
  });
export type LeadPayload = z.infer<typeof leadPayloadSchema>;

export type ParseLeadPayloadResult =
  | { ok: true; data: LeadPayload }
  | { ok: false; error: ZodError };

export function parseLeadPayload(input: unknown): ParseLeadPayloadResult {
  const result = leadPayloadSchema.safeParse(input);
  if (!result.success) {
    return { ok: false, error: result.error };
  }
  return { ok: true, data: result.data };
}
