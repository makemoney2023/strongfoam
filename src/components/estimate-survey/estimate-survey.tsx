"use client";

import { uploadPrivateFile } from "@/lib/cloudflare/upload-client";
import { useEffect, useMemo, useState } from "react";
import {
  CONSENT_LABEL,
  DRAWINGS_OPTIONS,
  DRAFT_STORAGE_KEY,
  FIT_OPTIONS,
  PROVINCE_OPTIONS,
  ROLE_OPTIONS,
  SCOPE_OPTIONS,
  TIMELINE_OPTIONS,
} from "@/content/survey";
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
import { nextSurveyStep, type SurveyStep } from "@/lib/leads/graph";
import type {
  DrawingsReady,
  ListedServiceId,
  ProjectType,
  Province,
  Role,
  Timeline,
} from "@/lib/leads/types";
import { MAX_UPLOAD_FILES } from "@/lib/leads/uploads";
import { createBrowserUuid } from "@/lib/browser-id";
import { cn } from "@/lib/utils";

type Answers = {
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

const STEP_COPY: Record<SurveyStep, { title: string; description: string }> = {
  fit: {
    title: "What kind of project is this?",
    description: "Commercial and multi-unit packages are the core of the work.",
  },
  location: {
    title: "Where is the building?",
    description: "Ontario ICI and multi-unit work is the primary coverage area.",
  },
  notes: {
    title: "A few details",
    description: "Estimating will review fit. This path does not book a site visit.",
  },
  scope: {
    title: "Which scopes should estimating review?",
    description: "Select every trade that belongs in the package.",
  },
  project: {
    title: "Project details",
    description: "Role, timing, and whether drawings are ready.",
  },
  files: {
    title: "Drawings and specs",
    description: "Optional. PDF or images, up to five files.",
  },
  contact: {
    title: "How should estimating reach you?",
    description: "We use this only to respond to the estimate request.",
  },
};

function pathFor(projectType?: ProjectType): SurveyStep[] {
  if (projectType === "residential_other") {
    return ["fit", "location", "notes", "contact"];
  }
  if (projectType) {
    return ["fit", "location", "scope", "project", "files", "contact"];
  }
  return ["fit", "location", "scope", "project", "files", "contact"];
}

function canAdvance(step: SurveyStep, answers: Answers): boolean {
  if (step === "fit") return Boolean(answers.projectType);
  if (step === "location") {
    return Boolean(answers.city?.trim() && answers.province);
  }
  if (step === "notes") return true;
  if (step === "scope") return (answers.services?.length ?? 0) > 0;
  if (step === "project") {
    return Boolean(
      answers.role &&
        answers.timeline &&
        answers.drawingsReady &&
        answers.company?.trim(),
    );
  }
  if (step === "files") return true;
  return Boolean(
    answers.firstName?.trim() &&
      answers.lastName?.trim() &&
      answers.email?.trim() &&
      answers.phone?.trim() &&
      answers.consent === true,
  );
}

function ChoiceButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
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
  const [step, setStep] = useState<SurveyStep>("fit");
  const [answers, setAnswers] = useState<Answers>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const existing = parseSurveyDraft(localStorage.getItem(DRAFT_STORAGE_KEY));
      if (existing) {
        setDraftId(existing.draftId);
        setStartedAt(existing.startedAt);
        setStep(existing.step);
        setAnswers(existing.answers as Answers);
      } else {
        const id = createBrowserUuid();
        const started = Date.now();
        setDraftId(id);
        setStartedAt(started);
        setStep("fit");
        setAnswers({});
        localStorage.setItem(
          DRAFT_STORAGE_KEY,
          serializeSurveyDraft({
            version: 1,
            startedAt: started,
            draftId: id,
            step: "fit",
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
        step,
        answers,
      }),
    );
  }, [ready, draftId, startedAt, step, answers]);

  const path = useMemo(() => pathFor(answers.projectType), [answers.projectType]);
  const stepIndex = Math.max(0, path.indexOf(step));
  const progressValue = Math.round(((stepIndex + 1) / path.length) * 100);
  const copy = STEP_COPY[step];

  function patch(next: Partial<Answers>) {
    setAnswers((current) => ({ ...current, ...next }));
  }

  function goNext() {
    if (!canAdvance(step, answers) || uploading) return;
    const next = nextSurveyStep(step, answers.projectType);
    if (next === "submit") {
      void submit();
      return;
    }
    setStep(next);
  }

  async function submit() {
    setError(null);
    setBusy(true);
    const payload = {
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
      consent: true,
      companyWebsite: answers.companyWebsite ?? "",
      startedAt,
      draftId,
      uploadPaths: answers.uploadPaths ?? [],
    };

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
      <p className="section-kicker mb-3">Request an estimate</p>
      <h1 className="font-heading mb-8 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
        Tell estimating about the package
      </h1>
      <Card className="bg-[color:var(--sf-concrete)]">
        <CardHeader>
          <Progress value={progressValue} className="mb-4">
            <span className="text-xs text-white/55">
              Step {stepIndex + 1} of {path.length}
            </span>
          </Progress>
          <CardTitle>{copy.title}</CardTitle>
          <CardDescription>{copy.description}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {step === "fit" ? (
            <div className="grid gap-2">
              {FIT_OPTIONS.map((option) => (
                <ChoiceButton
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
                  checked={answers.consent === true}
                  onCheckedChange={(checked) => patch({ consent: checked === true })}
                />
                <span>{CONSENT_LABEL}</span>
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

          {error ? <p className="text-sm text-[color:var(--sf-red)]">{error}</p> : null}
        </CardContent>
        <CardFooter className="justify-between gap-3">
          <button
            type="button"
            className={cn(buttonVariants({ variant: "ghost" }), "text-white/70")}
            disabled={step === "fit" || busy}
            onClick={() => {
              const previous = path[stepIndex - 1];
              if (previous) setStep(previous);
            }}
          >
            Back
          </button>
          <Button
            type="button"
            disabled={!canAdvance(step, answers) || busy || uploading}
            onClick={goNext}
            className="bg-[color:var(--sf-cyan)] text-[color:var(--sf-ink)] hover:bg-[color:var(--sf-cyan)]/90"
          >
            {step === "contact" ? (busy ? "Sending…" : "Send request") : "Continue"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
