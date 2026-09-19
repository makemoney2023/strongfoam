import { Building2Icon } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/ops/empty-state";
import { ListFilters, FilterSubmit } from "@/components/ops/list-filters";
import { PageHeader } from "@/components/ops/page-header";
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
import {
  listCompanies,
  listContacts,
  listOpportunities,
  listProjects,
} from "@/lib/ops/store";
import { NewCompanyDialog } from "./new-company-dialog";

export const dynamic = "force-dynamic";

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  if (!(await getOpsSession())) {
    redirect("/app/login");
  }

  const params = await searchParams;
  const [companies, contacts, opportunities, projects] = await Promise.all([
    listCompanies({ q: params.q }),
    listContacts(),
    listOpportunities(),
    listProjects(),
  ]);
  const isFiltered = Boolean(params.q?.trim());

  return (
    <div className="space-y-6">
      <PageHeader
        title="Companies"
        description="Customers and partners. Contacts, sites, opportunities, and projects stay attached to the company."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-muted-foreground">
              {companies.length} compan{companies.length === 1 ? "y" : "ies"}
            </p>
            <NewCompanyDialog />
          </div>
        }
      />

      <ListFilters>
        <div className="space-y-2">
          <Label htmlFor="q">Search</Label>
          <Input
            id="q"
            name="q"
            type="search"
            defaultValue={params.q ?? ""}
            placeholder="Name, city, email"
            className="h-11 min-w-56"
          />
        </div>
        <FilterSubmit />
      </ListFilters>

      <Card>
        {companies.length === 0 ? (
          <EmptyState
            icon={<Building2Icon aria-hidden="true" />}
            title={isFiltered ? "No companies match this search" : "No companies yet"}
            description={
              isFiltered
                ? "Try a shorter name or clear the search."
                : "Companies are created automatically when you convert an estimate request, or you can add one directly."
            }
            action={
              isFiltered ? (
                <Link href="/app/companies" className="text-sm font-medium underline underline-offset-4">
                  Clear search
                </Link>
              ) : (
                <NewCompanyDialog triggerLabel="Add your first company" />
              )
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Contacts</TableHead>
                <TableHead>Opportunities</TableHead>
                <TableHead>Projects</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((company) => {
                const companyContacts = contacts.filter(
                  (contact) => contact.companyId === company.id,
                );
                const companyOpportunities = opportunities.filter(
                  (opportunity) => opportunity.companyId === company.id,
                );
                const companyProjects = projects.filter(
                  (project) => project.companyId === company.id,
                );
                return (
                  <TableRow key={company.id}>
                    <TableCell>
                      <Link href={`/app/companies/${company.id}`} className="font-medium hover:underline">
                        {company.name}
                      </Link>
                      {company.email ? (
                        <p className="text-xs text-muted-foreground">{company.email}</p>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {company.city
                        ? `${company.city}${company.province ? `, ${company.province}` : ""}`
                        : "—"}
                    </TableCell>
                    <TableCell className="tabular-nums">{companyContacts.length}</TableCell>
                    <TableCell className="tabular-nums">{companyOpportunities.length}</TableCell>
                    <TableCell className="tabular-nums">{companyProjects.length}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
