"use client";

import { useRef, useState, type ReactNode } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  EMPTY_ACTION_STATE,
  type ActionState,
} from "@/lib/ops/action-result";
import { applyActionResult } from "@/lib/ops/apply-action-result";
import { ActionStateContext, FormError } from "@/components/ops/action-form";

/**
 * A server-action form that asks for confirmation in an AlertDialog.
 * Use for destructive actions so a stray tap cannot delete a record.
 */
export function ConfirmForm({
  action,
  title = "Are you sure?",
  message,
  confirmLabel = "Delete",
  className,
  children,
}: {
  action: (formData: FormData) => Promise<ActionState | void>;
  title?: string;
  message: string;
  confirmLabel?: string;
  className?: string;
  children: ReactNode;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const confirmed = useRef(false);
  const [open, setOpen] = useState(false);
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
      <form
        ref={formRef}
        action={formAction}
        className={className}
        onSubmit={(event) => {
          if (confirmed.current) {
            confirmed.current = false;
            return;
          }
          event.preventDefault();
          setOpen(true);
        }}
      >
        <FormError />
        {children}
      </form>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              variant="destructive"
              className="min-h-11 sm:min-h-8"
              onClick={() => {
                confirmed.current = true;
                setOpen(false);
                formRef.current?.requestSubmit();
              }}
            >
              {confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ActionStateContext.Provider>
  );
}
