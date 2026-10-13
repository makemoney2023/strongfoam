import { CONSENT_LABEL } from "@/content/survey";
import type {
  DrawingsReady,
  ListedServiceId,
  ProjectType,
  Province,
  Role,
  Timeline,
} from "@/lib/leads/types";

export type IntakeBranch = "estimate" | "general";

export type SurveyFlowStep =
  | "branch"
  | "fit"
  | "location"
  | "notes"
  | "scope"
  | "project"
  | "files"
  | "contact"
  | "message";

export type SurveyAnswers = {
  intakeType?: IntakeBranch;
  message?: string;
  projectType?: ProjectType;
  city?: string;
  province?: Province;
  notes?: string;
  services?: ListedServiceId[];
  role?: Role;
  buildingType?: string;
  timeline?: Timeline;
  drawingsReady?: DrawingsReady;
  company?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  consent?: boolean;
  companyWebsite?: string;
  uploadPaths?: string[];
};

export type SurveyFlowState = {
  step: SurveyFlowStep;
  answers: SurveyAnswers;
};

const FULL_ESTIMATE: SurveyFlowStep[] = [
  "branch",
  "fit",
  "location",
  "scope",
  "project",
  "files",
  "contact",
];
const SHORT_ESTIMATE: SurveyFlowStep[] = [
  "branch",
  "fit",
  "location",
  "notes",
  "contact",
];
const GENERAL: SurveyFlowStep[] = ["branch", "contact", "message"];

const COPY: Record<
  SurveyFlowStep,
  { title: string; description: string; focusId: string }
> = {
  branch: {
    title: "What can we help with?",
    description: "Request a project estimate, or send a general question.",
    focusId: "intake-estimate",
  },
  fit: {
    title: "What kind of project is this?",
    description: "Commercial and multi-unit packages are the core of the work.",
    focusId: "project-commercial_ici",
  },
  location: {
    title: "Where is the building?",
    description: "Ontario ICI and multi-unit work is the primary coverage area.",
    focusId: "city",
  },
  notes: {
    title: "A few details",
    description: "Estimating will review fit. This path does not book a site visit.",
    focusId: "notes",
  },
  scope: {
    title: "Which scopes should estimating review?",
    description: "Select every trade that belongs in the package.",
    focusId: "service-spray-foam",
  },
  project: {
    title: "Project details",
    description: "Role, timing, and whether drawings are ready.",
    focusId: "company",
  },
  files: {
    title: "Drawings and specs",
    description: "Optional. PDF or images, up to five files.",
    focusId: "files",
  },
  contact: {
    title: "How should we reach you?",
    description: "We use this only to respond to this request.",
    focusId: "firstName",
  },
  message: {
    title: "What is your question?",
    description: "A short message is enough. Project details are not required.",
    focusId: "message",
  },
};

export function initialSurveyFlow(): SurveyFlowState {
  return { step: "branch", answers: {} };
}

export function surveyPath(answers: SurveyAnswers): SurveyFlowStep[] {
  if (answers.intakeType === "general") return GENERAL;
  if (answers.intakeType !== "estimate") return ["branch"];
  return answers.projectType === "residential_other" ? SHORT_ESTIMATE : FULL_ESTIMATE;
}

function issue(
  step: SurveyFlowStep,
  answers: SurveyAnswers,
): { message: string; focusId: string } | null {
  if (step === "branch" && !answers.intakeType) {
    return { message: "Choose an estimate or a general inquiry.", focusId: "intake-estimate" };
  }
  if (step === "fit" && !answers.projectType) {
    return { message: "Choose a project type.", focusId: "project-commercial_ici" };
  }
  if (step === "location") {
    if (!answers.city?.trim()) return { message: "Enter the city.", focusId: "city" };
    if (!answers.province) return { message: "Choose Ontario or outside Ontario.", focusId: "province-ON" };
  }
  if (step === "scope" && (answers.services?.length ?? 0) === 0) {
    return { message: "Select at least one scope.", focusId: "service-spray-foam" };
  }
  if (step === "project") {
    if (!answers.company?.trim()) return { message: "Enter the company name.", focusId: "company" };
    if (!answers.role) return { message: "Choose your role.", focusId: "role-gc" };
    if (!answers.timeline) return { message: "Choose a timeline.", focusId: "timeline-now_tendering" };
    if (!answers.drawingsReady) return { message: "Choose whether drawings are ready.", focusId: "drawings-yes" };
  }
  if (step === "contact") {
    if (!answers.firstName?.trim()) return { message: "Enter your first name.", focusId: "firstName" };
    if (!answers.lastName?.trim()) return { message: "Enter your last name.", focusId: "lastName" };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answers.email?.trim() ?? "")) {
      return { message: "Enter a valid email.", focusId: "email" };
    }
    if ((answers.phone?.trim().length ?? 0) < 7) {
      return { message: "Enter a phone number.", focusId: "phone" };
    }
    if (answers.consent !== true) return { message: "Consent is required.", focusId: "consent" };
  }
  if (step === "message" && !answers.message?.trim()) {
    return { message: "Enter your message.", focusId: "message" };
  }
  return null;
}

