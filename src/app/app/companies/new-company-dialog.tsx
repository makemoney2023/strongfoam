import { PlusIcon } from "lucide-react";
import { FormDialog } from "@/components/ops/form-dialog";
import { SubmitButton } from "@/components/ops/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCompany } from "./actions";

export function NewCompanyDialog({
  triggerVariant = "default",
  triggerLabel = "Add company",
  triggerClassName,
}: {
  triggerVariant?: "default" | "outline" | "secondary" | "ghost";
  triggerLabel?: string;
  triggerClassName?: string;
}) {
  return (
    <FormDialog
      triggerLabel={triggerLabel}
      triggerIcon={<PlusIcon aria-hidden="true" />}
      triggerVariant={triggerVariant}
      triggerClassName={triggerClassName}
      title="Add a company"
      description="Only the name is required. Contacts and sites can be added from the company page afterwards."
    >
      <form action={createCompany} className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="newCompany-name">
            Name <span aria-hidden="true">*</span>
          </Label>
          <Input id="newCompany-name" name="name" className="h-11" maxLength={160} required autoFocus />
        </div>
        <div className="space-y-2">
          <Label htmlFor="newCompany-email">Email</Label>
          <Input id="newCompany-email" name="email" type="email" className="h-11" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="newCompany-phone">Phone</Label>
          <Input id="newCompany-phone" name="phone" type="tel" className="h-11" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="newCompany-city">City</Label>
          <Input id="newCompany-city" name="city" className="h-11" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="newCompany-province">Province</Label>
          <Input id="newCompany-province" name="province" className="h-11" defaultValue="ON" />
        </div>
        <div className="sm:col-span-2">
          <SubmitButton variant="default" className="min-h-11 w-full sm:w-auto" pendingLabel="Creating company…">
            Create company
          </SubmitButton>
        </div>
      </form>
    </FormDialog>
  );
}
