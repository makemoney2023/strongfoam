import type { VariantProps } from "class-variance-authority";
import { Badge, badgeVariants } from "@/components/ui/badge";

type Tone = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

function toneFor(status: string): Tone {
  switch (status) {
    case "won":
    case "complete":
    case "closed":
    case "qualified":
    case "approved":
      return "default";
    case "lost":
    case "blocked":
    case "rejected":
      return "destructive";
    case "in_progress":
    case "scheduled":
    case "ready_for_inspection":
    case "pending":
      return "secondary";
    default:
      return "outline";
  }
}

export function StatusBadge({
  status,
  label,
}: {
  status: string;
  label?: string;
}) {
  return <Badge variant={toneFor(status)}>{label ?? status}</Badge>;
}
