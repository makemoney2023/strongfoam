import Link from "next/link";
import { redirect } from "next/navigation";
import { getOpsSession } from "@/lib/ops/auth";
import { listCompanies, listContacts, listOpportunities } from "@/lib/ops/store";

export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  if (!(await getOpsSession())) {
    redirect("/app/login");
  }

  const [companies, contacts, opportunities] = await Promise.all([
    listCompanies(),
    listContacts(),
    listOpportunities(),
  ]);

  return (
    <main className="page-rail py-8">
      <p className="section-kicker mb-2">CRM</p>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Companies
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[color:var(--sf-ink)]/70">
            Companies created or linked from estimate requests. Contacts, sites,
            and opportunities stay attached to the company record.
          </p>
        </div>
        <p className="text-sm font-semibold text-[color:var(--sf-ink)]/60">
          {companies.length} compan{companies.length === 1 ? "y" : "ies"}
        </p>
      </div>

      <div className="mt-6 overflow-x-auto rounded-[0.35rem] border border-[color:var(--sf-ink)]/10 bg-white">
        <table className="min-w-[48rem] w-full border-collapse text-left text-sm">
          <thead className="bg-[color:var(--sf-mist,#e9edef)] text-xs uppercase tracking-[0.12em] text-[color:var(--sf-ink)]/60">
            <tr>
              <th className="px-4 py-3 font-semibold">Company</th>
              <th className="px-4 py-3 font-semibold">Location</th>
              <th className="px-4 py-3 font-semibold">Contacts</th>
              <th className="px-4 py-3 font-semibold">Opportunities</th>
            </tr>
          </thead>
          <tbody>
            {companies.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-[color:var(--sf-ink)]/60">
                  No companies yet. Convert an estimate request to create the
                  first record.
                </td>
              </tr>
            ) : (
              companies.map((company) => {
                const companyContacts = contacts.filter(
                  (contact) => contact.companyId === company.id,
                );
                const companyOpportunities = opportunities.filter(
                  (opportunity) => opportunity.companyId === company.id,
                );
                return (
                  <tr
                    key={company.id}
                    className="border-t border-[color:var(--sf-ink)]/8 hover:bg-[color:var(--sf-cyan)]/5"
                  >
                    <td className="px-4 py-3 align-top">
                      <Link
                        href={`/app/companies/${company.id}`}
                        className="font-semibold text-[color:var(--sf-cyan)] underline-offset-4 hover:underline"
                      >
                        {company.name}
                      </Link>
                      {company.email ? (
                        <p className="text-xs text-[color:var(--sf-ink)]/55">
                          {company.email}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {company.city
                        ? `${company.city}${company.province === "ON" ? ", ON" : ""}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 align-top">{companyContacts.length}</td>
                    <td className="px-4 py-3 align-top">
                      {companyOpportunities.length}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
