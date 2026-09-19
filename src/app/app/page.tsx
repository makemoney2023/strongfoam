import {
  AlertTriangleIcon,
  ArrowRightIcon,
  BriefcaseBusinessIcon,
  Building2Icon,
  CalendarClockIcon,
  CalendarXIcon,
  ChartNoAxesCombinedIcon,
  ClipboardListIcon,
  FolderKanbanIcon,
  HammerIcon,
  HardHatIcon,
  InboxIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
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
  buildPortfolioScheduleSummary,
  serializePortfolioSchedule,
  type PortfolioScheduleEvent,
} from "@/lib/ops/portfolio-schedule";
import {
  PORTFOLIO_SCHEDULE_WIDGETS,
  portfolioScheduleHref,
} from "@/lib/ops/portfolio-schedule-query";
import {
  listCompanies,
  listEstimateRequests,
  listJobs,
  listOpportunities,
  listPortfolioSchedule,
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

const SCHEDULE_EVENT_KIND_LABELS: Record<
  PortfolioScheduleEvent["kind"],
  string
> = {
  start: "Starts",
  finish: "Finishes",
  due: "Due",
};

function formatScheduleEventDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year!, month! - 1, day!)));
}

function scheduleHint(hint: string, partial: boolean): string {
  return partial
    ? `${hint} · Partial result — portfolio limit reached`
    : hint;
}

export default async function OpsHomePage() {
  const session = await getOpsSession();
  if (!session) redirect("/app/login");

  const [
    requests,
    opportunities,
    projects,
    jobs,
    companies,
    portfolioScheduleResult,
  ] = await Promise.all([
    listEstimateRequests(),
    listOpportunities(),
    listProjects(),
    listJobs(),
    listCompanies(),
    listPortfolioSchedule({ projectStatus: "active" }),
  ]);

  const summary = buildHomeSummary({ requests, opportunities, projects, jobs });
  const scheduleNow = new Date();
  const portfolioSummary = buildPortfolioScheduleSummary(
    serializePortfolioSchedule(portfolioScheduleResult),
    scheduleNow,
  );
  const partialScheduleCounts = new Set(portfolioSummary.partialCounts);
  const partialHint = "Partial result — portfolio limit reached";
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

      <section aria-labelledby="schedule-attention-heading" className="space-y-3">
        <div>
          <h2 id="schedule-attention-heading" className="text-lg font-semibold">
            Schedule attention
          </h2>
          <p className="text-sm text-muted-foreground">
            Exceptions across active projects.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            href={PORTFOLIO_SCHEDULE_WIDGETS.overdueTasks.href}
            icon={<CalendarClockIcon aria-hidden="true" />}
            label={PORTFOLIO_SCHEDULE_WIDGETS.overdueTasks.label}
            value={portfolioSummary.overdueTasks}
            hint={scheduleHint(
              "Open tasks past planned completion or due date",
              partialScheduleCounts.has("overdueTasks"),
            )}
            tone="alert"
          />
          <StatCard
            href={PORTFOLIO_SCHEDULE_WIDGETS.unscheduledActiveWork.href}
            icon={<CalendarXIcon aria-hidden="true" />}
            label={PORTFOLIO_SCHEDULE_WIDGETS.unscheduledActiveWork.label}
            value={portfolioSummary.unscheduledActiveWork}
            hint={scheduleHint(
              "Active jobs and tasks without usable schedule dates",
              partialScheduleCounts.has("unscheduledActiveWork"),
            )}
            tone="alert"
          />
          <StatCard
            href={PORTFOLIO_SCHEDULE_WIDGETS.projectsBehindBaseline.href}
            icon={<ChartNoAxesCombinedIcon aria-hidden="true" />}
            label={PORTFOLIO_SCHEDULE_WIDGETS.projectsBehindBaseline.label}
            value={portfolioSummary.projectsBehindBaseline}
            hint={scheduleHint(
              "Projected finishes later than the latest baseline",
              partialScheduleCounts.has("projectsBehindBaseline"),
            )}
            tone="alert"
          />
          <StatCard
            href={PORTFOLIO_SCHEDULE_WIDGETS.peopleWithPotentialOverlap.href}
            icon={<UsersIcon aria-hidden="true" />}
            label={PORTFOLIO_SCHEDULE_WIDGETS.peopleWithPotentialOverlap.label}
            value={portfolioSummary.peopleWithPotentialOverlap}
            hint={scheduleHint(
              "People assigned to overlapping scheduled work",
              partialScheduleCounts.has("peopleWithPotentialOverlap"),
            )}
            tone="alert"
          />
        </div>
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
            <CardTitle>Upcoming schedule events</CardTitle>
            <CardDescription>
              Starts, finishes, and due dates in the next 14 days.
            </CardDescription>
            {partialScheduleCounts.has("upcomingEvents") ? (
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                {partialHint}
              </p>
            ) : null}
          </CardHeader>
          <CardContent>
            {portfolioSummary.upcomingEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No scheduled starts, finishes, or due dates in the next 14 days.
              </p>
            ) : (
              <ul className="divide-y">
                {portfolioSummary.upcomingEvents.map((event) => (
                  <li
                    key={event.id}
                    className="grid gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[8rem_5rem_minmax(0,1fr)_minmax(0,1fr)] sm:items-center sm:gap-3"
                  >
                    <time
                      dateTime={event.date}
                      className="text-sm font-medium tabular-nums"
                    >
                      {formatScheduleEventDate(event.date)}
                    </time>
                    <span className="text-sm text-muted-foreground">
                      {SCHEDULE_EVENT_KIND_LABELS[event.kind]}
                    </span>
                    <span className="truncate text-sm text-muted-foreground">
                      {event.projectName}
                    </span>
                    <Link
                      href={event.href}
                      className="inline-flex min-h-11 min-w-11 items-center font-medium hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      {event.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Button
              variant="ghost"
              className="mt-4 min-h-11 md:min-h-8"
              nativeButton={false}
              render={
                <Link
                  href={portfolioScheduleHref({ projectStatus: "active" })}
                />
              }
            >
              Open Portfolio Schedule
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
