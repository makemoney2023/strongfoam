import { describe, expect, it } from "vitest";
import {
  backSurvey,
  chooseIntake,
  continueSurvey,
  initialSurveyFlow,
  patchSurvey,
  restoreSurveyFlow,
  surveyPayload,
  surveyView,
} from "@/components/estimate-survey/survey-flow";

const meta = {
  startedAt: 1_700_000_000_000,
  draftId: "11111111-1111-4111-8111-111111111111",
};

describe("survey flow", () => {
  it("starts on the intake branch", () => {
    const view = surveyView(initialSurveyFlow());
    expect(view.path).toEqual(["branch"]);
    expect(view.progress).toBe(100);
    expect(view.error).toMatch(/estimate or a general inquiry/i);
    expect(view.focusId).toBe("intake-estimate");
  });

  it("walks a complete commercial estimate", () => {
    let state = chooseIntake(initialSurveyFlow(), "estimate");
    state = continueSurvey(state).state;
    state = patchSurvey(state, { projectType: "commercial_ici" });
    state = continueSurvey(state).state;
    state = patchSurvey(state, { city: "Kitchener", province: "ON" });
    state = continueSurvey(state).state;
    state = patchSurvey(state, { services: ["spray-foam"] });
    state = continueSurvey(state).state;
    state = patchSurvey(state, {
      company: "Acme",
      role: "gc",
      timeline: "0_3_months",
      drawingsReady: "no",
    });
    state = continueSurvey(state).state;
    state = continueSurvey(state).state;
    state = patchSurvey(state, {
      firstName: "Alex",
      lastName: "Lee",
      email: "alex@gc.example",
      phone: "519-555-0100",
      consent: true,
    });
    const submitted = continueSurvey(state);

    expect(surveyView(state).path).toEqual([
      "branch",
      "fit",
      "location",
      "scope",
      "project",
      "files",
      "contact",
    ]);
    expect(submitted.submit).toBe(true);
    expect(surveyPayload(state, meta)).toMatchObject({
      intakeType: "estimate",
      projectType: "commercial_ici",
      city: "Kitchener",
      services: ["spray-foam"],
      company: "Acme",
      draftId: meta.draftId,
    });
  });

  it("keeps a general inquiry to contact and message", () => {
    let state = chooseIntake(initialSurveyFlow(), "general");
    expect(surveyView(state).path).toEqual(["branch", "contact", "message"]);
    expect(surveyView(state).progress).toBe(33);
    state = continueSurvey(state).state;
    state = patchSurvey(state, {
      firstName: "Alex",
      lastName: "Lee",
      email: "alex@example.com",
      phone: "519-555-0100",
      consent: true,
    });
    state = continueSurvey(state).state;
    expect(surveyView(state).canContinue).toBe(false);
    state = patchSurvey(state, { message: "  Partnership question  ", company: " Example Co " });
    const submitted = continueSurvey(state);

    expect(submitted.submit).toBe(true);
    expect(surveyPayload(state, meta)).toEqual({
      intakeType: "general",
      message: "Partnership question",
      company: "Example Co",
      firstName: "Alex",
      lastName: "Lee",
      email: "alex@example.com",
      phone: "519-555-0100",
      consent: true,
      companyWebsite: "",
      startedAt: meta.startedAt,
      draftId: meta.draftId,
      uploadPaths: [],
    });
  });

  it("switches branches without keeping the other path's current step", () => {
    let state = chooseIntake(initialSurveyFlow(), "estimate");
    state = continueSurvey(state).state;
    expect(state.step).toBe("fit");
    state = chooseIntake(state, "general");
    expect(state.step).toBe("branch");
    expect(surveyView(state).path).toEqual(["branch", "contact", "message"]);
    state = backSurvey(continueSurvey(state).state);
    expect(state.step).toBe("branch");
  });

  it("restores an older estimate draft and a general draft on its own step", () => {
    expect(
      restoreSurveyFlow({
        step: "scope",
        answers: { projectType: "industrial", services: ["fireproofing"] },
      }),
    ).toMatchObject({
      step: "scope",
      answers: { intakeType: "estimate", projectType: "industrial" },
    });
    expect(
      restoreSurveyFlow({
        step: "message",
        answers: { intakeType: "general", message: "Hello" },
      }).step,
    ).toBe("message");
  });
});
