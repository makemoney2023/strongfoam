import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ListFilters({
  children,
}: {
  children: React.ReactNode;
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
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="from">{fromLabel}</Label>
        <Input
          id="from"
          name="from"
          type="date"
          defaultValue={from ?? ""}
          className="h-11 w-44"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="to">{toLabel}</Label>
        <Input
          id="to"
          name="to"
          type="date"
          defaultValue={to ?? ""}
          className="h-11 w-44"
        />
      </div>
    </>
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
