"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  fail,
  invalidFrom,
  succeed,
  type ActionState,
} from "@/lib/ops/action-result";
import { getOpsSession } from "@/lib/ops/auth";
import {
  parseCompanyInput,
  parseContactInput,
  parseSiteInput,
} from "@/lib/ops/records";
import {
  addCompany,
  addContact,
  addSite,
  deleteCompany,
  deleteContact,
  deleteSite,
  updateCompany,
  updateContact,
  updateSite,
} from "@/lib/ops/store";

function refreshCompanies(companyId?: string) {
  revalidatePath("/app/companies");
  revalidatePath("/app/opportunities");
  revalidatePath("/app/projects");
  revalidatePath("/app/jobs");
  if (companyId) revalidatePath(`/app/companies/${companyId}`);
}

export async function createCompany(formData: FormData): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const parsed = parseCompanyInput({
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    city: String(formData.get("city") ?? ""),
    province: String(formData.get("province") ?? ""),
  });
  if (!parsed.ok) return invalidFrom(parsed);
  const company = await addCompany(parsed.value);
  refreshCompanies(company.id);
  return succeed(`/app/companies/${company.id}`, "Company created.");
}

export async function saveCompany(formData: FormData): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const id = String(formData.get("id") ?? "");
  const parsed = parseCompanyInput({
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    city: String(formData.get("city") ?? ""),
    province: String(formData.get("province") ?? ""),
  });
  if (!id) return fail("/app/companies", "Missing company.");
  if (!parsed.ok) return invalidFrom(parsed);
  const company = await updateCompany(id, parsed.value);
  if (!company) return fail(`/app/companies/${id}`, "That company could not be updated.");
  refreshCompanies(id);
  return succeed(`/app/companies/${id}`, "Company saved.");
}

export async function removeCompany(formData: FormData): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const id = String(formData.get("id") ?? "");
  if (!id) return fail("/app/companies", "Missing company.");
  const result = await deleteCompany(id);
  if (!result.ok) return fail(`/app/companies/${id}`, result.error);
  refreshCompanies();
  return succeed("/app/companies", "Company deleted.");
}

export async function createCompanyContact(formData: FormData): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const companyId = String(formData.get("companyId") ?? "");
  const parsed = parseContactInput({
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    role: String(formData.get("role") ?? ""),
  });
  if (!companyId) return fail("/app/companies", "Missing company.");
  if (!parsed.ok) return invalidFrom(parsed);
  const contact = await addContact({ companyId, input: parsed.value });
  if (!contact) return fail(`/app/companies/${companyId}`, "That contact could not be saved.");
  refreshCompanies(companyId);
  return succeed(`/app/companies/${companyId}`, "Contact added.");
}

export async function saveCompanyContact(formData: FormData): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const companyId = String(formData.get("companyId") ?? "");
  const id = String(formData.get("id") ?? "");
  const parsed = parseContactInput({
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    role: String(formData.get("role") ?? ""),
  });
  if (!companyId || !id) return fail("/app/companies", "Missing contact.");
  if (!parsed.ok) return invalidFrom(parsed);
  const contact = await updateContact(id, parsed.value);
  if (!contact) return fail(`/app/companies/${companyId}`, "That contact could not be updated.");
  refreshCompanies(companyId);
  return succeed(`/app/companies/${companyId}`, "Contact saved.");
}

export async function removeCompanyContact(formData: FormData): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const companyId = String(formData.get("companyId") ?? "");
  const id = String(formData.get("id") ?? "");
  if (!companyId || !id) return fail("/app/companies", "Missing contact.");
  const contact = await deleteContact(id);
  if (!contact) return fail(`/app/companies/${companyId}`, "That contact could not be deleted.");
  refreshCompanies(companyId);
  return succeed(`/app/companies/${companyId}`, "Contact deleted.");
}

export async function createCompanySite(formData: FormData): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const companyId = String(formData.get("companyId") ?? "");
  const parsed = parseSiteInput({
    name: String(formData.get("name") ?? ""),
    city: String(formData.get("city") ?? ""),
    province: String(formData.get("province") ?? ""),
  });
  if (!companyId) return fail("/app/companies", "Missing company.");
  if (!parsed.ok) return invalidFrom(parsed);
  const site = await addSite({ companyId, input: parsed.value });
  if (!site) return fail(`/app/companies/${companyId}`, "That site could not be saved.");
  refreshCompanies(companyId);
  return succeed(`/app/companies/${companyId}`, "Site added.");
}

export async function saveCompanySite(formData: FormData): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const companyId = String(formData.get("companyId") ?? "");
  const id = String(formData.get("id") ?? "");
  const parsed = parseSiteInput({
    name: String(formData.get("name") ?? ""),
    city: String(formData.get("city") ?? ""),
    province: String(formData.get("province") ?? ""),
  });
  if (!companyId || !id) return fail("/app/companies", "Missing site.");
  if (!parsed.ok) return invalidFrom(parsed);
  const site = await updateSite(id, parsed.value);
  if (!site) return fail(`/app/companies/${companyId}`, "That site could not be updated.");
  refreshCompanies(companyId);
  return succeed(`/app/companies/${companyId}`, "Site saved.");
}

export async function removeCompanySite(formData: FormData): Promise<ActionState> {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const companyId = String(formData.get("companyId") ?? "");
  const id = String(formData.get("id") ?? "");
  if (!companyId || !id) return fail("/app/companies", "Missing site.");
  const result = await deleteSite(id);
  if (!result.ok) return fail(`/app/companies/${companyId}`, result.error);
  refreshCompanies(companyId);
  return succeed(`/app/companies/${companyId}`, "Site deleted.");
}
