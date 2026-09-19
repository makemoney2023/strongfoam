import { AlertCircleIcon, CheckCircle2Icon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function Flash({
  saved,
  error,
  savedMessage = "Saved.",
}: {
  saved?: string;
  error?: string;
  savedMessage?: string;
}) {
  if (!saved && !error) return null;

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert>
      <CheckCircle2Icon />
      <AlertDescription>{savedMessage}</AlertDescription>
    </Alert>
  );
}
