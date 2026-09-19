import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ConvertWonWorkForm } from "@/app/app/jobs/convert-form";
import { Flash } from "@/components/ops/flash";
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
import {
  canConvertWonWork,
  draftJobFromOpportunity,
  formatJobNumber,
  JOB_STATUS_LABELS,
} from "@/lib/ops/jobs";
import {
  getCompany,
  getContact,
  getEstimateRequest,
  getOpportunity,
  getProject,
  getSite,
  listJobs,
} from "@/lib/ops/store";
import {
  formatFullName,
  formatRequestNumber,
  formatServices,
  PROJECT_TYPE_LABELS,
} from "@/lib/ops/workflow";

export const dynamic = "force-dynamic";

export default async function OpportunityDetailPage({
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
  const opportunity = await getOpportunity(id);
  if (!opportunity) notFound();

  const [company, contact, site, request, project] = await Promise.all([
    opportunity.companyId ? getCompany(opportunity.companyId) : null,
    opportunity.contactId ? getContact(opportunity.contactId) : null,
    opportunity.siteId ? getSite(opportunity.siteId) : null,
    opportunity.sourceLeadId ? getEstimateRequest(opportunity.sourceLeadId) : null,
    opportunity.projectId ? getProject(opportunity.projectId) : null,
  ]);
  const projectJobs = project ? await listJobs({ projectId: project.id }) : [];
  const canConvert =
    !opportunity.projectId &&
    canConvertWonWork({
      workflowStatus: request?.workflowStatus,
      opportunityStage: opportunity.stage,
    });
  const draft = draftJobFromOpportunity(opportunity);

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[
          { href: "/app/opportunities", label: "Opportunities" },
          { label: opportunity.name },
        ]}
        title={opportunity.name}
        description={`${opportunity.owner ?? "Unassigned"}${opportunity.source ? ` · ${opportunity.source}` : ""}`}
        actions={
          <StatusBadge
            status={opportunity.stage}
            label={
              OPPORTUNITY_LABELS[opportunity.stage as keyof typeof OPPORTUNITY_LABELS] ??
              opportunity.stage
            }
          />
        }
      />
      <Flash saved={query.saved} error={query.error} savedMessage="Opportunity saved." />

      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Company</p>
            <p className="mt-1">
              {company ? (
                <Link href={`/app/companies/${company.id}`} className="font-medium hover:underline">
                  {company.name}
                </Link>
              ) : (
                "—"
              )}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Contact</p>
            <p className="mt-1">
              {contact
                ? `${formatFullName(contact.firstName, contact.lastName)} · ${contact.email}`
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Site</p>
            <p className="mt-1">
              {site ? `${site.name} · ${site.city}${site.province === "ON" ? ", ON" : ""}` : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Scope</p>
            <p className="mt-1">
              {PROJECT_TYPE_LABELS[opportunity.projectType as keyof typeof PROJECT_TYPE_LABELS] ??
                opportunity.projectType ??
                "—"}
            </p>
            <p className="text-sm text-muted-foreground">{formatServices(opportunity.services)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Source request</p>
            <p className="mt-1">
              {opportunity.sourceLeadId ? (
                <Link
                  href={`/app/requests/${opportunity.sourceLeadId}`}
                  className="font-medium hover:underline"
                >
                  {formatRequestNumber(opportunity.sourceLeadId)}
                </Link>
              ) : (
                "—"
              )}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Project</p>
            <p className="mt-1">
              {project ? (
                <Link href={`/app/projects/${project.id}`} className="font-medium hover:underline">
                  {project.name}
                </Link>
              ) : (
                "Not converted"
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Project and jobs</CardTitle>
        </CardHeader>
        <CardContent>
          {project ? (
            <ul className="space-y-3">
              {projectJobs.map((job) => (
                <li key={job.id}>
                  <Link href={`/app/jobs/${job.id}`} className="font-medium hover:underline">
                    {formatJobNumber(job.id)} · {job.name}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {JOB_STATUS_LABELS[job.status as keyof typeof JOB_STATUS_LABELS] ?? job.status}
                  </p>
                </li>
              ))}
            </ul>
          ) : canConvert ? (
            <ConvertWonWorkForm
              opportunityId={opportunity.id}
              returnTo={`/app/opportunities/${opportunity.id}`}
              defaults={{
                projectName: draft.projectName,
                jobName: draft.jobName,
                scope: draft.scope,
                projectManager: opportunity.owner,
              }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Mark this work won on the source request before creating a project and job.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
