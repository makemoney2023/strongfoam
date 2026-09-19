"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DATE_PRESET_LABELS,
  DATE_PRESETS,
  dateRangeForPreset,
  type DatePreset,
} from "@/lib/ops/filters";

export function ListFilters({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Card>
      <CardContent>
        <form className="flex flex-wrap items-end gap-3">{children}</form>
      </CardContent>
    </Card>
  );
}

export function DateRangeFields({
  from,
  to,
  fromLabel = "From",
  toLabel = "To",
}: {
  from?: string;
  to?: string;
  fromLabel?: string;
  toLabel?: string;
}) {
  return <DateRangeFieldsInner key={`${from ?? ""}-${to ?? ""}`} from={from} to={to} fromLabel={fromLabel} toLabel={toLabel} />;
}

function DateRangeFieldsInner({
  from,
  to,
  fromLabel,
  toLabel,
}: {
  from?: string;
  to?: string;
  fromLabel: string;
  toLabel: string;
}) {
  const [range, setRange] = useState({ from: from ?? "", to: to ?? "" });

  function applyPreset(preset: DatePreset) {
    setRange(dateRangeForPreset(preset));
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-2">
        <Label htmlFor="from">{fromLabel}</Label>
        <Input
          id="from"
          name="from"
          type="date"
          value={range.from}
          onChange={(event) =>
            setRange((current) => ({ ...current, from: event.target.value }))
          }
          className="h-11 w-44"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="to">{toLabel}</Label>
        <Input
          id="to"
          name="to"
          type="date"
          value={range.to}
          onChange={(event) =>
            setRange((current) => ({ ...current, to: event.target.value }))
          }
          className="h-11 w-44"
        />
      </div>
      <div className="flex flex-wrap gap-1 pb-0.5">
        {DATE_PRESETS.map((preset) => (
          <Button
            key={preset}
            type="button"
            variant="outline"
            className="min-h-11 md:min-h-8"
            onClick={() => applyPreset(preset)}
          >
            {DATE_PRESET_LABELS[preset]}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function FilterSubmit() {
  return (
    <div className="flex items-end">
      <Button type="submit" className="min-h-11">
        Filter
      </Button>
    </div>
  );
}
