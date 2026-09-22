import { PencilIcon, PlusIcon } from "lucide-react";
import { ActionForm, FieldError } from "@/components/ops/action-form";
import { FormDialog } from "@/components/ops/form-dialog";
import { NativeSelect } from "@/components/ops/native-select";
import { SubmitButton } from "@/components/ops/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PRICE_BOOK_TRADES,
  PRICE_BOOK_UNITS,
  priceBookTradeLabel,
  priceBookUnitLabel,
} from "@/lib/ops/price-book";
import { createPriceBookItem, savePriceBookItem } from "./actions";

export function PriceBookDialog({
  item,
}: {
  item?: {
    id: string;
    trade: string;
    name: string;
    unit: string;
    unitPriceCents: number;
    active: boolean;
  };
}) {
  const editing = Boolean(item);
  const dollars = item ? (item.unitPriceCents / 100).toFixed(2) : "";
  return (
    <FormDialog
      triggerLabel={editing ? "Edit" : "Add item"}
      triggerIcon={editing ? <PencilIcon aria-hidden="true" /> : <PlusIcon aria-hidden="true" />}
      triggerVariant={editing ? "outline" : "default"}
      triggerAriaLabel={editing ? `Edit ${item?.name}` : undefined}
      title={editing ? "Edit price-book item" : "Add a price-book item"}
      description="A reusable unit price for one trade. Retiring an item keeps it in the book."
    >
      <ActionForm
        action={editing ? savePriceBookItem : createPriceBookItem}
        className="grid gap-3"
      >
        {item ? <input type="hidden" name="id" value={item.id} /> : null}
        <div className="space-y-2">
          <Label htmlFor={`${item?.id ?? "new"}-trade`}>Trade</Label>
          <NativeSelect
            id={`${item?.id ?? "new"}-trade`}
            name="trade"
            className="h-11"
            defaultValue={item?.trade ?? "spray-foam"}
            required
          >
            {PRICE_BOOK_TRADES.map((trade) => (
              <option key={trade} value={trade}>
                {priceBookTradeLabel(trade)}
              </option>
            ))}
          </NativeSelect>
          <FieldError name="trade" />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${item?.id ?? "new"}-name`}>
            Name <span aria-hidden="true">*</span>
          </Label>
          <Input
            id={`${item?.id ?? "new"}-name`}
            name="name"
            className="h-11"
            maxLength={160}
            defaultValue={item?.name ?? ""}
            required
            autoFocus
          />
          <FieldError name="name" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`${item?.id ?? "new"}-unit`}>Unit</Label>
            <NativeSelect
              id={`${item?.id ?? "new"}-unit`}
              name="unit"
              className="h-11"
              defaultValue={item?.unit ?? "bags"}
              required
            >
              {PRICE_BOOK_UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {priceBookUnitLabel(unit)}
                </option>
              ))}
            </NativeSelect>
            <FieldError name="unit" />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${item?.id ?? "new"}-price`}>Unit price (CAD)</Label>
            <Input
              id={`${item?.id ?? "new"}-price`}
              name="unitPrice"
              inputMode="decimal"
              className="h-11"
              defaultValue={dollars}
              placeholder="185.00"
              required
            />
            <FieldError name="unitPrice" />
          </div>
        </div>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="active"
            value="1"
            defaultChecked={item ? item.active : true}
            className="size-4 accent-primary"
          />
          Active
        </label>
        <SubmitButton className="min-h-11 w-full sm:w-auto" pendingLabel="Saving…">
          {editing ? "Save item" : "Create item"}
        </SubmitButton>
      </ActionForm>
    </FormDialog>
  );
}
