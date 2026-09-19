import Link from "next/link";
import { redirect } from "next/navigation";
import { DateRangeFields, FilterSubmit, ListFilters } from "@/components/ops/list-filters";
import { NativeSelect } from "@/components/ops/native-select";
import { PageHeader } from "@/components/ops/page-header";
import { StatusBadge } from "@/components/ops/status-badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getOpsSession } from "@/lib/ops/auth";
import { OPPORTUNITY_LABELS, OPPORTUNITY_STAGES } from "@/lib/ops/crm";
import { listCompanies, listOpportunities } from "@/lib/ops/store";
import { formatServices } from "@/lib/ops/workflow";

export const dynamic = "force-dynamic";

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; stage?: string; from?: string; to?: string }>;
}) {
  if (!(await getOpsSession())) {
    redirect("/app/login");
  }

  const params = await searchParams;
  const [opportunities, companies] = await Promise.all([
    listOpportunities({
      q: params.q,
      stage: params.stage,
      from: params.from,
      to: params.to,
    }),
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

      <ListFilters>
        <div className="space-y-2">
          <Label htmlFor="q">Search</Label>
          <Input
            id="q"
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Name, owner, source"
            className="h-11 min-w-56"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="stage">Stage</Label>
          <NativeSelect id="stage" name="stage" defaultValue={params.stage ?? ""} className="h-11 w-48">
            <option value="">All stages</option>
            {OPPORTUNITY_STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {OPPORTUNITY_LABELS[stage]}
              </option>
            ))}
          </NativeSelect>
        </div>
        <DateRangeFields from={params.from} to={params.to} />
        <FilterSubmit />
      </ListFilters>

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
                  No opportunities match these filters.
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
