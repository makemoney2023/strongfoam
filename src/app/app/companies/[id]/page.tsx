import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/ops/page-header";
import { StatusBadge } from "@/components/ops/status-badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

  const [contacts, sites, opportunities, projects, jobs] = await Promise.all([
    listContacts(company.id),
    listSites(company.id),
    listOpportunities(),
    listProjects(company.id),
    listJobs({ companyId: company.id }),
  ]);
  const companyOpportunities = opportunities.filter(
    (opportunity) => opportunity.companyId === company.id,
  );

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

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Contacts</CardTitle>
          </CardHeader>
          <CardContent>
            {contacts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No contacts are linked to this company.</p>
            ) : (
              <ul className="space-y-3">
                {contacts.map((contact) => (
                  <li key={contact.id}>
                    <p className="font-medium">
                      {formatFullName(contact.firstName, contact.lastName)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {contact.email}
                      {contact.phone ? ` · ${contact.phone}` : ""}
                    </p>
                    {contact.role ? (
                      <p className="text-xs text-muted-foreground">{contact.role}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sites</CardTitle>
          </CardHeader>
          <CardContent>
            {sites.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sites are linked to this company.</p>
            ) : (
              <ul className="space-y-3">
                {sites.map((site) => (
                  <li key={site.id}>
                    <p className="font-medium">{site.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {site.city}
                      {site.province === "ON" ? ", ON" : ` · ${site.province}`}
                    </p>
                  </li>
                ))}
              </ul>
            )}
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
          {companyOpportunities.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No opportunities are linked to this company yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {companyOpportunities.map((opportunity) => (
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
