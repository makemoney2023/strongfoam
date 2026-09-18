import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { convertWonWorkToProject } from "./actions";

export function ConvertWonWorkForm({
  opportunityId,
  returnTo,
  defaults,
}: {
  opportunityId: string;
  returnTo: string;
  defaults: {
    projectName: string;
    jobName: string;
    scope: string;
    projectManager?: string | null;
  };
}) {
  return (
    <form action={convertWonWorkToProject} className="mt-4 space-y-4">
      <input type="hidden" name="opportunityId" value={opportunityId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <p className="text-sm text-[color:var(--sf-ink)]/70">
        Create one project and the first field job. Additional jobs can be
        added from the project after conversion.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="projectName">Project name</Label>
          <Input
            id="projectName"
            name="projectName"
            defaultValue={defaults.projectName}
            className="h-11"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="jobName">First job</Label>
          <Input
            id="jobName"
            name="jobName"
            defaultValue={defaults.jobName}
            className="h-11"
            required
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="scope">Scope</Label>
          <Textarea id="scope" name="scope" rows={3} defaultValue={defaults.scope} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="projectManager">Project manager</Label>
          <Input
            id="projectManager"
            name="projectManager"
            defaultValue={defaults.projectManager ?? ""}
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="foreman">Foreman</Label>
          <Input id="foreman" name="foreman" className="h-11" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="plannedStartAt">Planned start</Label>
          <Input
            id="plannedStartAt"
            name="plannedStartAt"
            type="datetime-local"
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="plannedEndAt">Planned end</Label>
          <Input
            id="plannedEndAt"
            name="plannedEndAt"
            type="datetime-local"
            className="h-11"
          />
        </div>
      </div>
      <Button type="submit" className="h-11">
        Create project and job
      </Button>
    </form>
  );
}
