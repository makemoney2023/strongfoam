"use client";

import { useState, type ReactNode } from "react";
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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type TriggerVariant = "default" | "outline" | "secondary" | "ghost" | "link";

/**
 * Progressive-disclosure wrapper: a labelled trigger button that opens a modal
 * containing a server-action form. Closing a dirty form asks for confirmation.
 */
export function FormDialog({
  triggerLabel,
  triggerIcon,
  triggerVariant = "default",
  triggerClassName,
  triggerAriaLabel,
  title,
  description,
  defaultOpen = false,
  contentClassName,
  children,
}: {
  triggerLabel: ReactNode;
  triggerIcon?: ReactNode;
  triggerVariant?: TriggerVariant;
  triggerClassName?: string;
  triggerAriaLabel?: string;
  title: string;
  description?: string;
  defaultOpen?: boolean;
  contentClassName?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [dirty, setDirty] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);

  function requestClose() {
    if (dirty) {
      setDiscardOpen(true);
      return;
    }
    setOpen(false);
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (next) {
            setOpen(true);
            return;
          }
          requestClose();
        }}
      >
        <DialogTrigger
          render={
            <Button
              variant={triggerVariant}
              className={cn("min-h-11 md:min-h-8", triggerClassName)}
              aria-label={triggerAriaLabel}
            />
          }
        >
          {triggerIcon}
          {triggerLabel}
        </DialogTrigger>
        <DialogContent
          className={cn(
            "max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg",
            contentClassName,
          )}
          onChange={() => setDirty(true)}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description ? <DialogDescription>{description}</DialogDescription> : null}
          </DialogHeader>
          {children}
        </DialogContent>
      </Dialog>
      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              Your edits in “{title}” will be lost if you close this form.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              variant="destructive"
              className="min-h-11 sm:min-h-8"
              onClick={() => {
                setDiscardOpen(false);
                setDirty(false);
                setOpen(false);
              }}
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
