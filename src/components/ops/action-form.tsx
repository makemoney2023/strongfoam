"use client";

import {
  createContext,
  useContext,
  type ComponentProps,
  type ReactNode,
} from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import {
  EMPTY_ACTION_STATE,
  type ActionState,
} from "@/lib/ops/action-result";
import { applyActionResult } from "@/lib/ops/apply-action-result";
import { cn } from "@/lib/utils";

export const ActionStateContext = createContext<ActionState>(EMPTY_ACTION_STATE);

export function useActionFormState(): ActionState {
  return useContext(ActionStateContext);
}

export function FieldError({ name }: { name: string }) {
  const state = useActionFormState();
  const message = state.fields?.[name];
  if (!message) return null;
  return (
    <p className="text-sm text-destructive" role="alert">
      {message}
    </p>
  );
}

export function FormError() {
  const state = useActionFormState();
  if (!state.error) return null;
  if (state.fields && Object.keys(state.fields).length > 0) return null;
  return (
    <p className="text-sm text-destructive" role="alert">
      {state.error}
    </p>
  );
}

export function ActionForm({
  action,
  className,
  children,
  ...props
}: Omit<ComponentProps<"form">, "action"> & {
  action: (formData: FormData) => Promise<ActionState | void>;
  children: ReactNode;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    async (_prev: ActionState, formData: FormData) => {
      const result = (await action(formData)) ?? EMPTY_ACTION_STATE;
      applyActionResult(result, router);
      return result;
    },
    EMPTY_ACTION_STATE,
  );

  return (
    <ActionStateContext.Provider value={state}>
      <form action={formAction} className={cn(className)} {...props} noValidate>
        <FormError />
        {children}
      </form>
    </ActionStateContext.Provider>
  );
}
