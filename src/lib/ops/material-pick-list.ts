export type MaterialPickLine = {
  text: string;
  count: number;
  ids: string[];
};

export function buildMaterialPickList(
  notes: Array<{ id: string; kind: string; body: string }>,
): { lines: MaterialPickLine[]; draft: string } {
  const groups = new Map<string, MaterialPickLine>();
  for (const note of notes) {
    if (note.kind !== "material_request") continue;
    const text = note.body.trim();
    if (!text) continue;
    const key = text.toLocaleLowerCase();
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
      existing.ids.push(note.id);
    } else {
      groups.set(key, { text, count: 1, ids: [note.id] });
    }
  }
  const lines = [...groups.values()];
  const draft = lines
    .map((line) => (line.count > 1 ? `${line.text} (×${line.count})` : line.text))
    .join("\n");
  return { lines, draft };
}
