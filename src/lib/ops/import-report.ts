export type ReconciliationRow = {
  sheet: string;
  sourceRow: number;
  entityType: string;
  sourceKey: string;
  operation: string;
  status: string;
  targetId: string;
  message: string;
};

const REPORT_COLUMNS = [
  "sheet",
  "source_row",
  "entity_type",
  "source_key",
  "operation",
  "status",
  "target_id",
  "message",
] as const;

function csvCell(value: string): string {
  const formula = /^[=+\-@\t\r]/.test(value);
  const text = formula ? `'${value}` : value;
  if (formula || /[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function reconciliationCsv(rows: readonly ReconciliationRow[]): string {
  const lines = [REPORT_COLUMNS.join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.sheet,
        String(row.sourceRow),
        row.entityType,
        row.sourceKey,
        row.operation,
        row.status,
        row.targetId,
        row.message,
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return `${lines.join("\n")}\n`;
}
