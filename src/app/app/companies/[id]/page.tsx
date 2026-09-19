import {
  MapPinIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ConfirmForm } from "@/components/ops/confirm-form";
import { DetailList } from "@/components/ops/detail-list";
import { EmptyState } from "@/components/ops/empty-state";
import { Flash } from "@/components/ops/flash";
import { FormDialog } from "@/components/ops/form-dialog";
import { PageHeader } from "@/components/ops/page-header";
import { StatusBadge } from "@/components/ops/status-badge";
import { SubmitButton } from "@/components/ops/submit-button";
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

function CompanyFields({
  idPrefix,
  defaults,
}: {
  idPrefix: string;
  defaults: {
    name?: string;
    email?: string | null;
    phone?: string | null;
    city?: string | null;
    province?: string | null;
  };
}) {
  const id = (field: string) => `${idPrefix}-${field}`;
  return (
    <>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={id("name")}>
          Name <span aria-hidden="true">*</span>
        </Label>
        <Input id={id("name")} name="name" className="h-11" defaultValue={defaults.name ?? ""} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor={id("email")}>Email</Label>
        <Input id={id("email")} name="email" type="email" className="h-11" defaultValue={defaults.email ?? ""} />
      </div>
      <div className="space-y-2">
        <Label htmlFor={id("phone")}>Phone</Label>
        <Input id={id("phone")} name="phone" type="tel" className="h-11" defaultValue={defaults.phone ?? ""} />
      </div>
      <div className="space-y-2">
        <Label htmlFor={id("city")}>City</Label>
        <Input id={id("city")} name="city" className="h-11" defaultValue={defaults.city ?? ""} />
      </div>
      <div className="space-y-2">
        <Label htmlFor={id("province")}>Province</Label>
        <Input id={id("province")} name="province" className="h-11" defaultValue={defaults.province ?? "ON"} />
      </div>
    </>
  );
}

function ContactFields({
  idPrefix,
  defaults = {},
}: {
  idPrefix: string;
  defaults?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    role?: string | null;
  };
}) {
  const id = (field: string) => `${idPrefix}-${field}`;
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={id("firstName")}>
          First name <span aria-hidden="true">*</span>
        </Label>
        <Input id={id("firstName")} name="firstName" className="h-11" defaultValue={defaults.firstName ?? ""} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor={id("lastName")}>
          Last name <span aria-hidden="true">*</span>
        </Label>
        <Input id={id("lastName")} name="lastName" className="h-11" defaultValue={defaults.lastName ?? ""} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor={id("email")}>
          Email <span aria-hidden="true">*</span>
        </Label>
        <Input id={id("email")} name="email" type="email" className="h-11" defaultValue={defaults.email ?? ""} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor={id("phone")}>Phone</Label>
        <Input id={id("phone")} name="phone" type="tel" className="h-11" defaultValue={defaults.phone ?? ""} />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={id("role")}>Role</Label>
        <Input
          id={id("role")}
          name="role"
          className="h-11"
          defaultValue={defaults.role ?? ""}
          placeholder="Project manager, estimator, site super…"
        />
      </div>
    </>
  );
}

