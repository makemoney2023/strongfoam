export function EstimateJobPackages({
  packages,
}: {
  packages: Array<{
    id: string;
    name: string;
    trade: string;
    scope: string;
    workAreas: Array<{ id: string; name: string; kind: string }>;
    tasks: Array<{ id: string; title: string }>;
  }>;
}) {
  if (!packages.length) {
    return <p className="text-sm text-muted-foreground">No job packages on this version.</p>;
  }
  return (
    <ul className="space-y-3">
      {packages.map((pkg) => (
        <li key={pkg.id} className="rounded-lg border p-3">
          <p className="font-medium">{pkg.name}</p>
          <p className="text-sm text-muted-foreground">
            {pkg.trade} · {pkg.scope}
          </p>
          <p className="mt-2 text-xs font-medium text-muted-foreground">Work areas</p>
          <ul className="text-sm">
            {pkg.workAreas.map((area) => (
              <li key={area.id}>
                {area.name} · {area.kind}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs font-medium text-muted-foreground">Starter tasks</p>
          <ul className="text-sm">
            {pkg.tasks.map((task) => (
              <li key={task.id}>{task.title}</li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
