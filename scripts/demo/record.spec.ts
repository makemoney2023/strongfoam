import { GOLDEN_PATH_URLS } from "@/lib/ops/golden-path";

export const goldenPathRecording = [
  { url: "/app/login", say: "Office login. admin@strongfoam.demo." },
  { url: GOLDEN_PATH_URLS.inbound, say: "Inbound mail. Triage kept Riverside Logistics, Cambridge, and the phone." },
  { url: GOLDEN_PATH_URLS.lead, say: "The estimate request is already on the board." },
  { url: GOLDEN_PATH_URLS.opportunity, say: "Won opportunity for the Cambridge warehouse." },
  { url: GOLDEN_PATH_URLS.estimate, say: "Cited bid draft. 2400 square feet stays on the document." },
  { url: GOLDEN_PATH_URLS.diff, say: "Version 2 moves the roof deck from 2400 to 2600 square feet." },
  { url: GOLDEN_PATH_URLS.project, say: "Accepted proposal is now a project." },
  { url: GOLDEN_PATH_URLS.schedule, say: "The roof deck is on the schedule." },
  { url: GOLDEN_PATH_URLS.job, say: "Closeout packet and the open east-wall deficiency." },
  { url: "/field/login", say: "Field login. field@strongfoam.demo." },
  { url: GOLDEN_PATH_URLS.field, say: "Today's only dispatch prefills the warehouse." },
  { url: GOLDEN_PATH_URLS.fieldJob, say: "Voice cards, photo caption, lot, gauge, arrival, and the daily report draft." },
  { url: GOLDEN_PATH_URLS.photoReport, say: "Photo report PDF from the confirmed caption." },
  { url: GOLDEN_PATH_URLS.automation, say: "Batch review. Confirm or dismiss. Nothing is sent." },
  { url: GOLDEN_PATH_URLS.home, say: "Morning digest. Stale Riverside lead and the pending drafts." },
] as const;