function SiteFields({
  idPrefix,
  defaults = {},
}: {
  idPrefix: string;
  defaults?: { name?: string; city?: string; province?: string };
}) {
  const id = (field: string) => `${idPrefix}-${field}`;
  return (
    <>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={id("name")}>
          Site name <span aria-hidden="true">*</span>
        </Label>
        <Input id={id("name")} name="name" className="h-11" defaultValue={defaults.name ?? ""} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor={id("city")}>
          City <span aria-hidden="true">*</span>
        </Label>
        <Input id={id("city")} name="city" className="h-11" defaultValue={defaults.city ?? ""} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor={id("province")}>
          Province <span aria-hidden="true">*</span>
        </Label>
        <Input id={id("province")} name="province" className="h-11" defaultValue={defaults.province ?? "ON"} required />
      </div>
    </>
  );
}

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

  const location = [company.city, company.province].filter(Boolean).join(", ");

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[
          { href: "/app/companies", label: "Companies" },
          { label: company.name },
        ]}
        title={company.name}
        description={location || "Location not set"}
        actions={
          <FormDialog
            triggerLabel="Edit company"
            triggerIcon={<PencilIcon aria-hidden="true" />}
            triggerVariant="outline"
            title="Edit company"
          >
            <form action={saveCompany} className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="id" value={company.id} />
              <CompanyFields idPrefix="editCompany" defaults={company} />
              <div className="sm:col-span-2">
                <SubmitButton variant="default" className="min-h-11 w-full sm:w-auto">
                  Save company
                </SubmitButton>
              </div>
            </form>
          </FormDialog>
        }
      />
      <Flash saved={query.saved} error={query.error} savedMessage="Company saved." />

      <Card>
        <CardHeader>
          <CardTitle>Company details</CardTitle>
          <CardDescription>How to reach the office.</CardDescription>
        </CardHeader>
        <CardContent>
          <DetailList
            columns={3}
            items={[
              {
                label: "Email",
                value: company.email ? (
                  <a href={`mailto:${company.email}`} className="font-medium hover:underline">
                    {company.email}
                  </a>
                ) : null,
              },
              {
                label: "Phone",
                value: company.phone ? (
                  <a href={`tel:${company.phone}`} className="font-medium hover:underline">
                    {company.phone}
                  </a>
                ) : null,
              },
              { label: "Location", value: location || null },
            ]}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Contacts</CardTitle>
            <CardDescription>People you call, email, or meet on site.</CardDescription>
            <CardAction>
              <FormDialog
                triggerLabel="Add contact"
                triggerIcon={<PlusIcon aria-hidden="true" />}
                triggerVariant="outline"
                title="Add a contact"
                description={`New contact for ${company.name}.`}
              >
                <form action={createCompanyContact} className="grid gap-3 sm:grid-cols-2">
                  <input type="hidden" name="companyId" value={company.id} />
                  <ContactFields idPrefix="newContact" />
                  <div className="sm:col-span-2">
                    <SubmitButton variant="default" className="min-h-11 w-full sm:w-auto">
                      Add contact
                    </SubmitButton>
                  </div>
                </form>
              </FormDialog>
            </CardAction>
          </CardHeader>
          <CardContent>
            {contacts.length === 0 ? (
              <EmptyState
                icon={<UsersIcon aria-hidden="true" />}
                title="No contacts yet"
                description="Add the people you work with so their phone and email are one tap away in the field."
                className="py-6"
              />
            ) : (
              <ul className="divide-y">
                {contacts.map((contact) => (
                  <li
                    key={contact.id}
                    className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">
                        {contact.firstName} {contact.lastName}
                        {contact.role ? (
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            {contact.role}
                          </span>
                        ) : null}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        <a href={`mailto:${contact.email}`} className="hover:underline">
                          {contact.email}
                        </a>
                        {contact.phone ? (
                          <>
                            {" · "}
                            <a href={`tel:${contact.phone}`} className="hover:underline">
                              {contact.phone}
                            </a>
                          </>
                        ) : null}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <FormDialog
                        triggerLabel="Edit"
                        triggerIcon={<PencilIcon aria-hidden="true" />}
                        triggerVariant="ghost"
                        triggerAriaLabel={`Edit ${contact.firstName} ${contact.lastName}`}
                        title="Edit contact"
                      >
                        <form action={saveCompanyContact} className="grid gap-3 sm:grid-cols-2">
                          <input type="hidden" name="companyId" value={company.id} />
                          <input type="hidden" name="id" value={contact.id} />
                          <ContactFields idPrefix={`contact-${contact.id}`} defaults={contact} />
                          <div className="sm:col-span-2">
                            <SubmitButton variant="default" className="min-h-11 w-full sm:w-auto">
                              Save contact
                            </SubmitButton>
                          </div>
                        </form>
                      </FormDialog>
                      <ConfirmForm
                        action={removeCompanyContact}
                        message={`Delete ${contact.firstName} ${contact.lastName}? This cannot be undone.`}
                      >
                        <input type="hidden" name="companyId" value={company.id} />
                        <input type="hidden" name="id" value={contact.id} />
                        <SubmitButton
                          variant="ghost"
                          className="min-h-11 text-muted-foreground hover:text-destructive md:min-h-8"
                          pendingLabel="Deleting…"
                        >
                          <Trash2Icon aria-hidden="true" />
                          <span className="sr-only sm:not-sr-only">Delete</span>
                        </SubmitButton>
                      </ConfirmForm>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sites</CardTitle>
            <CardDescription>Job sites and buildings for this company.</CardDescription>
            <CardAction>
              <FormDialog
                triggerLabel="Add site"
                triggerIcon={<PlusIcon aria-hidden="true" />}
                triggerVariant="outline"
                title="Add a site"
                description={`New site for ${company.name}.`}
              >
                <form action={createCompanySite} className="grid gap-3 sm:grid-cols-2">
                  <input type="hidden" name="companyId" value={company.id} />
                  <SiteFields idPrefix="newSite" />
                  <div className="sm:col-span-2">
                    <SubmitButton variant="default" className="min-h-11 w-full sm:w-auto">
                      Add site
                    </SubmitButton>
                  </div>
                </form>
              </FormDialog>
            </CardAction>
          </CardHeader>
          <CardContent>
            {sites.length === 0 ? (
              <EmptyState
                icon={<MapPinIcon aria-hidden="true" />}
                title="No sites yet"
                description="Sites are attached to opportunities and jobs so crews know where to go."
                className="py-6"
              />
            ) : (
              <ul className="divide-y">
                {sites.map((site) => (
                  <li
                    key={site.id}
                    className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{site.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {site.city}, {site.province}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <FormDialog
                        triggerLabel="Edit"
                        triggerIcon={<PencilIcon aria-hidden="true" />}
                        triggerVariant="ghost"
                        triggerAriaLabel={`Edit ${site.name}`}
                        title="Edit site"
                      >
                        <form action={saveCompanySite} className="grid gap-3 sm:grid-cols-2">
                          <input type="hidden" name="companyId" value={company.id} />
                          <input type="hidden" name="id" value={site.id} />
                          <SiteFields idPrefix={`site-${site.id}`} defaults={site} />
                          <div className="sm:col-span-2">
                            <SubmitButton variant="default" className="min-h-11 w-full sm:w-auto">
                              Save site
                            </SubmitButton>
                          </div>
                        </form>
                      </FormDialog>
                      <ConfirmForm
                        action={removeCompanySite}
                        message={`Delete ${site.name}? Sites attached to opportunities or jobs cannot be removed.`}
                      >
                        <input type="hidden" name="companyId" value={company.id} />
                        <input type="hidden" name="id" value={site.id} />
                        <SubmitButton
                          variant="ghost"
                          className="min-h-11 text-muted-foreground hover:text-destructive md:min-h-8"
                          pendingLabel="Deleting…"
                        >
                          <Trash2Icon aria-hidden="true" />
                          <span className="sr-only sm:not-sr-only">Delete</span>
                        </SubmitButton>
                      </ConfirmForm>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Projects and jobs</CardTitle>
            <CardDescription>Won work in progress for this company.</CardDescription>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No projects yet. Projects are created when an opportunity is marked won.
              </p>
            ) : (
              <ul className="space-y-4">
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
                      {projectJobs.length > 0 ? (
                        <ul className="mt-2 space-y-1">
                          {projectJobs.map((job) => (
                            <li key={job.id} className="flex items-center gap-2 text-sm">
                              <Link href={`/app/jobs/${job.id}`} className="font-medium hover:underline">
                                {formatJobNumber(job.id)}
                              </Link>
                              <span className="truncate text-muted-foreground">{job.name}</span>
                              <StatusBadge
                                status={job.status}
                                label={
                                  JOB_STATUS_LABELS[job.status as keyof typeof JOB_STATUS_LABELS] ??
                                  job.status
                                }
                              />
                            </li>
                          ))}
                        </ul>
                      ) : null}
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
            <CardDescription>Pipeline created from this company&apos;s estimate requests.</CardDescription>
          </CardHeader>
          <CardContent>
            {opportunities.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No opportunities yet. Convert an estimate request to start one.
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
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
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

      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle>Remove company</CardTitle>
          <CardDescription>
            Only possible when no contacts, sites, opportunities, or projects are attached.
          </CardDescription>
          <CardAction>
            <ConfirmForm
              action={removeCompany}
              message={`Delete ${company.name}? This cannot be undone.`}
            >
              <input type="hidden" name="id" value={company.id} />
              <SubmitButton variant="destructive" className="min-h-11 md:min-h-8" pendingLabel="Deleting…">
                <Trash2Icon aria-hidden="true" />
                Delete company
              </SubmitButton>
            </ConfirmForm>
          </CardAction>
        </CardHeader>
      </Card>
    </div>
  );
}
