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
  return value.startsWith("/app/") ? value.split("?")[0] : fallback;
}
