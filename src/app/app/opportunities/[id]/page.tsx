import { PencilIcon, Trash2Icon, TrophyIcon } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ConvertWonWorkForm } from "@/app/app/jobs/convert-form";
import { BidPackagePanel } from "@/components/ops/bid-package-panel";
import { ConfirmForm } from "@/components/ops/confirm-form";
import { ActionForm } from "@/components/ops/action-form";
import { EmptyState } from "@/components/ops/empty-state";
import { FormDialog } from "@/components/ops/form-dialog";
import { NativeSelect } from "@/components/ops/native-select";
import { PageHeader } from "@/components/ops/page-header";
import { StatusBadge } from "@/components/ops/status-badge";
import { SubmitButton } from "@/components/ops/submit-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getOpsSession } from "@/lib/ops/auth";
import { resolveCommercialAccess } from "@/lib/ops/commercial-authorization";
import { OPPORTUNITY_LABELS, OPPORTUNITY_STAGES } from "@/lib/ops/crm";
import { isDemoOpsStore } from "@/lib/ops/demo-store";
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
  listBidPackage,
  listEstimates,
  listJobs,
} from "@/lib/ops/store";
import {
  formatFullName,
  formatRequestNumber,
  formatServices,
  PROJECT_TYPE_LABELS,
} from "@/lib/ops/workflow";
import { removeOpportunity, saveOpportunity } from "../actions";
import { createOpportunityEstimate } from "./estimates/actions";

export const dynamic = "force-dynamic";

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getOpsSession();
  if (!session) {
    redirect("/app/login");
  }

  const { id } = await params;
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
  const readAccess = resolveCommercialAccess(session, "estimate.read");
  const editAccess = resolveCommercialAccess(session, "estimate.edit");
  const bidPackage =
    readAccess.ok && opportunity.organizationId === readAccess.organizationId
      ? await listBidPackage(readAccess.organizationId, opportunity.id)
      : [];
  const estimates =
    readAccess.ok && opportunity.organizationId === readAccess.organizationId
      ? await listEstimates(readAccess.organizationId, opportunity.id)
      : [];
  const storageMode = isDemoOpsStore()
    ? "demo"
    : process.env.BLOB_READ_WRITE_TOKEN
      ? "blob"
      : "unavailable";
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
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              status={opportunity.stage}
              label={
                OPPORTUNITY_LABELS[opportunity.stage as keyof typeof OPPORTUNITY_LABELS] ??
                opportunity.stage
              }
            />
            <FormDialog
              triggerLabel="Edit opportunity"
              triggerIcon={<PencilIcon aria-hidden="true" />}
              triggerVariant="outline"
              title="Edit opportunity"
              description="Move the stage forward as the estimate progresses."
            >
              <ActionForm action={saveOpportunity} className="grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="id" value={opportunity.id} />
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="editOpp-name">
                    Name <span aria-hidden="true">*</span>
                  </Label>
                  <Input id="editOpp-name" name="name" className="h-11" defaultValue={opportunity.name} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editOpp-stage">Stage</Label>
                  <NativeSelect id="editOpp-stage" name="stage" defaultValue={opportunity.stage} className="h-11">
                    {OPPORTUNITY_STAGES.map((stage) => (
                      <option key={stage} value={stage}>
                        {OPPORTUNITY_LABELS[stage]}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editOpp-owner">Owner</Label>
                  <Input id="editOpp-owner" name="owner" className="h-11" defaultValue={opportunity.owner ?? ""} />
                </div>
                <div className="sm:col-span-2">
                  <SubmitButton variant="default" className="min-h-11 w-full sm:w-auto">
                    Save opportunity
                  </SubmitButton>
                </div>
              </ActionForm>
            </FormDialog>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Opportunity details</CardTitle>
          <CardDescription>Customer, site, and the request this came from.</CardDescription>
        </CardHeader>
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

      {readAccess.ok ? (
        <BidPackagePanel
          opportunityId={opportunity.id}
          organizationId={readAccess.organizationId}
          items={bidPackage}
          storageMode={storageMode}
          canUpload={editAccess.ok}
        />
      ) : null}

      {readAccess.ok ? (
        <Card>
          <CardHeader>
            <CardTitle>Estimates</CardTitle>
            <CardDescription>Each save creates a new version. It does not create a job.</CardDescription>
            {editAccess.ok ? (
              <CardAction>
                <ActionForm action={createOpportunityEstimate}>
                  <input type="hidden" name="opportunityId" value={opportunity.id} />
                  <SubmitButton variant="default" className="min-h-11" pendingLabel="Creating…">
                    Create estimate
                  </SubmitButton>
                </ActionForm>
              </CardAction>
            ) : null}
          </CardHeader>
          <CardContent>
            {estimates.length === 0 ? (
              <p className="text-sm text-muted-foreground">No estimates yet.</p>
            ) : (
              <ul className="space-y-2">
                {estimates.map((estimate) => (
                  <li key={estimate.id}>
                    <Link
                      href={`/app/opportunities/${opportunity.id}/estimates/${estimate.id}`}
                      className="font-medium hover:underline"
                    >
                      {estimate.number} · {estimate.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}

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
            <EmptyState
              icon={<TrophyIcon aria-hidden="true" />}
              title="Not won yet"
              description="Mark this work won on the source request. Then come back here to create the project and first job."
              action={
                opportunity.sourceLeadId ? (
                  <Button
                    variant="outline"
                    className="min-h-11 md:min-h-8"
                    nativeButton={false}
                    render={<Link href={`/app/requests/${opportunity.sourceLeadId}`} />}
                  >
                    Open source request
                  </Button>
                ) : null
              }
              className="py-6"
            />
          )}
        </CardContent>
      </Card>

      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle>Remove opportunity</CardTitle>
          <CardDescription>Only possible before it has been converted into a project.</CardDescription>
          <CardAction>
            <ConfirmForm
              action={removeOpportunity}
              message={`Delete ${opportunity.name}? This cannot be undone.`}
            >
              <input type="hidden" name="id" value={opportunity.id} />
              <SubmitButton variant="destructive" className="min-h-11 md:min-h-8" pendingLabel="Deleting…">
                <Trash2Icon aria-hidden="true" />
                Delete opportunity
              </SubmitButton>
            </ConfirmForm>
          </CardAction>
        </CardHeader>
      </Card>
    </div>
  );
}
