import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOpsSession } from "@/lib/ops/auth";
import { OPPORTUNITY_LABELS } from "@/lib/ops/crm";
import {
  getCompany,
  getContact,
  getOpportunity,
  getSite,
} from "@/lib/ops/store";
import {
  formatFullName,
  formatRequestNumber,
  formatServices,
  PROJECT_TYPE_LABELS,
} from "@/lib/ops/workflow";

export const dynamic = "force-dynamic";

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await getOpsSession())) {
    redirect("/app/login");
  }

  const { id } = await params;
  const opportunity = await getOpportunity(id);
  if (!opportunity) notFound();

  const [company, contact, site] = await Promise.all([
    opportunity.companyId ? getCompany(opportunity.companyId) : null,
    opportunity.contactId ? getContact(opportunity.contactId) : null,
    opportunity.siteId ? getSite(opportunity.siteId) : null,
  ]);

  return (
    <main className="page-rail py-8">
      <Link
        href="/app/opportunities"
        className="text-sm font-semibold text-[color:var(--sf-cyan)] underline-offset-4 hover:underline"
      >
        Back to opportunities
      </Link>
      <p className="section-kicker mt-6 mb-2">Opportunity</p>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            {opportunity.name}
          </h1>
          <p className="mt-2 text-sm text-[color:var(--sf-ink)]/65">
            {opportunity.owner ?? "Unassigned"}
            {opportunity.source ? ` · ${opportunity.source}` : ""}
          </p>
        </div>
        <p className="rounded-full bg-white px-3 py-1 text-sm font-semibold ring-1 ring-[color:var(--sf-ink)]/10">
          {OPPORTUNITY_LABELS[
            opportunity.stage as keyof typeof OPPORTUNITY_LABELS
          ] ?? opportunity.stage}
        </p>
      </div>

      <dl className="mt-6 grid gap-4 rounded-[0.35rem] border border-[color:var(--sf-ink)]/10 bg-white p-5 sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-[0.14em] text-[color:var(--sf-ink)]/50">
            Company
          </dt>
          <dd className="mt-1">
            {company ? (
              <Link
                href={`/app/companies/${company.id}`}
                className="font-semibold text-[color:var(--sf-cyan)] underline-offset-4 hover:underline"
              >
                {company.name}
              </Link>
            ) : (
              "—"
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.14em] text-[color:var(--sf-ink)]/50">
            Contact
          </dt>
          <dd className="mt-1">
            {contact
              ? `${formatFullName(contact.firstName, contact.lastName)} · ${contact.email}`
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.14em] text-[color:var(--sf-ink)]/50">
            Site
          </dt>
          <dd className="mt-1">
            {site
              ? `${site.name} · ${site.city}${site.province === "ON" ? ", ON" : ""}`
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.14em] text-[color:var(--sf-ink)]/50">
            Scope
          </dt>
          <dd className="mt-1 space-y-1">
            <p>
              {PROJECT_TYPE_LABELS[
                opportunity.projectType as keyof typeof PROJECT_TYPE_LABELS
              ] ??
                opportunity.projectType ??
                "—"}
            </p>
            <p>{formatServices(opportunity.services)}</p>
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.14em] text-[color:var(--sf-ink)]/50">
            Source request
          </dt>
          <dd className="mt-1">
            {opportunity.sourceLeadId ? (
              <Link
                href={`/app/requests/${opportunity.sourceLeadId}`}
                className="font-semibold text-[color:var(--sf-cyan)] underline-offset-4 hover:underline"
              >
                {formatRequestNumber(opportunity.sourceLeadId)}
              </Link>
            ) : (
              "—"
            )}
          </dd>
        </div>
      </dl>
    </main>
  );
}
