import { BookOpenIcon } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm } from "@/components/ops/action-form";
import { EmptyState } from "@/components/ops/empty-state";
import { FilterSubmit, ListFilters } from "@/components/ops/list-filters";
import { NativeSelect } from "@/components/ops/native-select";
import { PageHeader } from "@/components/ops/page-header";
import { SubmitButton } from "@/components/ops/submit-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
import { resolveCommercialAccess } from "@/lib/ops/commercial-authorization";
import {
  PRICE_BOOK_TRADES,
  formatUnitPrice,
  isPriceBookTrade,
  priceBookTradeLabel,
  priceBookUnitLabel,
} from "@/lib/ops/price-book";
import { listPriceBookItems, listPriceBookVersions } from "@/lib/ops/store";
import { approvePriceBookItem } from "./actions";
import { PriceBookDialog } from "./price-book-dialog";

export const dynamic = "force-dynamic";

export default async function PriceBookPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; trade?: string; retired?: string }>;
}) {
  const session = await getOpsSession();
  if (!session) {
    redirect("/app/login");
  }
  const canEdit = resolveCommercialAccess(session, "estimate.edit").ok;
  const canApprove = resolveCommercialAccess(session, "estimate.approve").ok;

  const params = await searchParams;
  const trade = params.trade && isPriceBookTrade(params.trade) ? params.trade : "";
  const includeInactive = params.retired === "1";
  const items = await listPriceBookItems({
    q: params.q,
    trade: trade || undefined,
    includeInactive,
  });
  const revisions = await listPriceBookVersions(items.map((item) => item.id));
  const isFiltered = Boolean(params.q?.trim() || trade || includeInactive);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Price book"
        description="Reusable unit prices by trade. A price change is a draft until an administrator approves it. Retiring an item keeps every approved revision."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-muted-foreground">
              {items.length} item{items.length === 1 ? "" : "s"}
            </p>
            {canEdit ? <PriceBookDialog /> : null}
          </div>
        }
      />

      <ListFilters>
        <div className="space-y-2">
          <Label htmlFor="q">Search</Label>
          <Input
            id="q"
            name="q"
            type="search"
            defaultValue={params.q ?? ""}
            placeholder="Item name"
            className="h-11 min-w-56"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="trade">Trade</Label>
          <NativeSelect id="trade" name="trade" className="h-11 min-w-44" defaultValue={trade}>
            <option value="">All trades</option>
            {PRICE_BOOK_TRADES.map((value) => (
              <option key={value} value={value}>
                {priceBookTradeLabel(value)}
              </option>
            ))}
          </NativeSelect>
        </div>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="retired"
            value="1"
            defaultChecked={includeInactive}
            className="size-4 accent-primary"
          />
          Show retired
        </label>
        <FilterSubmit />
      </ListFilters>

      <Card>
        {items.length === 0 ? (
          <EmptyState
            icon={<BookOpenIcon aria-hidden="true" />}
            title={isFiltered ? "No price-book items match" : "No price-book items yet"}
            description={
              isFiltered
                ? "Try another trade or clear the search."
                : "Add the unit prices estimators reuse across jobs."
            }
            action={
              isFiltered ? (
                <Link href="/app/price-book" className="text-sm font-medium underline underline-offset-4">
                  Clear filters
                </Link>
              ) : (
                canEdit ? <PriceBookDialog /> : null
              )
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Trade</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Unit price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const history = revisions.filter((version) => version.itemId === item.id);
                const approved = [...history].reverse().find((version) => version.status === "approved");
                const draft = history.find((version) => version.status === "draft");
                const shown = approved ?? draft;
                return (
                <TableRow key={item.id} id={`item-${item.id}`}>
                  <TableCell className="font-medium">
                    <div>{approved?.description ?? item.name}</div>
                    <ul className="mt-1 space-y-1 text-xs font-normal text-muted-foreground">
                      {history.map((version) => (
                        <li key={version.id}>
                          v{version.versionNumber} · {formatUnitPrice(version.unitPriceCents)} ·{" "}
                          {version.status === "approved" ? "Approved" : "Draft"}
                        </li>
                      ))}
                    </ul>
                  </TableCell>
                  <TableCell>{priceBookTradeLabel(shown?.trade ?? item.trade)}</TableCell>
                  <TableCell>{priceBookUnitLabel(shown?.unit ?? item.unit)}</TableCell>
                  <TableCell>{formatUnitPrice(shown?.unitPriceCents ?? item.unitPriceCents)}</TableCell>
                  <TableCell>
                    <Badge variant={item.active ? "secondary" : "outline"}>
                      {item.active ? "Active" : "Retired"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {canApprove && draft ? (
                        <ActionForm action={approvePriceBookItem}>
                          <input type="hidden" name="itemId" value={item.id} />
                          <input type="hidden" name="versionId" value={draft.id} />
                          <SubmitButton variant="outline" className="min-h-11 md:min-h-8" pendingLabel="Approving…">
                            Approve
                          </SubmitButton>
                        </ActionForm>
                      ) : null}
                      {canEdit ? (
                        <PriceBookDialog
                          item={{
                            id: item.id,
                            trade: draft?.trade ?? approved?.trade ?? item.trade,
                            name: draft?.description ?? approved?.description ?? item.name,
                            unit: draft?.unit ?? approved?.unit ?? item.unit,
                            unitPriceCents: draft?.unitPriceCents ?? approved?.unitPriceCents ?? item.unitPriceCents,
                            active: item.active,
                          }}
                        />
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
