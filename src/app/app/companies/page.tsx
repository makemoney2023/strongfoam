import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ops/page-header";
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
import {
  listCompanies,
  listContacts,
  listOpportunities,
  listProjects,
} from "@/lib/ops/store";

export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  if (!(await getOpsSession())) {
    redirect("/app/login");
  }

  const [companies, contacts, opportunities, projects] = await Promise.all([
    listCompanies(),
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
                  No companies yet. Convert an estimate request to create the first record.
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
    </div>
  );
}
