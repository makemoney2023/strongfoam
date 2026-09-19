import {
  AlertTriangleIcon,
  ArrowRightIcon,
  BriefcaseBusinessIcon,
  Building2Icon,
  ClipboardListIcon,
  FolderKanbanIcon,
  HammerIcon,
  HardHatIcon,
  InboxIcon,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Flash } from "@/components/ops/flash";
import { PageHeader } from "@/components/ops/page-header";
import { StatusBadge } from "@/components/ops/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getOpsSession } from "@/lib/ops/auth";
import { buildHomeSummary, isOverdue } from "@/lib/ops/home";
import {
  listCompanies,
  listEstimateRequests,
  listJobs,
  listOpportunities,
  listProjects,
} from "@/lib/ops/store";
import {
  WORKFLOW_LABELS,
  formatCompany,
  formatFullName,
  formatRequestNumber,
} from "@/lib/ops/workflow";
import { cn } from "@/lib/utils";
import { NewCompanyDialog } from "./companies/new-company-dialog";
import { NewJobDialog } from "./jobs/new-job-dialog";

export const dynamic = "force-dynamic";

function StatCard({
  href,
  icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  value: number;
  hint: string;
  tone?: "default" | "alert";
}) {
  const isAlert = tone === "alert" && value > 0;
  return (
    <Link
      href={href}
      className={cn(
        "group rounded-xl bg-card p-4 ring-1 ring-foreground/10 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        isAlert && "ring-destructive/30 hover:bg-destructive/5",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground [&_svg]:size-4",
            isAlert && "bg-destructive/10 text-destructive",
          )}
        >
          {icon}
        </span>
        <ArrowRightIcon
          className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
          aria-hidden="true"
        />
      </div>
      <p className={cn("mt-3 text-2xl font-semibold tabular-nums", isAlert && "text-destructive")}>
        {value}
      </p>
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </Link>
  );
}

export default async function OpsHomePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");
  const query = await searchParams;

  const [requests, opportunities, projects, jobs, companies] = await Promise.all([
    listEstimateRequests(),
    listOpportunities(),
    listProjects(),
    listJobs(),
    listCompanies(),
  ]);

  const summary = buildHomeSummary({ requests, opportunities, projects, jobs });
  const projectOptions = projects
    .filter((project) => project.status !== "closed")
    .map((project) => ({
      id: project.id,
      name: project.name,
      projectManager: project.projectManager,
    }));

  const firstName = session.email.split("@")[0].split(/[._-]/)[0];
  const greeting = firstName
    ? `${firstName[0].toUpperCase()}${firstName.slice(1)}`
    : "there";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Hi ${greeting}`}
        description="What needs attention today, and the quickest way to get started."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <NewCompanyDialog triggerVariant="outline" />
            <NewJobDialog projects={projectOptions} returnTo="/app" />
          </div>
        }
      />
      <Flash saved={query.saved} error={query.error} />

      <section aria-label="Needs attention" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          href="/app/requests?workflow=new"
          icon={<InboxIcon aria-hidden="true" />}
          label="New requests"
          value={summary.newRequests}
          hint="Survey submissions nobody has picked up yet"
        />
        <StatCard
          href="/app/requests"
          icon={<AlertTriangleIcon aria-hidden="true" />}
          label="Overdue follow-ups"
          value={summary.overdueFollowUps}
          hint="Requests whose next action date has passed"
          tone="alert"
        />
        <StatCard
          href="/app/jobs?status=blocked"
          icon={<HammerIcon aria-hidden="true" />}
          label="Blocked jobs"
          value={summary.blockedJobs}
          hint="Crews waiting on the office"
          tone="alert"
        />
        <StatCard
          href="/app/opportunities"
          icon={<BriefcaseBusinessIcon aria-hidden="true" />}
          label="Open opportunities"
          value={summary.openOpportunities}
          hint="Estimates in progress, not yet won or lost"
        />
        <StatCard
          href="/app/projects?status=active"
          icon={<FolderKanbanIcon aria-hidden="true" />}
          label="Active projects"
          value={summary.activeProjects}
          hint={`${companies.length} compan${companies.length === 1 ? "y" : "ies"} on file`}
        />
        <StatCard
          href="/app/field"
          icon={<HardHatIcon aria-hidden="true" />}
          label="Jobs in the field"
          value={summary.fieldJobs}
          hint="Scheduled, in progress, or ready for inspection"
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Next up</CardTitle>
            <CardDescription>Open requests, soonest follow-up first.</CardDescription>
          </CardHeader>
          <CardContent>
            {summary.nextUp.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing waiting. New survey submissions will show up here.
              </p>
            ) : (
              <ul className="divide-y">
                {summary.nextUp.map((request) => {
                  const overdue = isOverdue(request, summary.now);
                  return (
                    <li
                      key={request.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/app/requests/${request.id}`}
                          className="font-medium hover:underline"
                        >
                          {formatRequestNumber(request.id)} ·{" "}
                          {formatCompany(
                            request.company,
                            formatFullName(request.firstName, request.lastName),
                          )}
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          {request.nextAction ?? "No next action set"}
                          {request.nextActionDueAt ? (
                            <span className={cn(overdue && "font-medium text-destructive")}>
                              {` · ${overdue ? "overdue " : "due "}${request.nextActionDueAt.toLocaleDateString("en-CA")}`}
                            </span>
                          ) : null}
                        </p>
                      </div>
                      <StatusBadge
                        status={request.workflowStatus}
                        label={
                          WORKFLOW_LABELS[request.workflowStatus as keyof typeof WORKFLOW_LABELS] ??
                          request.workflowStatus
                        }
                      />
                    </li>
                  );
                })}
              </ul>
            )}
            <Button
              variant="ghost"
              className="mt-4 min-h-11 md:min-h-8"
              nativeButton={false}
              render={<Link href="/app/requests" />}
            >
              All requests
              <ArrowRightIcon aria-hidden="true" />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How work flows</CardTitle>
            <CardDescription>Every record links to the one before it.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4">
              {[
                {
                  icon: <ClipboardListIcon aria-hidden="true" />,
                  title: "Request",
                  body: "A survey lands here. Assign an owner and set the next action.",
                  href: "/app/requests",
                },
                {
                  icon: <Building2Icon aria-hidden="true" />,
                  title: "Company and opportunity",
                  body: "Convert the request to create the company, contact, site, and opportunity.",
                  href: "/app/opportunities",
                },
                {
                  icon: <FolderKanbanIcon aria-hidden="true" />,
                  title: "Project",
                  body: "Mark the request won, then create the project and its first job from the opportunity.",
                  href: "/app/projects",
                },
                {
                  icon: <HammerIcon aria-hidden="true" />,
                  title: "Jobs",
                  body: "Add a job per crew or phase. Plan work areas, tasks, and upload the plan set.",
                  href: "/app/jobs",
                },
                {
                  icon: <HardHatIcon aria-hidden="true" />,
                  title: "Field",
                  body: "Crews complete tasks, log quantities and blockers, and attach photos on site.",
                  href: "/app/field",
                },
              ].map((step, index) => (
                <li key={step.title} className="flex gap-3">
                  <span className="relative flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <Link href={step.href} className="flex items-center gap-2 font-medium hover:underline [&_svg]:size-4 [&_svg]:text-muted-foreground">
                      {step.icon}
                      {step.title}
                    </Link>
                    <p className="text-sm text-muted-foreground">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
