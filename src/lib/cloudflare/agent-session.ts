import { getAgentByName } from "agents/routing";
import type { ChatMessage } from "@/lib/cloudflare/gateway";
import { isUuid } from "@/lib/ops/job-workspace";

export type AgentRecordKind = "job" | "opportunity" | "estimate" | "project";

export type AgentPurpose =
  | "summary"
  | "daily_report"
  | "commercial_proposal"
  | "scope_outline"
  | "revision_explanation"
  | "scope_lines"
  | "change_order"
  | "takeoff"
  | "closeout_packet"
  | "cost_variance"
  | "warranty";

export type AgentRunStatus = "running" | "completed" | "failed";

export type AgentRun = {
  runId: string;
  purpose: AgentPurpose;
  status: AgentRunStatus;
  updatedAt: string;
};

export type StrongfoamAgentState = { runs: AgentRun[] };

export type AgentDraftInput = {
  runId: string;
  purpose: AgentPurpose;
  model: string;
  messages: ChatMessage[];
  json?: boolean;
};

export type AgentDraftStub = {
  draft(input: AgentDraftInput): Promise<string>;
};

export type AgentNamespace = {
  idFromName(name: string): unknown;
  get(id: unknown, options?: unknown): unknown;
};

const MAX_RUNS = 20;

function uuid(value: string, label: string): string {
  const normalized = value.trim().toLowerCase();
  if (!isUuid(normalized)) throw new Error(`Agent ${label} must be a UUID.`);
  return normalized;
}

export function agentInstanceName(
  kind: AgentRecordKind,
  organizationId: string,
  recordId: string,
): string {
  return `org:${uuid(organizationId, "organization id")}:${kind}:${uuid(recordId, "record id")}`;
}

export function startAgentRun(
  state: StrongfoamAgentState,
  run: { runId: string; purpose: AgentPurpose; at: string },
): StrongfoamAgentState {
  const runs = [
    ...state.runs.filter((entry) => entry.runId !== run.runId),
    { runId: run.runId, purpose: run.purpose, status: "running" as const, updatedAt: run.at },
  ];
  return { runs: runs.slice(-MAX_RUNS) };
}

export function finishAgentRun(
  state: StrongfoamAgentState,
  runId: string,
  status: Exclude<AgentRunStatus, "running">,
  at: string,
): StrongfoamAgentState {
  return {
    runs: state.runs.map((entry) =>
      entry.runId === runId ? { ...entry, status, updatedAt: at } : entry,
    ),
  };
}

export async function namedAgent(
  binding: AgentNamespace,
  kind: AgentRecordKind,
  organizationId: string,
  recordId: string,
): Promise<AgentDraftStub> {
  const name = agentInstanceName(kind, organizationId, recordId);
  const stub = await getAgentByName(
    binding as unknown as Parameters<typeof getAgentByName>[0],
    name,
  );
  return stub as unknown as AgentDraftStub;
}
