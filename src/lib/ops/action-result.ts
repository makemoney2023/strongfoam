export type ActionState = {
  error?: string;
  fields?: Record<string, string>;
  href?: string;
  notice?: {
    kind: "success" | "error";
    message: string;
  };
};

export const EMPTY_ACTION_STATE: ActionState = {};

export function invalid(error: string, field?: string): ActionState {
  return field ? { error, fields: { [field]: error } } : { error };
}

export function invalidFrom(result: { error: string; field?: string }): ActionState {
  return invalid(result.error, result.field);
}

export function safeReturnTo(value: string, fallback: string): string {
  try {
    const parsed = new URL(value, "https://strongfoam.local");
    if (
      parsed.origin !== "https://strongfoam.local" ||
      !(
        parsed.pathname.startsWith("/app/") ||
        parsed.pathname === "/field" ||
        parsed.pathname.startsWith("/field/")
      )
    ) {
      return fallback;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
