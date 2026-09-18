import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ops/page-header";
import { StatusBadge } from "@/components/ops/status-badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
    <div className="space-y-6">
      <PageHeader
        title="Opportunities"
        description="Opportunities created from estimate requests keep the source survey and the company record connected."
        actions={
          <p className="text-sm text-muted-foreground">
            {opportunities.length} opportunit{opportunities.length === 1 ? "y" : "ies"}
          </p>
        }
      />

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Opportunity</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Services</TableHead>
              <TableHead>Owner</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {opportunities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No opportunities yet. Convert a request to create the first one.
                </TableCell>
              </TableRow>
            ) : (
              opportunities.map((opportunity) => {
                const company = companies.find((item) => item.id === opportunity.companyId);
                return (
                  <TableRow key={opportunity.id}>
                    <TableCell>
                      <Link
                        href={`/app/opportunities/${opportunity.id}`}
                        className="font-medium hover:underline"
                      >
                        {opportunity.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {company ? (
                        <Link href={`/app/companies/${company.id}`} className="hover:underline">
                          {company.name}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={opportunity.stage}
                        label={
                          OPPORTUNITY_LABELS[opportunity.stage as keyof typeof OPPORTUNITY_LABELS] ??
                          opportunity.stage
                        }
                      />
                    </TableCell>
                    <TableCell>{formatServices(opportunity.services)}</TableCell>
                    <TableCell>{opportunity.owner ?? "Unassigned"}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
