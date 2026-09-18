import Link from "next/link";
import { redirect } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getOpsSession } from "@/lib/ops/auth";
import { listEstimateRequests } from "@/lib/ops/store";
import {
  BOOKING_LABELS,
  QUALIFICATION_LABELS,
  WORKFLOW_LABELS,
  WORKFLOW_STATUSES,
  formatCompany,
  formatFullName,
  formatRelativeAge,
  formatRequestNumber,
  formatServices,
} from "@/lib/ops/workflow";

export const dynamic = "force-dynamic";

function selectClassName() {
  return "h-11 w-full rounded-lg border border-input bg-white px-2.5 text-sm";
}

export default async function EstimateRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; workflow?: string; qualification?: string }>;
}) {
  if (!(await getOpsSession())) {
    redirect("/app/login");
  }

  const params = await searchParams;
  const requests = await listEstimateRequests({
    q: params.q,
    workflowStatus: params.workflow,
    qualification: params.qualification,
  });

  return (
    <main className="page-rail py-8">
      <p className="section-kicker mb-2">Operations</p>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Estimate requests
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[color:var(--sf-ink)]/70">
            Review every survey submission, assign an owner, and keep the next
            action visible.
          </p>
        </div>
        <p className="text-sm font-semibold text-[color:var(--sf-ink)]/60">
          {requests.length} request{requests.length === 1 ? "" : "s"}
        </p>
      </div>

      <form className="mt-6 grid gap-3 rounded-[0.35rem] border border-[color:var(--sf-ink)]/10 bg-white p-4 md:grid-cols-[minmax(0,1fr)_12rem_12rem_auto]">
        <div className="space-y-2">
          <Label htmlFor="q">Search</Label>
          <Input
            id="q"
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Company, contact, city, email"
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="workflow">Status</Label>
          <select
            id="workflow"
            name="workflow"
            defaultValue={params.workflow ?? ""}
            className={selectClassName()}
          >
            <option value="">All statuses</option>
            {WORKFLOW_STATUSES.map((status) => (
              <option key={status} value={status}>
                {WORKFLOW_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="qualification">Qualification</Label>
          <select
            id="qualification"
            name="qualification"
            defaultValue={params.qualification ?? ""}
            className={selectClassName()}
          >
            <option value="">All</option>
            <option value="qualified">Qualified</option>
            <option value="secondary">Secondary</option>
          </select>
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            className="h-11 rounded-md bg-[color:var(--sf-cyan)] px-4 text-sm font-semibold text-[color:var(--sf-ink)]"
          >
            Filter
          </button>
        </div>
      </form>

      <div className="mt-6 overflow-x-auto rounded-[0.35rem] border border-[color:var(--sf-ink)]/10 bg-white">
        <table className="min-w-[68rem] w-full border-collapse text-left text-sm">
          <thead className="bg-[color:var(--sf-mist,#e9edef)] text-xs uppercase tracking-[0.12em] text-[color:var(--sf-ink)]/60">
            <tr>
              <th className="px-4 py-3 font-semibold">Request</th>
              <th className="px-4 py-3 font-semibold">Company</th>
              <th className="px-4 py-3 font-semibold">Location</th>
              <th className="px-4 py-3 font-semibold">Services</th>
              <th className="px-4 py-3 font-semibold">Qualification</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Owner</th>
              <th className="px-4 py-3 font-semibold">Next action</th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-[color:var(--sf-ink)]/60">
                  No estimate requests match these filters.
                </td>
              </tr>
            ) : (
              requests.map((request) => {
                const company = formatCompany(
                  request.company,
                  formatFullName(request.firstName, request.lastName),
                );
                return (
                  <tr
                    key={request.id}
                    className="border-t border-[color:var(--sf-ink)]/8 hover:bg-[color:var(--sf-cyan)]/5"
                  >
                    <td className="px-4 py-3 align-top">
                      <Link
                        href={`/app/requests/${request.id}`}
                        className="font-semibold text-[color:var(--sf-cyan)] underline-offset-4 hover:underline"
                      >
                        {formatRequestNumber(request.id)}
                      </Link>
                      <p className="mt-1 text-xs text-[color:var(--sf-ink)]/55">
                        {formatRelativeAge(request.createdAt)} ago
                      </p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="font-medium">{company}</p>
                      <p className="text-[color:var(--sf-ink)]/60">
                        {formatFullName(request.firstName, request.lastName)}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      {request.city}
                      {request.province === "ON" ? ", ON" : " · Outside Ontario"}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {formatServices(request.services)}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {QUALIFICATION_LABELS[request.status as keyof typeof QUALIFICATION_LABELS] ??
                        request.status}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {WORKFLOW_LABELS[request.workflowStatus as keyof typeof WORKFLOW_LABELS] ??
                        request.workflowStatus}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {request.assignedTo ?? "Unassigned"}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p>{request.nextAction ?? "Set next action"}</p>
                      <p className="text-xs text-[color:var(--sf-ink)]/55">
                        {BOOKING_LABELS[request.bookingStatus as keyof typeof BOOKING_LABELS] ??
                          request.bookingStatus}
                      </p>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
