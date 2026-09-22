import { formatUnitPrice } from "@/lib/ops/price-book";
import type { EstimateDiff } from "@/lib/ops/estimates";

function ChangeList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <ul className="mt-1 list-disc pl-5 text-sm">
        {items.map((item) => (
          <li key={`${title}-${item}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function EstimateVersionDiff({
  fromVersion,
  toVersion,
  diff,
}: {
  fromVersion: number;
  toVersion: number;
  diff: EstimateDiff;
}) {
  const delta = diff.totals.deltaCents;
  return (
    <section className="space-y-3 rounded-lg border p-4" aria-label="Version comparison">
      <h2 className="font-medium">
        Version {fromVersion} compared with version {toVersion}
      </h2>
      <p className="text-sm">
        Total {formatUnitPrice(diff.totals.fromCents)} to {formatUnitPrice(diff.totals.toCents)} (
        {delta > 0 ? "+" : ""}
        {formatUnitPrice(delta)})
      </p>
      <ChangeList title="Added lines" items={diff.lines.added} />
      <ChangeList title="Removed lines" items={diff.lines.removed} />
      <ChangeList title="Changed lines" items={diff.lines.changed} />
      <ChangeList title="Added clauses" items={diff.clauses.added} />
      <ChangeList title="Changed clauses" items={diff.clauses.changed} />
      <ChangeList title="Removed clauses" items={diff.clauses.removed} />
      <ChangeList title="Added alternates" items={diff.alternates.added} />
      <ChangeList title="Changed alternates" items={diff.alternates.changed} />
      <ChangeList title="Removed alternates" items={diff.alternates.removed} />
      <ChangeList title="Added job packages" items={diff.jobPackages.added} />
      <ChangeList title="Changed job packages" items={diff.jobPackages.changed} />
      <ChangeList title="Removed job packages" items={diff.jobPackages.removed} />
    </section>
  );
}
