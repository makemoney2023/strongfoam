import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import type { CloudflareBindings } from "@/lib/cloudflare/platform";
import { runFollowupSteps, type FollowupParams } from "@/lib/ops/proposal-followups";

export class ProposalFollowupWorkflow extends WorkflowEntrypoint<CloudflareBindings> {
  async run(event: WorkflowEvent<FollowupParams>, step: WorkflowStep) {
    const params = event.payload;
    await runFollowupSteps(
      {
        sleep: (name, duration) => step.sleep(name, duration),
        do: (name, callback) => step.do(name, callback),
      },
      params,
      {
        isOpen: async (proposalId) => {
          const { proposalIsOpen } = await import("@/lib/ops/proposal-followup-store");
          return proposalIsOpen(proposalId);
        },
        saveDraft: async (draft) => {
          const { saveReviewDraft } = await import("@/lib/ops/proposal-followup-store");
          await saveReviewDraft(draft);
        },
      },
    );
  }
}
