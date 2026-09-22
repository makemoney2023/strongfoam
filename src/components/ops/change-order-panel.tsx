import { FilePenLineIcon } from "lucide-react";
import { ActionForm } from "@/components/ops/action-form";
import { EmptyState } from "@/components/ops/empty-state";
import { FormDialog } from "@/components/ops/form-dialog";
import { StatusBadge } from "@/components/ops/status-badge";
import { SubmitButton } from "@/components/ops/submit-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createProjectChangeOrder,
  decideProjectChangeOrder,
  submitProjectChangeOrder,
  updateProjectChangeOrder,
  voidProjectChangeOrder,
} from "@/app/app/projects/change-order-actions";
import {
  CHANGE_ORDER_STATUS_LABELS,
  formatScheduleImpact,
  type ChangeOrder,
  type ChangeOrderApproval,
  type ChangeOrderBudgetEffect,
} from "@/lib/ops/change-orders";
import { formatUnitPrice } from "@/lib/ops/price-book";

function priceInput(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const absolute = Math.abs(cents);
  return `${sign}${Math.trunc(absolute / 100)}.${String(absolute % 100).padStart(2, "0")}`;
}

function ChangeOrderFields({
  idPrefix,
  scope = "",
  price = "",
  days = "0",
}: {
  idPrefix: string;
  scope?: string;
  price?: string;
  days?: string;
}) {
  return (
    <>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-scope`}>
          Scope <span aria-hidden="true">*</span>
        </Label>
        <Textarea
          id={`${idPrefix}-scope`}
          name="scope"
          required
          defaultValue={scope}
          className="min-h-24"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-price`}>
          Price (CAD) <span aria-hidden="true">*</span>
        </Label>
        <Input
          id={`${idPrefix}-price`}
          name="price"
          inputMode="decimal"
          required
          defaultValue={price}
          placeholder="0.00"
          className="h-11"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-days`}>Schedule impact (days)</Label>
        <Input
          id={`${idPrefix}-days`}
          name="scheduleImpactDays"
          inputMode="numeric"
          defaultValue={days}
          placeholder="0"
          className="h-11"
        />
      </div>
    </>
  );
}

export function ChangeOrderPanel({
  projectId,
  orders,
  approvals,
  effects,
  budget,
  canEdit,
  canApprove,
}: {
  projectId: string;
  orders: ChangeOrder[];
  approvals: ChangeOrderApproval[];
  effects: ChangeOrderBudgetEffect[];
  budget: {
    originalCents: number | null;
    revisedCents: number;
    scheduleImpactDays: number;
  };
  canEdit: boolean;
  canApprove: boolean;
}) {
  const effectIds = new Set(effects.map((effect) => effect.changeOrderId));
  return (
    <section id="change-orders" aria-labelledby="change-orders-heading" className="scroll-mt-4">
      <Card>
        <CardHeader>
          <CardTitle id="change-orders-heading">Change orders</CardTitle>
          <CardDescription>
            {budget.originalCents == null
              ? "No approved estimate budget is on this project yet."
              : `Original budget ${formatUnitPrice(budget.originalCents)}.`}
            {` Revised budget ${formatUnitPrice(budget.revisedCents)}. Approved schedule impact ${formatScheduleImpact(budget.scheduleImpactDays)}.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {canEdit ? (
            <FormDialog
              triggerLabel="New change order"
              triggerIcon={<FilePenLineIcon aria-hidden="true" />}
              title="New change order"
              description="Save a draft with scope, price, and schedule impact. Approval revises the project budget."
            >
              <ActionForm action={createProjectChangeOrder} className="grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="projectId" value={projectId} />
                <ChangeOrderFields idPrefix={`${projectId}-new`} />
                <div className="sm:col-span-2">
                  <SubmitButton className="min-h-11 w-full sm:w-auto">Save draft</SubmitButton>
                </div>
              </ActionForm>
            </FormDialog>
          ) : null}
          {orders.length === 0 ? (
            <EmptyState
              icon={<FilePenLineIcon aria-hidden="true" />}
              title="No change orders yet"
              description="A change order records scope, price, and schedule impact. The budget changes only after approval."
              className="py-6"
            />
          ) : (
            <ul className="space-y-4">
              {orders.map((order) => {
                const decisions = approvals.filter((approval) => approval.changeOrderId === order.id);
                return (
                  <li key={order.id} className="space-y-3 rounded-xl bg-muted/30 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">
                        {order.number} · {formatUnitPrice(order.priceCents)} ·{" "}
                        {formatScheduleImpact(order.scheduleImpactDays)}
                      </p>
                      <StatusBadge status={order.status} label={CHANGE_ORDER_STATUS_LABELS[order.status]} />
                    </div>
                    <p className="whitespace-pre-wrap text-sm">{order.scope}</p>
                    {effectIds.has(order.id) ? (
                      <p className="text-sm text-muted-foreground">
                        Included in the revised budget.
                      </p>
                    ) : null}
                    {decisions.length ? (
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        {decisions.map((decision) => (
                          <li key={decision.id}>
                            {decision.actorEmail} · {decision.decision} · {decision.comment}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {canEdit && order.status === "draft" ? (
                      <div className="flex flex-wrap gap-2">
                        <FormDialog
                          triggerLabel="Edit"
                          triggerVariant="outline"
                          title={`Edit ${order.number}`}
                          description="Drafts can change until they are submitted."
                        >
                          <ActionForm action={updateProjectChangeOrder} className="grid gap-3 sm:grid-cols-2">
                            <input type="hidden" name="projectId" value={projectId} />
                            <input type="hidden" name="changeOrderId" value={order.id} />
                            <ChangeOrderFields
                              idPrefix={order.id}
                              scope={order.scope}
                              price={priceInput(order.priceCents)}
                              days={String(order.scheduleImpactDays)}
                            />
                            <div className="sm:col-span-2">
                              <SubmitButton className="min-h-11 w-full sm:w-auto">Save draft</SubmitButton>
                            </div>
                          </ActionForm>
                        </FormDialog>
                        <ActionForm action={submitProjectChangeOrder}>
                          <input type="hidden" name="projectId" value={projectId} />
                          <input type="hidden" name="changeOrderId" value={order.id} />
                          <SubmitButton variant="default" className="min-h-11">
                            Submit for approval
                          </SubmitButton>
                        </ActionForm>
                        <ActionForm action={voidProjectChangeOrder}>
                          <input type="hidden" name="projectId" value={projectId} />
                          <input type="hidden" name="changeOrderId" value={order.id} />
                          <SubmitButton variant="outline" className="min-h-11">
                            Void
                          </SubmitButton>
                        </ActionForm>
                      </div>
                    ) : null}
                    {canApprove && order.status === "pending" ? (
                      <ActionForm action={decideProjectChangeOrder} className="grid gap-3">
                        <input type="hidden" name="projectId" value={projectId} />
                        <input type="hidden" name="changeOrderId" value={order.id} />
                        <input type="hidden" name="contentHash" value={order.contentHash} />
                        <fieldset className="space-y-2">
                          <legend className="text-sm font-medium">Decision</legend>
                          <div className="flex flex-wrap gap-4 text-sm">
                            <label className="flex items-center gap-2">
                              <input type="radio" name="decision" value="approved" required />
                              Approve
                            </label>
                            <label className="flex items-center gap-2">
                              <input type="radio" name="decision" value="rejected" />
                              Reject
                            </label>
                          </div>
                        </fieldset>
                        <div className="space-y-2">
                          <Label htmlFor={`${order.id}-comment`}>Decision comment</Label>
                          <Textarea id={`${order.id}-comment`} name="comment" required className="min-h-20" />
                        </div>
                        <SubmitButton variant="default" className="min-h-11 w-full sm:w-auto">
                          Record decision
                        </SubmitButton>
                      </ActionForm>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
