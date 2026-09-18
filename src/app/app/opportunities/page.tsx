import Link from "next/link";
import { redirect } from "next/navigation";
import { getOpsSession } from "@/lib/ops/auth";
import { OPPORTUNITY_LABELS } from "@/lib/ops/crm";
import { listCompanies, listOpportunities } from "@/lib/ops/store";
import { formatServices } from "@/lib/ops/workflow";

export const dynamic = "force-dynamic";

export default async function OpportunitiesPage() {
  if (!(await getOpsSession())) {
    redirect("/app/login");
  }

  const [opportunities, companies] = await Promise.all([
    listOpportunities(),
    listCompanies(),
  ]);

  return (
    <main className="page-rail py-8">
      <p className="section-kicker mb-2">CRM</p>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Opportunities
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[color:var(--sf-ink)]/70">
            Opportunities created from estimate requests keep the source survey
            and the company record connected.
          </p>
        </div>
        <p className="text-sm font-semibold text-[color:var(--sf-ink)]/60">
          {opportunities.length} opportunit
          {opportunities.length === 1 ? "y" : "ies"}
        </p>
      </div>

      <div className="mt-6 overflow-x-auto rounded-[0.35rem] border border-[color:var(--sf-ink)]/10 bg-white">
        <table className="min-w-[56rem] w-full border-collapse text-left text-sm">
          <thead className="bg-[color:var(--sf-mist,#e9edef)] text-xs uppercase tracking-[0.12em] text-[color:var(--sf-ink)]/60">
            <tr>
              <th className="px-4 py-3 font-semibold">Opportunity</th>
              <th className="px-4 py-3 font-semibold">Company</th>
              <th className="px-4 py-3 font-semibold">Stage</th>
              <th className="px-4 py-3 font-semibold">Services</th>
              <th className="px-4 py-3 font-semibold">Owner</th>
            </tr>
          </thead>
          <tbody>
            {opportunities.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-[color:var(--sf-ink)]/60">
                  No opportunities yet. Convert a request to create the first
                  one.
                </td>
              </tr>
            ) : (
              opportunities.map((opportunity) => {
                const company = companies.find(
                  (item) => item.id === opportunity.companyId,
                );
                return (
                  <tr
                    key={opportunity.id}
                    className="border-t border-[color:var(--sf-ink)]/8 hover:bg-[color:var(--sf-cyan)]/5"
                  >
                    <td className="px-4 py-3 align-top">
                      <Link
                        href={`/app/opportunities/${opportunity.id}`}
                        className="font-semibold text-[color:var(--sf-cyan)] underline-offset-4 hover:underline"
                      >
                        {opportunity.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 align-top">
                      {company ? (
                        <Link
                          href={`/app/companies/${company.id}`}
                          className="underline-offset-4 hover:underline"
                        >
                          {company.name}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {OPPORTUNITY_LABELS[
                        opportunity.stage as keyof typeof OPPORTUNITY_LABELS
                      ] ?? opportunity.stage}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {formatServices(opportunity.services)}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {opportunity.owner ?? "Unassigned"}
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
