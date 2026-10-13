"use client";

import { uploadPrivateFile } from "@/lib/cloudflare/upload-client";
import { useEffect, useMemo, useState } from "react";
import {
  DRAWINGS_OPTIONS,
  DRAFT_STORAGE_KEY,
  FIT_OPTIONS,
  PROVINCE_OPTIONS,
  ROLE_OPTIONS,
  SCOPE_OPTIONS,
  TIMELINE_OPTIONS,
} from "@/content/survey";
import {
  backSurvey,
  chooseIntake,
  continueSurvey,
  initialSurveyFlow,
  patchSurvey,
  restoreSurveyFlow,
  surveyPayload,
  surveyView,
  type SurveyAnswers,
  type SurveyFlowState,
} from "@/components/estimate-survey/survey-flow";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { parseSurveyDraft, serializeSurveyDraft } from "@/lib/leads/draft";
import type { ListedServiceId } from "@/lib/leads/types";
import { MAX_UPLOAD_FILES } from "@/lib/leads/uploads";
import { createBrowserUuid } from "@/lib/browser-id";
import { cn } from "@/lib/utils";

function ChoiceButton({
  id,
  selected,
  onClick,
  children,
}: {
  id?: string;
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border px-3 py-3 text-left text-sm transition-colors",
        selected
          ? "border-[color:var(--sf-cyan)] bg-[color:var(--sf-cyan)]/15 text-white"
          : "border-white/15 bg-transparent text-white/80 hover:border-white/40",
      )}
    >
      {children}
    </button>
  );
}

