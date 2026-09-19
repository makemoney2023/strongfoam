"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

function fail(path: string, error: string): never {
  redirect(`${path}?error=${encodeURIComponent(error)}`);
}

function refreshCompanies(companyId?: string) {
  revalidatePath("/app/companies");
  revalidatePath("/app/opportunities");
  revalidatePath("/app/projects");
  revalidatePath("/app/jobs");
  if (companyId) revalidatePath(`/app/companies/${companyId}`);
}

export async function createCompany(formData: FormData) {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const parsed = parseCompanyInput({
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    city: String(formData.get("city") ?? ""),
    province: String(formData.get("province") ?? ""),
  });
  if (!parsed.ok) fail("/app/companies", parsed.error);
  const company = await addCompany(parsed.value);
  refreshCompanies(company.id);
  redirect(`/app/companies/${company.id}?saved=1`);
}

export async function saveCompany(formData: FormData) {
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
  if (!id) fail("/app/companies", "Missing company.");
  if (!parsed.ok) fail(`/app/companies/${id}`, parsed.error);
  const company = await updateCompany(id, parsed.value);
  if (!company) fail(`/app/companies/${id}`, "That company could not be updated.");
  refreshCompanies(id);
  redirect(`/app/companies/${id}?saved=1`);
}

export async function removeCompany(formData: FormData) {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const id = String(formData.get("id") ?? "");
  if (!id) fail("/app/companies", "Missing company.");
  const result = await deleteCompany(id);
  if (!result.ok) fail(`/app/companies/${id}`, result.error);
  refreshCompanies();
  redirect("/app/companies?saved=1");
}

export async function createCompanyContact(formData: FormData) {
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
  if (!companyId) fail("/app/companies", "Missing company.");
  if (!parsed.ok) fail(`/app/companies/${companyId}`, parsed.error);
  const contact = await addContact({ companyId, input: parsed.value });
  if (!contact) fail(`/app/companies/${companyId}`, "That contact could not be saved.");
  refreshCompanies(companyId);
  redirect(`/app/companies/${companyId}?saved=1`);
}

export async function saveCompanyContact(formData: FormData) {
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
  if (!companyId || !id) fail("/app/companies", "Missing contact.");
  if (!parsed.ok) fail(`/app/companies/${companyId}`, parsed.error);
  const contact = await updateContact(id, parsed.value);
  if (!contact) fail(`/app/companies/${companyId}`, "That contact could not be updated.");
  refreshCompanies(companyId);
  redirect(`/app/companies/${companyId}?saved=1`);
}

export async function removeCompanyContact(formData: FormData) {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const companyId = String(formData.get("companyId") ?? "");
  const id = String(formData.get("id") ?? "");
  if (!companyId || !id) fail("/app/companies", "Missing contact.");
  const contact = await deleteContact(id);
  if (!contact) fail(`/app/companies/${companyId}`, "That contact could not be deleted.");
  refreshCompanies(companyId);
  redirect(`/app/companies/${companyId}?saved=1`);
}

export async function createCompanySite(formData: FormData) {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const companyId = String(formData.get("companyId") ?? "");
  const parsed = parseSiteInput({
    name: String(formData.get("name") ?? ""),
    city: String(formData.get("city") ?? ""),
    province: String(formData.get("province") ?? ""),
  });
  if (!companyId) fail("/app/companies", "Missing company.");
  if (!parsed.ok) fail(`/app/companies/${companyId}`, parsed.error);
  const site = await addSite({ companyId, input: parsed.value });
  if (!site) fail(`/app/companies/${companyId}`, "That site could not be saved.");
  refreshCompanies(companyId);
  redirect(`/app/companies/${companyId}?saved=1`);
}

export async function saveCompanySite(formData: FormData) {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const companyId = String(formData.get("companyId") ?? "");
  const id = String(formData.get("id") ?? "");
  const parsed = parseSiteInput({
    name: String(formData.get("name") ?? ""),
    city: String(formData.get("city") ?? ""),
    province: String(formData.get("province") ?? ""),
  });
  if (!companyId || !id) fail("/app/companies", "Missing site.");
  if (!parsed.ok) fail(`/app/companies/${companyId}`, parsed.error);
  const site = await updateSite(id, parsed.value);
  if (!site) fail(`/app/companies/${companyId}`, "That site could not be updated.");
  refreshCompanies(companyId);
  redirect(`/app/companies/${companyId}?saved=1`);
}

export async function removeCompanySite(formData: FormData) {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const companyId = String(formData.get("companyId") ?? "");
  const id = String(formData.get("id") ?? "");
  if (!companyId || !id) fail("/app/companies", "Missing site.");
  const result = await deleteSite(id);
  if (!result.ok) fail(`/app/companies/${companyId}`, result.error);
  refreshCompanies(companyId);
  redirect(`/app/companies/${companyId}?saved=1`);
}
