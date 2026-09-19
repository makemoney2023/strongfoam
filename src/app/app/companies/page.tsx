import Link from "next/link";
import { redirect } from "next/navigation";
import { Flash } from "@/components/ops/flash";
import { ListFilters, FilterSubmit } from "@/components/ops/list-filters";
import { PageHeader } from "@/components/ops/page-header";
import { SubmitButton } from "@/components/ops/submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { createCompany } from "./actions";

export const dynamic = "force-dynamic";

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; saved?: string; error?: string }>;
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Companies"
        description="Companies created or linked from estimate requests. Contacts, sites, and opportunities stay attached."
        actions={
          <p className="text-sm text-muted-foreground">
            {companies.length} compan{companies.length === 1 ? "y" : "ies"}
          </p>
        }
      />
      <Flash saved={params.saved} error={params.error} savedMessage="Company saved." />

      <ListFilters>
        <div className="space-y-2">
          <Label htmlFor="q">Search</Label>
          <Input
            id="q"
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Name, city, email"
            className="h-11 min-w-56"
          />
        </div>
        <FilterSubmit />
      </ListFilters>

      <Card>
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
            {companies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No companies match these filters.
                </TableCell>
              </TableRow>
            ) : (
              companies.map((company) => {
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
                        ? `${company.city}${company.province === "ON" ? ", ON" : ""}`
                        : "—"}
                    </TableCell>
                    <TableCell>{companyContacts.length}</TableCell>
                    <TableCell>{companyOpportunities.length}</TableCell>
                    <TableCell>{companyProjects.length}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add a company</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createCompany} className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="companyName">Name</Label>
              <Input id="companyName" name="name" className="h-11" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyEmail">Email</Label>
              <Input id="companyEmail" name="email" type="email" className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyPhone">Phone</Label>
              <Input id="companyPhone" name="phone" className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyCity">City</Label>
              <Input id="companyCity" name="city" className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyProvince">Province</Label>
              <Input id="companyProvince" name="province" className="h-11" defaultValue="ON" />
            </div>
            <div className="sm:col-span-2">
              <SubmitButton className="min-h-11">Create company</SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