export function EstimateSurvey() {
  const [ready, setReady] = useState(false);
  const [draftId, setDraftId] = useState("");
  const [startedAt, setStartedAt] = useState(0);
  const [flow, setFlow] = useState<SurveyFlowState>(initialSurveyFlow);
  const [attempted, setAttempted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const existing = parseSurveyDraft(localStorage.getItem(DRAFT_STORAGE_KEY));
      if (existing) {
        setDraftId(existing.draftId);
        setStartedAt(existing.startedAt);
        setFlow(restoreSurveyFlow(existing));
      } else {
        const id = createBrowserUuid();
        const started = Date.now();
        setDraftId(id);
        setStartedAt(started);
        setFlow(initialSurveyFlow());
        localStorage.setItem(
          DRAFT_STORAGE_KEY,
          serializeSurveyDraft({
            version: 1,
            startedAt: started,
            draftId: id,
            step: "branch",
            answers: {},
          }),
        );
      }
      setReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!ready || !draftId) return;
    localStorage.setItem(
      DRAFT_STORAGE_KEY,
      serializeSurveyDraft({
        version: 1,
        startedAt,
        draftId,
        step: flow.step,
        answers: flow.answers,
      }),
    );
  }, [ready, draftId, startedAt, flow]);

  const view = useMemo(() => surveyView(flow), [flow]);
  const answers: SurveyAnswers = flow.answers;
  const step = flow.step;

  function patch(next: Partial<SurveyAnswers>) {
    setAttempted(false);
    setFlow((current) => patchSurvey(current, next));
  }

  function goNext() {
    if (uploading) return;
    const result = continueSurvey(flow);
    if (!result.submit && result.state === flow) {
      setAttempted(true);
      document.getElementById(view.focusId)?.focus();
      return;
    }
    setAttempted(false);
    if (result.submit) {
      void submit();
      return;
    }
    setFlow(result.state);
  }

  async function submit() {
    setError(null);
    setBusy(true);
    const payload = surveyPayload(flow, { startedAt, draftId });

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("failed");
      const data = (await response.json()) as { thanksPath?: string };
      if (!data.thanksPath) throw new Error("failed");
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      window.location.assign(data.thanksPath);
    } catch {
      setError("Could not send. Retry.");
      setBusy(false);
    }
  }

  async function onFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const remaining = MAX_UPLOAD_FILES - (answers.uploadPaths?.length ?? 0);
    const files = [...fileList].slice(0, Math.max(0, remaining));
    if (files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        const safeName = file.name.replace(/[^\w.\-]+/g, "_");
        const result = await uploadPrivateFile(`leads/${draftId}/${safeName}`, file, {
          handleUploadUrl: "/api/uploads",
          clientPayload: JSON.stringify({ draftId }),
        });
        uploaded.push(result.pathname);
      }
      patch({ uploadPaths: [...(answers.uploadPaths ?? []), ...uploaded] });
    } catch {
      setError("Could not upload files. Retry.");
    } finally {
      setUploading(false);
    }
  }

  if (!ready) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-28">
        <p className="text-sm text-white/60">Loading survey…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-28">
      <p className="section-kicker mb-3">Project estimate</p>
      <h2 className="font-heading mb-8 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
        Tell estimating about the package
      </h2>
      <Card className="bg-[color:var(--sf-concrete)]">
        <CardHeader>
          <Progress value={view.progress} className="mb-4">
            <span className="text-xs text-white/55">
              Step {view.index + 1} of {view.total}
            </span>
          </Progress>
          <CardTitle>{view.title}</CardTitle>
          <CardDescription>{view.description}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {step === "branch" ? (
            <div className="grid gap-2">
              <ChoiceButton
                id="intake-estimate"
                selected={answers.intakeType === "estimate"}
                onClick={() => setFlow((current) => chooseIntake(current, "estimate"))}
              >
                Project estimate
              </ChoiceButton>
              <ChoiceButton
                id="intake-general"
                selected={answers.intakeType === "general"}
                onClick={() => setFlow((current) => chooseIntake(current, "general"))}
              >
                General inquiry
              </ChoiceButton>
            </div>
          ) : null}

          {step === "fit" ? (
            <div className="grid gap-2">
              {FIT_OPTIONS.map((option) => (
                <ChoiceButton
                  id={`project-${option.value}`}
                  key={option.value}
                  selected={answers.projectType === option.value}
                  onClick={() => patch({ projectType: option.value })}
                >
                  {option.label}
                </ChoiceButton>
              ))}
            </div>
          ) : null}

          {step === "location" ? (
            <>
              <div className="grid gap-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={answers.city ?? ""}
                  onChange={(event) => patch({ city: event.target.value })}
                  autoComplete="address-level2"
                />
              </div>
              <div className="grid gap-2">
                {PROVINCE_OPTIONS.map((option) => (
                  <ChoiceButton
                    id={`province-${option.value}`}
                    key={option.value}
                    selected={answers.province === option.value}
                    onClick={() => patch({ province: option.value })}
                  >
                    {option.label}
                  </ChoiceButton>
                ))}
              </div>
            </>
          ) : null}

          {step === "notes" ? (
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={answers.notes ?? ""}
                onChange={(event) => patch({ notes: event.target.value })}
                maxLength={2000}
              />
            </div>
          ) : null}

          {step === "scope" ? (
            <div className="grid gap-2">
              {SCOPE_OPTIONS.map((option) => {
                const selected = answers.services?.includes(option.value) ?? false;
                return (
                  <ChoiceButton
                    id={`service-${option.value}`}
                    key={option.value}
                    selected={selected}
                    onClick={() => {
                      const current = answers.services ?? [];
                      patch({
                        services: selected
                          ? current.filter((id) => id !== option.value)
                          : [...current, option.value],
                      });
                    }}
                  >
                    <span className="block font-medium">{option.title}</span>
                    <span className="mt-1 block text-xs text-white/60">
                      {option.overlay}
                    </span>
                  </ChoiceButton>
                );
              })}
            </div>
          ) : null}

          {step === "project" ? (
            <>
              <div className="grid gap-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={answers.company ?? ""}
                  onChange={(event) => patch({ company: event.target.value })}
                  autoComplete="organization"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="buildingType">Building type (optional)</Label>
                <Input
                  id="buildingType"
                  value={answers.buildingType ?? ""}
                  onChange={(event) => patch({ buildingType: event.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <p className="text-sm font-medium">Your role</p>
                {ROLE_OPTIONS.map((option) => (
                  <ChoiceButton
                    id={`role-${option.value}`}
                    key={option.value}
                    selected={answers.role === option.value}
                    onClick={() => patch({ role: option.value })}
                  >
                    {option.label}
                  </ChoiceButton>
                ))}
              </div>
              <div className="grid gap-2">
                <p className="text-sm font-medium">Timeline</p>
                {TIMELINE_OPTIONS.map((option) => (
                  <ChoiceButton
                    id={`timeline-${option.value}`}
                    key={option.value}
                    selected={answers.timeline === option.value}
                    onClick={() => patch({ timeline: option.value })}
                  >
                    {option.label}
                  </ChoiceButton>
                ))}
              </div>
              <div className="grid gap-2">
                <p className="text-sm font-medium">Drawings</p>
                {DRAWINGS_OPTIONS.map((option) => (
                  <ChoiceButton
                    id={`drawings-${option.value}`}
                    key={option.value}
                    selected={answers.drawingsReady === option.value}
                    onClick={() => patch({ drawingsReady: option.value })}
                  >
                    {option.label}
                  </ChoiceButton>
                ))}
              </div>
            </>
          ) : null}

          {step === "files" ? (
            <div className="grid gap-3">
              <Input
                id="files"
                type="file"
                multiple
                accept=".pdf,image/jpeg,image/png,image/webp"
                disabled={uploading || (answers.uploadPaths?.length ?? 0) >= MAX_UPLOAD_FILES}
                onChange={(event) => {
                  void onFiles(event.target.files);
                  event.target.value = "";
                }}
              />
              {uploading ? (
                <p className="text-sm text-white/60">Uploading…</p>
              ) : null}
              {(answers.uploadPaths ?? []).map((path) => (
                <p key={path} className="truncate text-xs text-white/55">
                  {path}
                </p>
              ))}
            </div>
          ) : null}

          {step === "contact" ? (
            <>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="firstName">First name</Label>
                  <Input
                    id="firstName"
                    value={answers.firstName ?? ""}
                    onChange={(event) => patch({ firstName: event.target.value })}
                    autoComplete="given-name"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input
                    id="lastName"
                    value={answers.lastName ?? ""}
                    onChange={(event) => patch({ lastName: event.target.value })}
                    autoComplete="family-name"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={answers.email ?? ""}
                  onChange={(event) => patch({ email: event.target.value })}
                  autoComplete="email"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={answers.phone ?? ""}
                  onChange={(event) => patch({ phone: event.target.value })}
                  autoComplete="tel"
                />
              </div>
              <label className="flex items-start gap-3 text-sm leading-snug">
                <Checkbox
                  id="consent"
                  checked={answers.consent === true}
                  onCheckedChange={(checked) => patch({ consent: checked === true })}
                />
                <span>{view.consentLabel}</span>
              </label>
              <input
                type="text"
                name="companyWebsite"
                tabIndex={-1}
                autoComplete="off"
                value={answers.companyWebsite ?? ""}
                onChange={(event) => patch({ companyWebsite: event.target.value })}
                className="sr-only"
                aria-hidden="true"
              />
            </>
          ) : null}

          {step === "message" ? (
            <>
              <div className="grid gap-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={answers.message ?? ""}
                  onChange={(event) => patch({ message: event.target.value })}
                  maxLength={2000}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="company">Company (optional)</Label>
                <Input
                  id="inquiry-company"
                  value={answers.company ?? ""}
                  onChange={(event) => patch({ company: event.target.value })}
                  autoComplete="organization"
                />
              </div>
            </>
          ) : null}

          {attempted && view.error ? (
            <p id="survey-error" className="text-sm text-[color:var(--sf-red)]">
              {view.error}
            </p>
          ) : null}
          {error ? <p className="text-sm text-[color:var(--sf-red)]">{error}</p> : null}
        </CardContent>
        <CardFooter className="justify-between gap-3">
          <button
            type="button"
            className={cn(buttonVariants({ variant: "ghost" }), "text-white/70")}
            disabled={view.index === 0 || busy}
            onClick={() => {
              setAttempted(false);
              setFlow((current) => backSurvey(current));
            }}
          >
            Back
          </button>
          <Button
            type="button"
            disabled={busy || uploading}
            onClick={goNext}
            className="bg-[color:var(--sf-cyan)] text-[color:var(--sf-ink)] hover:bg-[color:var(--sf-cyan)]/90"
          >
            {view.isLast ? (busy ? "Sending…" : "Send request") : "Continue"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
