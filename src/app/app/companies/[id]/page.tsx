import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Flash } from "@/components/ops/flash";
import { PageHeader } from "@/components/ops/page-header";
import { StatusBadge } from "@/components/ops/status-badge";
import { SubmitButton } from "@/components/ops/submit-button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getOpsSession } from "@/lib/ops/auth";
import { OPPORTUNITY_LABELS } from "@/lib/ops/crm";
import { formatJobNumber, JOB_STATUS_LABELS } from "@/lib/ops/jobs";
import {
  getCompany,
  listContacts,
  listJobs,
  listOpportunities,
  listProjects,
  listSites,
} from "@/lib/ops/store";
import { formatServices } from "@/lib/ops/workflow";
import {
  createCompanyContact,
  createCompanySite,
  removeCompany,
  removeCompanyContact,
  removeCompanySite,
  saveCompany,
  saveCompanyContact,
  saveCompanySite,
} from "../actions";

export const dynamic = "force-dynamic";

export default async function CompanyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  if (!(await getOpsSession())) {
    redirect("/app/login");
  }

  const { id } = await params;
  const query = await searchParams;
  const company = await getCompany(id);
  if (!company) notFound();

  const [contacts, sites, opportunities, projects, jobs] = await Promise.all([
    listContacts(company.id),
    listSites(company.id),
    listOpportunities({ companyId: company.id }),
    listProjects({ companyId: company.id }),
    listJobs({ companyId: company.id }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[
          { href: "/app/companies", label: "Companies" },
          { label: company.name },
        ]}
        title={company.name}
        description={[
          company.city,
          company.province === "ON" ? "ON" : company.province,
          company.email,
          company.phone,
        ]
          .filter(Boolean)
          .join(" · ") || "Location not set"}
      />
      <Flash saved={query.saved} error={query.error} savedMessage="Company saved." />

      <Card>
        <CardHeader>
          <CardTitle>Company details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={saveCompany} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="id" value={company.id} />
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" className="h-11" defaultValue={company.name} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" className="h-11" defaultValue={company.email ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" className="h-11" defaultValue={company.phone ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" className="h-11" defaultValue={company.city ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="province">Province</Label>
              <Input id="province" name="province" className="h-11" defaultValue={company.province ?? ""} />
            </div>
            <div className="sm:col-span-2">
              <SubmitButton className="min-h-11">Save company</SubmitButton>
            </div>
          </form>
          <form action={removeCompany}>
            <input type="hidden" name="id" value={company.id} />
            <SubmitButton variant="destructive" className="min-h-11" pendingLabel="Deleting…">
              Delete company
            </SubmitButton>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Contacts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {contacts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No contacts are linked to this company.</p>
            ) : (
              <ul className="space-y-4">
                {contacts.map((contact) => (
                  <li key={contact.id} className="rounded-lg border bg-muted/20 p-3">
                    <form action={saveCompanyContact} className="grid gap-3 sm:grid-cols-2">
                      <input type="hidden" name="companyId" value={company.id} />
                      <input type="hidden" name="id" value={contact.id} />
                      <div className="space-y-2">
                        <Label htmlFor={`firstName-${contact.id}`}>First name</Label>
                        <Input
                          id={`firstName-${contact.id}`}
                          name="firstName"
                          className="h-11"
                          defaultValue={contact.firstName}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`lastName-${contact.id}`}>Last name</Label>
                        <Input
                          id={`lastName-${contact.id}`}
                          name="lastName"
                          className="h-11"
                          defaultValue={contact.lastName}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`email-${contact.id}`}>Email</Label>
                        <Input
                          id={`email-${contact.id}`}
                          name="email"
                          type="email"
                          className="h-11"
                          defaultValue={contact.email}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`phone-${contact.id}`}>Phone</Label>
                        <Input
                          id={`phone-${contact.id}`}
                          name="phone"
                          className="h-11"
                          defaultValue={contact.phone}
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor={`role-${contact.id}`}>Role</Label>
                        <Input
                          id={`role-${contact.id}`}
                          name="role"
                          className="h-11"
                          defaultValue={contact.role ?? ""}
                        />
                      </div>
                      <div>
                        <SubmitButton className="min-h-11">Save contact</SubmitButton>
                      </div>
                    </form>
                    <form action={removeCompanyContact} className="mt-2">
                      <input type="hidden" name="companyId" value={company.id} />
                      <input type="hidden" name="id" value={contact.id} />
                      <SubmitButton variant="ghost" className="min-h-11" pendingLabel="Deleting…">
                        Delete contact
                      </SubmitButton>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            <form action={createCompanyContact} className="space-y-3 rounded-lg border border-dashed p-4">
              <input type="hidden" name="companyId" value={company.id} />
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="newFirstName">First name</Label>
                  <Input id="newFirstName" name="firstName" className="h-11" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newLastName">Last name</Label>
                  <Input id="newLastName" name="lastName" className="h-11" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newEmail">Email</Label>
                  <Input id="newEmail" name="email" type="email" className="h-11" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPhone">Phone</Label>
                  <Input id="newPhone" name="phone" className="h-11" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="newRole">Role</Label>
                  <Input id="newRole" name="role" className="h-11" />
                </div>
              </div>
              <SubmitButton className="min-h-11">Add contact</SubmitButton>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sites</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {sites.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sites are linked to this company.</p>
            ) : (
              <ul className="space-y-4">
                {sites.map((site) => (
                  <li key={site.id} className="rounded-lg border bg-muted/20 p-3">
                    <form action={saveCompanySite} className="grid gap-3 sm:grid-cols-2">
                      <input type="hidden" name="companyId" value={company.id} />
                      <input type="hidden" name="id" value={site.id} />
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor={`siteName-${site.id}`}>Name</Label>
                        <Input
                          id={`siteName-${site.id}`}
                          name="name"
                          className="h-11"
                          defaultValue={site.name}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`siteCity-${site.id}`}>City</Label>
                        <Input
                          id={`siteCity-${site.id}`}
                          name="city"
                          className="h-11"
                          defaultValue={site.city}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`siteProvince-${site.id}`}>Province</Label>
                        <Input
                          id={`siteProvince-${site.id}`}
                          name="province"
                          className="h-11"
                          defaultValue={site.province}
                          required
                        />
                      </div>
                      <div>
                        <SubmitButton className="min-h-11">Save site</SubmitButton>
                      </div>
                    </form>
                    <form action={removeCompanySite} className="mt-2">
                      <input type="hidden" name="companyId" value={company.id} />
                      <input type="hidden" name="id" value={site.id} />
                      <SubmitButton variant="ghost" className="min-h-11" pendingLabel="Deleting…">
                        Delete site
                      </SubmitButton>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            <form action={createCompanySite} className="space-y-3 rounded-lg border border-dashed p-4">
              <input type="hidden" name="companyId" value={company.id} />
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="newSiteName">Site name</Label>
                  <Input id="newSiteName" name="name" className="h-11" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newSiteCity">City</Label>
                  <Input id="newSiteCity" name="city" className="h-11" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newSiteProvince">Province</Label>
                  <Input id="newSiteProvince" name="province" className="h-11" defaultValue="ON" required />
                </div>
              </div>
              <SubmitButton className="min-h-11">Add site</SubmitButton>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Projects</CardTitle>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No projects are linked to this company yet.</p>
          ) : (
            <ul className="space-y-3">
              {projects.map((project) => {
                const projectJobs = jobs.filter((job) => job.projectId === project.id);
                return (
                  <li key={project.id}>
                    <Link href={`/app/projects/${project.id}`} className="font-medium hover:underline">
                      {project.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {projectJobs.length} job{projectJobs.length === 1 ? "" : "s"}
                      {project.projectManager ? ` · ${project.projectManager}` : ""}
                    </p>
                    {projectJobs.map((job) => (
                      <p key={job.id} className="text-xs text-muted-foreground">
                        <Link href={`/app/jobs/${job.id}`} className="hover:underline">
                          {formatJobNumber(job.id)}
                        </Link>
                        {" · "}
                        {JOB_STATUS_LABELS[job.status as keyof typeof JOB_STATUS_LABELS] ??
                          job.status}
                      </p>
                    ))}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Opportunities</CardTitle>
        </CardHeader>
        <CardContent>
          {opportunities.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No opportunities are linked to this company yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {opportunities.map((opportunity) => (
                <li key={opportunity.id}>
                  <Link
                    href={`/app/opportunities/${opportunity.id}`}
                    className="font-medium hover:underline"
                  >
                    {opportunity.name}
                  </Link>
                  <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <StatusBadge
                      status={opportunity.stage}
                      label={
                        OPPORTUNITY_LABELS[opportunity.stage as keyof typeof OPPORTUNITY_LABELS] ??
                        opportunity.stage
                      }
                    />
                    <span>{formatServices(opportunity.services)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
