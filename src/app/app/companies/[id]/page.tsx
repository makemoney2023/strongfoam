import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOpsSession } from "@/lib/ops/auth";
import { OPPORTUNITY_LABELS } from "@/lib/ops/crm";
import {
  getCompany,
  listContacts,
  listOpportunities,
  listSites,
} from "@/lib/ops/store";
import { formatFullName, formatServices } from "@/lib/ops/workflow";

export const dynamic = "force-dynamic";

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await getOpsSession())) {
    redirect("/app/login");
  }

  const { id } = await params;
  const company = await getCompany(id);
  if (!company) notFound();

  const [contacts, sites, opportunities] = await Promise.all([
    listContacts(company.id),
    listSites(company.id),
    listOpportunities(),
  ]);
  const companyOpportunities = opportunities.filter(
    (opportunity) => opportunity.companyId === company.id,
  );

  return (
    <main className="page-rail py-8">
      <Link
        href="/app/companies"
        className="text-sm font-semibold text-[color:var(--sf-cyan)] underline-offset-4 hover:underline"
      >
        Back to companies
      </Link>
      <p className="section-kicker mt-6 mb-2">Company</p>
      <h1 className="font-heading text-3xl font-semibold tracking-tight">
        {company.name}
      </h1>
      <p className="mt-2 text-sm text-[color:var(--sf-ink)]/65">
        {[company.city, company.province === "ON" ? "ON" : company.province]
          .filter(Boolean)
          .join(", ") || "Location not set"}
        {company.email ? ` · ${company.email}` : ""}
        {company.phone ? ` · ${company.phone}` : ""}
      </p>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="rounded-[0.35rem] border border-[color:var(--sf-ink)]/10 bg-white p-5">
          <h2 className="font-heading text-lg font-semibold">Contacts</h2>
          {contacts.length === 0 ? (
            <p className="mt-3 text-sm text-[color:var(--sf-ink)]/60">
              No contacts are linked to this company.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {contacts.map((contact) => (
                <li key={contact.id}>
                  <p className="font-medium">
                    {formatFullName(contact.firstName, contact.lastName)}
                  </p>
                  <p className="text-sm text-[color:var(--sf-ink)]/65">
                    {contact.email}
                    {contact.phone ? ` · ${contact.phone}` : ""}
                  </p>
                  {contact.role ? (
                    <p className="text-xs text-[color:var(--sf-ink)]/55">
                      {contact.role}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-[0.35rem] border border-[color:var(--sf-ink)]/10 bg-white p-5">
          <h2 className="font-heading text-lg font-semibold">Sites</h2>
          {sites.length === 0 ? (
            <p className="mt-3 text-sm text-[color:var(--sf-ink)]/60">
              No sites are linked to this company.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {sites.map((site) => (
                <li key={site.id}>
                  <p className="font-medium">{site.name}</p>
                  <p className="text-sm text-[color:var(--sf-ink)]/65">
                    {site.city}
                    {site.province === "ON" ? ", ON" : ` · ${site.province}`}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-6 rounded-[0.35rem] border border-[color:var(--sf-ink)]/10 bg-white p-5">
        <h2 className="font-heading text-lg font-semibold">Opportunities</h2>
        {companyOpportunities.length === 0 ? (
          <p className="mt-3 text-sm text-[color:var(--sf-ink)]/60">
            No opportunities are linked to this company yet.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {companyOpportunities.map((opportunity) => (
              <li key={opportunity.id}>
                <Link
                  href={`/app/opportunities/${opportunity.id}`}
                  className="font-semibold text-[color:var(--sf-cyan)] underline-offset-4 hover:underline"
                >
                  {opportunity.name}
                </Link>
                <p className="text-sm text-[color:var(--sf-ink)]/65">
                  {OPPORTUNITY_LABELS[
                    opportunity.stage as keyof typeof OPPORTUNITY_LABELS
                  ] ?? opportunity.stage}
                  {" · "}
                  {formatServices(opportunity.services)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
