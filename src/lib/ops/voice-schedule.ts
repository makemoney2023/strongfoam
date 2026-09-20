import { after } from "next/server";
import { revalidatePath } from "next/cache";

export function scheduleVoiceTranscription(args: {
  jobId: string;
  voiceNoteId: string;
}): void {
  after(async () => {
    const { processJobVoiceTranscription } = await import("@/lib/ops/store");
    try {
      await processJobVoiceTranscription(args.voiceNoteId);
    } catch (error) {
      console.error("Voice transcription failed.", error);
    }
    revalidatePath(`/app/jobs/${args.jobId}`);
    revalidatePath(`/app/field/jobs/${args.jobId}`);
    revalidatePath(`/field/jobs/${args.jobId}`);
    revalidatePath(`/field/jobs/${args.jobId}/plan`);
    revalidatePath(`/app/jobs/${args.jobId}/plan`);
  });
}