export function surveyView(state: SurveyFlowState) {
  const path = surveyPath(state.answers);
  const index = Math.max(0, path.indexOf(state.step));
  const problem = issue(state.step, state.answers);
  const copy = COPY[state.step];
  return {
    path,
    index,
    total: path.length,
    progress: Math.round(((index + 1) / path.length) * 100),
    title: copy.title,
    description: copy.description,
    focusId: problem?.focusId ?? copy.focusId,
    error: problem?.message ?? null,
    canContinue: problem === null,
    isLast: index === path.length - 1,
    consentLabel:
      state.answers.intakeType === "general"
        ? "I agree Strong Foam Insulation Inc. may use this information to respond to my inquiry."
        : CONSENT_LABEL,
  };
}

export function chooseIntake(
  state: SurveyFlowState,
  intakeType: IntakeBranch,
): SurveyFlowState {
  const answers = { ...state.answers, intakeType };
  const path = surveyPath(answers);
  return {
    answers,
    step: path.includes(state.step) ? state.step : "branch",
  };
}

export function patchSurvey(
  state: SurveyFlowState,
  patch: Partial<SurveyAnswers>,
): SurveyFlowState {
  return { ...state, answers: { ...state.answers, ...patch } };
}

export function continueSurvey(state: SurveyFlowState): {
  state: SurveyFlowState;
  submit: boolean;
} {
  if (issue(state.step, state.answers)) return { state, submit: false };
  const path = surveyPath(state.answers);
  const next = path[path.indexOf(state.step) + 1];
  if (!next) return { state, submit: true };
  return { state: { ...state, step: next }, submit: false };
}

export function backSurvey(state: SurveyFlowState): SurveyFlowState {
  const path = surveyPath(state.answers);
  const previous = path[path.indexOf(state.step) - 1];
  if (!previous) return state;
  return { ...state, step: previous };
}

export function restoreSurveyFlow(draft: {
  step: string;
  answers: Record<string, unknown>;
}): SurveyFlowState {
  const answers = { ...(draft.answers as SurveyAnswers) };
  if (!answers.intakeType && draft.step !== "branch") {
    answers.intakeType = "estimate";
  }
  const path = surveyPath(answers);
  const step = path.includes(draft.step as SurveyFlowStep)
    ? (draft.step as SurveyFlowStep)
    : (path[0] ?? "branch");
  return { step, answers };
}

export function surveyPayload(
  state: SurveyFlowState,
  meta: { startedAt: number; draftId: string },
) {
  const answers = state.answers;
  if (answers.intakeType === "general") {
    return {
      intakeType: "general" as const,
      message: answers.message?.trim() ?? "",
      company: answers.company?.trim() ?? "",
      firstName: answers.firstName?.trim() ?? "",
      lastName: answers.lastName?.trim() ?? "",
      email: answers.email?.trim() ?? "",
      phone: answers.phone?.trim() ?? "",
      consent: true as const,
      companyWebsite: answers.companyWebsite ?? "",
      startedAt: meta.startedAt,
      draftId: meta.draftId,
      uploadPaths: [] as string[],
    };
  }
  return {
    intakeType: "estimate" as const,
    projectType: answers.projectType,
    city: answers.city?.trim(),
    province: answers.province,
    notes: answers.notes ?? "",
    services:
      answers.projectType === "residential_other" ? [] : (answers.services ?? []),
    role: answers.role,
    buildingType: answers.buildingType ?? "",
    timeline: answers.timeline,
    drawingsReady: answers.drawingsReady,
    company: answers.company ?? "",
    firstName: answers.firstName?.trim(),
    lastName: answers.lastName?.trim(),
    email: answers.email?.trim(),
    phone: answers.phone?.trim(),
    consent: true as const,
    companyWebsite: answers.companyWebsite ?? "",
    startedAt: meta.startedAt,
    draftId: meta.draftId,
    uploadPaths: answers.uploadPaths ?? [],
  };
}
