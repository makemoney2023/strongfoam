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
import {
  countOperationsExceptions,
  listOperationsExceptions,
} from "@/lib/ops/ai-exceptions";
import { workingDayLabel } from "@/lib/ops/ai-evidence";
import { listUnapprovedChangeOrders } from "@/lib/ops/change-order-store";
import { resolveCommercialAccess } from "@/lib/ops/commercial-authorization";
import { buildDispatchDay, DISPATCH_TIME_ZONE } from "@/lib/ops/dispatch";
import { resolveDispatchAccess } from "@/lib/ops/dispatch-authorization";
import { listDispatches } from "@/lib/ops/dispatch-store";
import { resolvePurchaseAccess } from "@/lib/ops/purchase-order-authorization";
import { listPurchaseAttention } from "@/lib/ops/purchase-order-store";
import { loadWorkforceBoard } from "@/lib/ops/production-store";
import { resolveWorkforceAccess } from "@/lib/ops/workforce-authorization";
import { workforcePerformanceEnabled } from "@/lib/ops/workforce-performance";
import { getOpsSession, organizationIdForOpsSession } from "@/lib/ops/auth";
import { resolveImportAccess } from "@/lib/ops/import-authorization";
import { listImportHomeExceptions } from "@/lib/ops/import-attention";
import { listImportAttention } from "@/lib/ops/import-store";
import { buildHomeSummary, isOverdue } from "@/lib/ops/home";
import { getOpsNow } from "@/lib/ops/ops-now";
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
  listHomeExceptionSource,
  listJobs,
  listOpportunities,
  listPortfolioSchedule,
  listProjects,
  listUsers,
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
    exceptionSource,
  ] = await Promise.all([
    listEstimateRequests(),
    listOpportunities(),
    listProjects(),
    listJobs(),
    listCompanies(),
    listPortfolioSchedule({ projectStatus: "active" }),
    listHomeExceptionSource(),
  ]);

  const opsNow = getOpsNow();
  const dispatchAccess = resolveDispatchAccess(session, "dispatch.read");
  const dispatchDate = workingDayLabel(opsNow, DISPATCH_TIME_ZONE);
  const [dayDispatches, dispatchPeople] = dispatchAccess.ok
    ? await Promise.all([
        listDispatches(dispatchAccess.organizationId, dispatchDate),
        listUsers(),
      ])
    : [[], []];
  const dispatchDay = dispatchAccess.ok
    ? buildDispatchDay({
        organizationId: dispatchAccess.organizationId,
        jobs,
        people: dispatchPeople,
        dispatches: dayDispatches,
      })
    : null;
  const undispatchedPreview = dispatchDay?.undispatched.slice(0, 8) ?? [];
  const purchaseAccess = resolvePurchaseAccess(session, "purchase_order.read");
  const purchaseAttention = purchaseAccess.ok
    ? await listPurchaseAttention(purchaseAccess.organizationId)
    : null;
  const purchasePreview = purchaseAttention
    ? [
        ...purchaseAttention.drafts.map((draft) => ({
          key: `draft-${draft.id}`,
          href: `/app/jobs/${draft.jobId}`,
          label: `${draft.supplier} draft on ${draft.jobName}`,
        })),
        ...purchaseAttention.unordered.map((request) => ({
          key: `request-${request.noteId}`,
          href: `/app/jobs/${request.jobId}`,
          label: `${request.jobName} still needs an order for ${request.description}`,
        })),
      ]
    : [];
  const purchaseShown = purchasePreview.slice(0, 8);
  const workforceAccess = resolveWorkforceAccess(session, "workforce.read");
  const workforceExceptions =
    workforcePerformanceEnabled() && workforceAccess.ok
      ? (await loadWorkforceBoard(workforceAccess.organizationId, dispatchDate)).exceptions.slice(0, 8)
      : [];
  const changeOrderAccess = resolveCommercialAccess(session, "change_order.read");
  const unapprovedChangeOrders = changeOrderAccess.ok
    ? await listUnapprovedChangeOrders(changeOrderAccess.organizationId)
    : [];
  const importAccess = resolveImportAccess(session, "data.import.prepare");
  const importAttention = importAccess.ok
    ? await listImportAttention(importAccess.organizationId)
    : { batches: [], deadLetters: [] };
  const importExceptions = listImportHomeExceptions(importAttention);
  const summary = buildHomeSummary(
    { requests, opportunities, projects, jobs },
    opsNow.getTime(),
  );
  const portfolioSummary = buildPortfolioScheduleSummary(
    serializePortfolioSchedule(portfolioScheduleResult),
    opsNow,
  );
  const partialScheduleCounts = new Set(portfolioSummary.partialCounts);
  const partialHint = "Partial result — portfolio limit reached";
  const exceptionInput = {
    ...exceptionSource,
    now: opsNow,
    viewerOrganizationId: organizationIdForOpsSession(session),
    changeOrders: unapprovedChangeOrders,
  };
  const operationsExceptions = listOperationsExceptions(exceptionInput);
  const exceptionTotal = countOperationsExceptions(exceptionInput);
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

      <section aria-labelledby="operations-exceptions-heading" className="space-y-3">
        <div>
          <h2 id="operations-exceptions-heading" className="text-lg font-semibold">
            Operations exceptions
          </h2>
          <p className="text-sm text-muted-foreground">
            {exceptionTotal === 0
              ? "Missing daily logs, failed transcriptions, blocked jobs, overdue tasks, voice notes still to extract, installed quantities ahead of the amount still stated on open tasks, failed scan, extraction, proposal, or conversion jobs, and unapproved change orders."
              : exceptionTotal > operationsExceptions.length
                ? `${exceptionTotal} to review. Showing ${operationsExceptions.length}.`
                : `${exceptionTotal} to review. Missing daily logs, failed transcriptions, blocked jobs, overdue tasks, voice notes still to extract, installed quantities ahead of the amount still stated on open tasks, failed scan, extraction, proposal, or conversion jobs, and unapproved change orders.`}
          </p>
        </div>
        {operationsExceptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No operations exceptions.</p>
        ) : (
          <ul className="divide-y rounded-xl bg-card ring-1 ring-foreground/10">
            {operationsExceptions.map((exception) => (
              <li key={`${exception.kind}-${exception.href}-${exception.label}`}>
                <Link
                  href={exception.href}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-muted/40"
                >
                  <span>{exception.label}</span>
                  <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {dispatchDay ? (
        <section aria-labelledby="dispatch-attention-heading" className="space-y-3">
          <div>
            <h2 id="dispatch-attention-heading" className="text-lg font-semibold">
              Dispatch
            </h2>
            <p className="text-sm text-muted-foreground">
              Active jobs with no one scheduled today, and people booked on more than one job.
            </p>
          </div>
          {dispatchDay.doubleBooked.length === 0 && undispatchedPreview.length === 0 ? (
            <p className="text-sm text-muted-foreground">Every active job has a dispatch today.</p>
          ) : (
            <ul className="divide-y rounded-xl bg-card ring-1 ring-foreground/10">
              {dispatchDay.doubleBooked.map((person) => (
                <li key={`double-${person.userId}`}>
                  <Link
                    href={`/app/dispatch?date=${dispatchDate}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-muted/40"
                  >
                    <span>
                      {person.displayName} is scheduled on {person.jobNames.length} jobs
                    </span>
                    <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </Link>
                </li>
              ))}
              {undispatchedPreview.map((job) => (
                <li key={`open-${job.id}`}>
                  <Link
                    href={`/app/dispatch?date=${dispatchDate}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-muted/40"
                  >
                    <span>{job.name} has no dispatch today</span>
                    <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {dispatchDay.undispatched.length > undispatchedPreview.length ? (
            <p className="text-sm text-muted-foreground">
              {dispatchDay.undispatched.length} jobs have no dispatch. Showing {undispatchedPreview.length}.
            </p>
          ) : null}
        </section>
      ) : null}

      {purchaseAttention ? (
        <section aria-labelledby="purchase-attention-heading" className="space-y-3">
          <div>
            <h2 id="purchase-attention-heading" className="text-lg font-semibold">
              Purchasing
            </h2>
            <p className="text-sm text-muted-foreground">
              Draft purchase orders, and material requests that are not on a draft or ordered order.
            </p>
          </div>
          {purchaseShown.length === 0 ? (
            <p className="text-sm text-muted-foreground">No purchasing attention.</p>
          ) : (
            <ul className="divide-y rounded-xl bg-card ring-1 ring-foreground/10">
              {purchaseShown.map((item) => (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-muted/40"
                  >
                    <span>{item.label}</span>
                    <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {purchasePreview.length > purchaseShown.length ? (
            <p className="text-sm text-muted-foreground">
              {purchasePreview.length} purchasing items. Showing {purchaseShown.length}.
            </p>
          ) : null}
        </section>
      ) : null}

      {workforcePerformanceEnabled() && workforceAccess.ok ? (
        <section aria-labelledby="workforce-exceptions-heading" className="space-y-3">
          <div>
            <h2 id="workforce-exceptions-heading" className="text-lg font-semibold">
              Workforce
            </h2>
            <p className="text-sm text-muted-foreground">
              Missing production or labor, reviews, and repeated below-target shifts. This is not a ranking.
            </p>
          </div>
          {workforceExceptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No workforce exceptions.</p>
          ) : (
            <ul className="divide-y rounded-xl bg-card ring-1 ring-foreground/10">
              {workforceExceptions.map((exception) => (
                <li key={`${exception.kind}-${exception.label}`}>
                  <Link
                    href={exception.href}
                    className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-muted/40"
                  >
                    <span>{exception.label}</span>
                    <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {importAccess.ok ? (
        <section aria-labelledby="import-exceptions-heading" className="space-y-3">
          <div>
            <h2 id="import-exceptions-heading" className="text-lg font-semibold">
              Import exceptions
            </h2>
            <p className="text-sm text-muted-foreground">
              Failed imports, dead-letter import jobs, price drafts awaiting approval, and workforce accounts awaiting activation.
            </p>
          </div>
          {importExceptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No import exceptions.</p>
          ) : (
            <ul className="divide-y rounded-xl bg-card ring-1 ring-foreground/10">
              {importExceptions.map((exception) => (
                <li key={`${exception.kind}-${exception.href}-${exception.label}`}>
                  <Link
                    href={exception.href}
                    className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-muted/40"
                  >
                    <span>{exception.label}</span>
                    <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

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
