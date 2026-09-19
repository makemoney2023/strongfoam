import Link from "next/link";
import { redirect } from "next/navigation";
import { NativeSelect } from "@/components/ops/native-select";
import { PageHeader } from "@/components/ops/page-header";
import { StatusBadge } from "@/components/ops/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
    <div className="space-y-6">
      <PageHeader
        title="Estimate requests"
        description="Review survey submissions, assign an owner, and keep the next action visible."
        actions={
          <p className="text-sm text-muted-foreground">
            {requests.length} request{requests.length === 1 ? "" : "s"}
          </p>
        }
      />

      <Card>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem_12rem_auto]">
            <div className="space-y-2">
              <Label htmlFor="q">Search</Label>
              <Input
                id="q"
                name="q"
                defaultValue={params.q ?? ""}
                placeholder="Company, contact, city, email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workflow">Status</Label>
              <NativeSelect id="workflow" name="workflow" defaultValue={params.workflow ?? ""}>
                <option value="">All statuses</option>
                {WORKFLOW_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {WORKFLOW_LABELS[status]}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="qualification">Qualification</Label>
              <NativeSelect
                id="qualification"
                name="qualification"
                defaultValue={params.qualification ?? ""}
              >
                <option value="">All</option>
                <option value="qualified">Qualified</option>
                <option value="secondary">Secondary</option>
              </NativeSelect>
            </div>
            <div className="flex items-end">
              <Button type="submit">Filter</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Request</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Services</TableHead>
              <TableHead>Qualification</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Next action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  No estimate requests match these filters.
                </TableCell>
              </TableRow>
            ) : (
              requests.map((request) => {
                const company = formatCompany(
                  request.company,
                  formatFullName(request.firstName, request.lastName),
                );
                return (
                  <TableRow key={request.id}>
                    <TableCell>
                      <Link href={`/app/requests/${request.id}`} className="font-medium hover:underline">
                        {formatRequestNumber(request.id)}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {formatRelativeAge(request.createdAt)} ago
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{company}</p>
                      <p className="text-muted-foreground">
                        {formatFullName(request.firstName, request.lastName)}
                      </p>
                    </TableCell>
                    <TableCell>
                      {request.city}
                      {request.province === "ON" ? ", ON" : " · Outside Ontario"}
                    </TableCell>
                    <TableCell>{formatServices(request.services)}</TableCell>
                    <TableCell>
                      <StatusBadge
                        status={request.status}
                        label={
                          QUALIFICATION_LABELS[request.status as keyof typeof QUALIFICATION_LABELS] ??
                          request.status
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={request.workflowStatus}
                        label={
                          WORKFLOW_LABELS[request.workflowStatus as keyof typeof WORKFLOW_LABELS] ??
                          request.workflowStatus
                        }
                      />
                    </TableCell>
                    <TableCell>{request.assignedTo ?? "Unassigned"}</TableCell>
                    <TableCell>
                      <p>{request.nextAction ?? "Set next action"}</p>
                      <p className="text-xs text-muted-foreground">
                        {request.nextActionDueAt
                          ? `Due ${request.nextActionDueAt.toLocaleString("en-CA")}`
                          : (BOOKING_LABELS[request.bookingStatus as keyof typeof BOOKING_LABELS] ??
                            request.bookingStatus)}
                      </p>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
