import { ActionForm } from "@/components/ops/action-form";
import { StatusBadge } from "@/components/ops/status-badge";
import { SubmitButton } from "@/components/ops/submit-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/lib/ops/action-result";
import {
  formatPurchaseLine,
  purchaseOrderStatusLabel,
  type PurchaseOrderView,
} from "@/lib/ops/purchase-order";

type RequestChoice = {
  id: string;
  body: string;
  quantity: number | null;
  unit: string | null;
};

export function PurchaseOrdersPanel({
  jobId,
  orders,
  availableRequests,
  canEdit,
  jobClosed,
  createAction,
  orderAction,
  cancelAction,
}: {
  jobId: string;
  orders: PurchaseOrderView[];
  availableRequests: RequestChoice[];
  canEdit: boolean;
  jobClosed: boolean;
  createAction?: (formData: FormData) => Promise<ActionState>;
  orderAction?: (formData: FormData) => Promise<ActionState>;
  cancelAction?: (formData: FormData) => Promise<ActionState>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Purchase orders</CardTitle>
        <CardDescription>
          A draft cites open material requests. It stores no price. Ordering locks the
          draft. Cancelling keeps the order and releases those requests.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No purchase orders on this job.</p>
        ) : (
          <ul className="space-y-3">
            {orders.map((order) => (
              <li key={order.id} className="rounded-xl bg-muted/30 p-4 ring-1 ring-foreground/10">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{order.supplier}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.lines.length} {order.lines.length === 1 ? "line" : "lines"}
                      {order.note ? ` · ${order.note}` : ""}
                    </p>
                  </div>
                  <StatusBadge
                    status={order.status}
                    label={purchaseOrderStatusLabel(order.status)}
                  />
                </div>
                <ul className="mt-3 space-y-1 text-sm">
                  {order.lines.map((line) => (
                    <li key={line.id}>{formatPurchaseLine(line)}</li>
                  ))}
                </ul>
                {canEdit && order.status !== "cancelled" ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {order.status === "draft" && orderAction ? (
                      <ActionForm action={orderAction}>
                        <input type="hidden" name="jobId" value={jobId} />
                        <input type="hidden" name="purchaseOrderId" value={order.id} />
                        <SubmitButton pendingLabel="Ordering…" className="min-h-11">
                          Mark ordered
                        </SubmitButton>
                      </ActionForm>
                    ) : null}
                    {cancelAction ? (
                      <ActionForm action={cancelAction}>
                        <input type="hidden" name="jobId" value={jobId} />
                        <input type="hidden" name="purchaseOrderId" value={order.id} />
                        <SubmitButton
                          variant="outline"
                          pendingLabel="Cancelling…"
                          className="min-h-11"
                        >
                          Cancel order
                        </SubmitButton>
                      </ActionForm>
                    ) : null}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {canEdit && createAction && !jobClosed ? (
          availableRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No material request is waiting to be ordered.
            </p>
          ) : (
            <ActionForm action={createAction} className="grid gap-4">
              <input type="hidden" name="jobId" value={jobId} />
              <div className="space-y-2">
                <Label htmlFor={`supplier-${jobId}`}>Supplier</Label>
                <Input
                  id={`supplier-${jobId}`}
                  name="supplier"
                  required
                  maxLength={120}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`purchase-note-${jobId}`}>Note</Label>
                <Input
                  id={`purchase-note-${jobId}`}
                  name="note"
                  maxLength={500}
                  className="h-11"
                />
              </div>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Material requests</legend>
                <ul className="space-y-2">
                  {availableRequests.map((request) => (
                    <li key={request.id}>
                      <label className="flex min-h-11 items-start gap-3 text-sm">
                        <input
                          type="checkbox"
                          name="materialRequestId"
                          value={request.id}
                          className="mt-1 size-5"
                        />
                        <span>
                          {request.body}
                          {request.quantity && request.unit
                            ? ` · ${request.quantity} ${request.unit.replaceAll("_", " ")}`
                            : ""}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </fieldset>
              <SubmitButton pendingLabel="Drafting…" className="min-h-11 w-full sm:w-auto">
                Draft purchase order
              </SubmitButton>
            </ActionForm>
          )
        ) : null}
      </CardContent>
    </Card>
  );
}
