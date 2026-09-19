"use client";

import type { ReactNode } from "react";
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
 * containing a server-action form. The form's redirect closes the dialog.
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
  return (
    <Dialog defaultOpen={defaultOpen}>
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
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
