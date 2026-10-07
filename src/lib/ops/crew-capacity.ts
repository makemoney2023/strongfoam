export function parseJobsPerDay(
  value: string | undefined,
): { ok: true; value: number } | { ok: false; error: string } {
  if (value === "1" || value === "2" || value === "3") {
    return { ok: true, value: Number(value) };
  }
  return { ok: false, error: "Choose 1, 2, or 3 jobs per day." };
}
