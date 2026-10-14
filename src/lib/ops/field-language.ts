export const FIELD_LANGUAGES = ["en", "fr", "es"] as const;
export type FieldLanguage = (typeof FIELD_LANGUAGES)[number];

export const FIELD_LANGUAGE_LABELS: Record<FieldLanguage, string> = {
  en: "English",
  fr: "Français",
  es: "Español",
};

export function fieldLanguage(value: string | null | undefined): FieldLanguage {
  const code = value?.trim().toLowerCase() ?? "";
  if (code === "fr" || code.startsWith("fr-")) return "fr";
  if (code === "es" || code.startsWith("es-")) return "es";
  return "en";
}

export function languageIdempotencyKey(userId: string): string {
  return `staff.language:${userId}`;
}
