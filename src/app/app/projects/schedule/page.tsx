import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ops/page-header";
import { PortfolioSchedule } from "@/components/ops/portfolio-schedule";
import { Card, CardContent } from "@/components/ui/card";
import { getOpsSession } from "@/lib/ops/auth";
import {
  serializePortfolioSchedule,
} from "@/lib/ops/portfolio-schedule";
import {
  parsePortfolioScheduleQuery,
} from "@/lib/ops/portfolio-schedule-query";
import { listPortfolioSchedule } from "@/lib/ops/store";

export const dynamic = "force-dynamic";

export default async function PortfolioSchedulePage({
  searchParams,
}: {
  searchParams: Promise<
    Record<string, string | string[] | undefined>
  >;
}) {
  if (!(await getOpsSession())) {
    redirect("/app/login");
  }

  const params = await searchParams;
  const query = parsePortfolioScheduleQuery(params);
  const raw = await listPortfolioSchedule({
    q: query.q,
    projectStatus:
      query.projectStatus === "all" ? undefined : query.projectStatus,
    projectManager: query.projectManager,
  });
  const data = serializePortfolioSchedule(raw);
  const now = new Date().toISOString();

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader
        crumbs={[
          { href: "/app/projects", label: "Projects" },
          { label: "Portfolio Schedule" },
        ]}
        title="Portfolio Schedule"
        description="Compare project, job, task, baseline, and resource schedules across the current server-filtered portfolio."
      />
      <Card className="min-w-0">
        <CardContent className="min-w-0">
          <PortfolioSchedule
            data={data}
            query={query}
            now={now}
          />
        </CardContent>
      </Card>
    </div>
  );
}
