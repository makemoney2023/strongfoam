import { voiceDraftsFromModel } from "@/lib/ops/voice-drafts";
import { photoDraftsFromModel, type PhotoContext } from "@/lib/ops/photo-caption";

const context: PhotoContext = {
  jobName: "Maple",
  scope: "Walls",
  areaNames: ["North"],
  areaIds: ["area-1"],
  taskTitle: "North wall",
};

export type FieldAiEvalReport = {
  passed: number;
  failed: number;
  failures: string[];
};

export function evaluateFieldAiGolden(): FieldAiEvalReport {
  const failures: string[] = [];
  const transcript = "Sprayed 40 bags on the north wall. The lift is down.";
  const voice = voiceDraftsFromModel(transcript, {
    cards: [
      { kind: "quantity", quote: "Sprayed 40 bags on the north wall.", quantity: 40, unit: "bags" },
      { kind: "quantity", quote: "Sprayed 90 bags.", quantity: 90, unit: "bags" },
      { kind: "blocker", quote: "The lift is down." },
    ],
  });
  if (voice.length !== 2) failures.push("voice split dropped or kept the wrong cards");
  if (voice.some((card) => card.quantity === 90)) failures.push("invented quantity survived");

  const certified = photoDraftsFromModel(
    { caption: "Certified thickness meets the spec and the work complies with code." },
    context,
  );
  if (certified.some((draft) => draft.kind === "caption")) {
    failures.push("certified caption was kept");
  }
  const visible = photoDraftsFromModel({ caption: "Studs are covered in the bay." }, context);
  if (!visible.some((draft) => draft.kind === "caption")) failures.push("visible caption was dropped");

  return { passed: failures.length === 0 ? 2 : 2 - failures.length, failed: failures.length, failures };
}
