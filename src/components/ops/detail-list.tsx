import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Label/value pairs for read-only record summaries. */
export function DetailList({
  items,
  columns = 2,
  className,
}: {
  items: Array<{ label: string; value: ReactNode; hidden?: boolean }>;
  columns?: 1 | 2 | 3;
  className?: string;
}) {
  const visible = items.filter((item) => !item.hidden);
  return (
    <dl
      className={cn(
        "grid gap-4",
        columns === 2 && "sm:grid-cols-2",
        columns === 3 && "sm:grid-cols-3",
        className,
      )}
    >
      {visible.map((item) => (
        <div key={item.label}>
          <dt className="text-xs font-medium text-muted-foreground">{item.label}</dt>
          <dd className="mt-1 text-sm">{item.value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
