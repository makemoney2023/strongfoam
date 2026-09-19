"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ops/native-select";
import { FieldError } from "@/components/ops/action-form";

type CompanyOption = { id: string; name: string };
type ContactOption = { id: string; name: string; email: string };
type Match = { id: string; name: string; reason: string; email?: string };

export function CompanyLinkPicker({
  companies,
  matches,
  defaultLinkedId = "",
}: {
  companies: CompanyOption[];
  matches: Match[];
  defaultLinkedId?: string;
}) {
  const initialMode = defaultLinkedId ? "link" : matches.length > 0 ? "match" : "create";
  const [mode, setMode] = useState<"match" | "link" | "create">(
    initialMode === "link" && matches.some((match) => match.id === defaultLinkedId)
      ? "match"
      : initialMode === "link"
        ? "link"
        : initialMode,
  );
  const [matchId, setMatchId] = useState(matches[0]?.id ?? defaultLinkedId);
  const [linkedId, setLinkedId] = useState(
    defaultLinkedId && !matches.some((match) => match.id === defaultLinkedId)
      ? defaultLinkedId
      : "",
  );
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return companies;
    return companies.filter((company) => company.name.toLowerCase().includes(needle));
  }, [companies, query]);

  const selectedId = mode === "create" ? "" : mode === "match" ? matchId : linkedId;

  return (
    <fieldset className="space-y-3 sm:col-span-2">
      <legend className="text-sm font-medium">Company</legend>
      <p className="text-sm text-muted-foreground">
        Link this request to an existing company when a match is listed, or
        confirm that you want a new company.
      </p>
      <input type="hidden" name="linkCompanyId" value={selectedId} />
      {mode === "create" && matches.length > 0 ? (
        <input type="hidden" name="createNew" value="on" />
      ) : null}
      {matches.length > 0 ? (
        <div className="space-y-2 rounded-lg bg-muted/60 p-3">
          <p className="text-sm font-medium">Likely matches</p>
          {matches.map((match) => (
            <label key={match.id} className="flex min-h-11 items-start gap-2 text-sm">
              <input
                type="radio"
                name="companyDecision"
                className="mt-1"
                checked={mode === "match" && matchId === match.id}
                onChange={() => {
                  setMode("match");
                  setMatchId(match.id);
                }}
              />
              <span>
                <span className="font-medium">{match.name}</span>
                <span className="block text-muted-foreground">
                  Matches by {match.reason}
                </span>
              </span>
            </label>
          ))}
        </div>
      ) : null}
      <label className="flex min-h-11 items-start gap-2 text-sm">
        <input
          type="radio"
          name="companyDecision"
          className="mt-1"
          checked={mode === "link"}
          onChange={() => setMode("link")}
        />
        <span className="w-full space-y-2">
          <span className="font-medium">Link another company</span>
          <Input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setMode("link");
            }}
            placeholder="Filter companies"
            className="h-11"
          />
          <NativeSelect
            name="companyPicker"
            className="h-11"
            value={linkedId}
            onChange={(event) => {
              setLinkedId(event.target.value);
              setMode("link");
            }}
          >
            <option value="">Choose a company</option>
            {filtered.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </NativeSelect>
        </span>
      </label>
      <label className="flex min-h-11 items-start gap-2 text-sm">
        <input
          type="radio"
          name="companyDecision"
          className="mt-1"
          checked={mode === "create"}
          onChange={() => setMode("create")}
        />
        <span>
          <span className="font-medium">Create a new company</span>
          <span className="block text-muted-foreground">
            Use the name entered below. Confirm this if a listed match is a
            different business.
          </span>
        </span>
      </label>
      <FieldError name="linkCompanyId" />
    </fieldset>
  );
}

export function ContactLinkPicker({
  contacts,
  matches,
  defaultLinkedId = "",
}: {
  contacts: ContactOption[];
  matches: Match[];
  defaultLinkedId?: string;
}) {
  const [mode, setMode] = useState<"match" | "link" | "create">(
    matches.length > 0 ? "match" : defaultLinkedId ? "link" : "create",
  );
  const [matchId, setMatchId] = useState(matches[0]?.id ?? "");
  const [linkedId, setLinkedId] = useState(defaultLinkedId);
  const selectedId = mode === "create" ? "" : mode === "match" ? matchId : linkedId;

  return (
    <fieldset className="space-y-3 sm:col-span-2">
      <legend className="text-sm font-medium">Contact</legend>
      <input type="hidden" name="linkContactId" value={selectedId} />
      {mode === "create" && matches.length > 0 ? (
        <input type="hidden" name="createNew" value="on" />
      ) : null}
      {matches.length > 0 ? (
        <div className="space-y-2 rounded-lg bg-muted/60 p-3">
          <p className="text-sm font-medium">Likely matches</p>
          {matches.map((match) => (
            <label key={match.id} className="flex min-h-11 items-start gap-2 text-sm">
              <input
                type="radio"
                name="contactDecision"
                className="mt-1"
                checked={mode === "match" && matchId === match.id}
                onChange={() => {
                  setMode("match");
                  setMatchId(match.id);
                }}
              />
              <span>
                <span className="font-medium">{match.name}</span>
                <span className="block text-muted-foreground">
                  {match.email ? `${match.email} · ` : ""}
                  matches by {match.reason}
                </span>
              </span>
            </label>
          ))}
        </div>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="contact-link-select">Link another contact</Label>
        <NativeSelect
          id="contact-link-select"
          className="h-11"
          value={mode === "link" ? linkedId : ""}
          onChange={(event) => {
            setLinkedId(event.target.value);
            setMode(event.target.value ? "link" : "create");
          }}
        >
          <option value="">Create a new contact</option>
          {contacts.map((contact) => (
            <option key={contact.id} value={contact.id}>
              {contact.name} · {contact.email}
            </option>
          ))}
        </NativeSelect>
      </div>
      <FieldError name="linkContactId" />
    </fieldset>
  );
}
