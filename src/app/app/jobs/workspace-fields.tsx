import { FieldError } from "@/components/ops/action-form";
import { NativeSelect } from "@/components/ops/native-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  FIELD_NOTE_KINDS,
  FIELD_NOTE_LABELS,
  FIELD_QUANTITY_LABELS,
  FIELD_QUANTITY_UNITS,
} from "@/lib/ops/field-workspace";
import { STATED_QUANTITY_UNITS } from "@/lib/ops/quantity-pace";
import {
  JOB_DOCUMENT_KINDS,
  JOB_DOCUMENT_LABELS,
  WORK_AREA_KINDS,
  WORK_AREA_LABELS,
} from "@/lib/ops/job-workspace";

type Option = { id: string; name: string };

export function WorkAreaFields({
  idPrefix,
  defaults = {},
}: {
  idPrefix: string;
  defaults?: { name?: string; kind?: string; notes?: string | null };
}) {
  const id = (field: string) => `${idPrefix}-${field}`;
  return (
    <>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={id("name")}>
          Name <span aria-hidden="true">*</span>
        </Label>
        <Input
          id={id("name")}
          name="name"
          className="h-11"
          defaultValue={defaults.name ?? ""}
          maxLength={160}
          placeholder="Level 2, Unit 304, Roof deck…"
          required
        />
        <FieldError name="name" />
      </div>
      <div className="space-y-2">
        <Label htmlFor={id("kind")}>Type</Label>
        <NativeSelect id={id("kind")} name="kind" defaultValue={defaults.kind ?? "area"} className="h-11">
          {WORK_AREA_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {WORK_AREA_LABELS[kind]}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={id("notes")}>Notes</Label>
        <Textarea
          id={id("notes")}
          name="notes"
          rows={2}
          maxLength={2000}
          defaultValue={defaults.notes ?? ""}
        />
      </div>
    </>
  );
}

export function TaskFields({
  idPrefix,
  areas,
  fieldUsers = [],
  defaults = {},
}: {
  idPrefix: string;
  areas: Option[];
  fieldUsers?: Array<{ id: string; name: string }>;
  defaults?: {
    title?: string;
    assignee?: string | null;
    assigneeUserId?: string | null;
    dueAt?: string;
    plannedStartAt?: string;
    plannedEndAt?: string;
    workAreaId?: string | null;
    statedQuantity?: number | null;
    statedUnit?: string | null;
  };
}) {
  const id = (field: string) => `${idPrefix}-${field}`;
  return (
    <>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={id("title")}>
          Task <span aria-hidden="true">*</span>
        </Label>
        <Input
          id={id("title")}
          name="title"
          className="h-11"
          defaultValue={defaults.title ?? ""}
          maxLength={160}
          required
        />
        <FieldError name="title" />
      </div>
      <div className="space-y-2">
        <Label htmlFor={id(fieldUsers.length > 0 ? "assigneeUserId" : "assignee")}>
          Field worker
        </Label>
        {fieldUsers.length > 0 ? (
          <NativeSelect
            id={id("assigneeUserId")}
            name="assigneeUserId"
            defaultValue={defaults.assigneeUserId ?? ""}
            className="h-11"
          >
            <option value="">Unassigned</option>
            {fieldUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </NativeSelect>
        ) : (
          <Input
            id={id("assignee")}
            name="assignee"
            className="h-11"
            defaultValue={defaults.assignee ?? ""}
            maxLength={160}
          />
        )}
        <FieldError name="assigneeUserId" />
      </div>
      <div className="space-y-2">
        <Label htmlFor={id("dueAt")}>Due</Label>
        <Input
          id={id("dueAt")}
          name="dueAt"
          type="datetime-local"
          className="h-11"
          defaultValue={defaults.dueAt ?? ""}
        />
        <FieldError name="dueAt" />
      </div>
      <div className="space-y-2">
        <Label htmlFor={id("plannedStartAt")}>Planned start</Label>
        <Input
          id={id("plannedStartAt")}
          name="plannedStartAt"
          type="datetime-local"
          className="h-11"
          defaultValue={defaults.plannedStartAt ?? ""}
        />
        <FieldError name="plannedStartAt" />
      </div>
      <div className="space-y-2">
        <Label htmlFor={id("plannedEndAt")}>Planned completion</Label>
        <Input
          id={id("plannedEndAt")}
          name="plannedEndAt"
          type="datetime-local"
          className="h-11"
          defaultValue={defaults.plannedEndAt ?? ""}
        />
        <FieldError name="plannedEndAt" />
      </div>
      <div className="space-y-2">
        <Label htmlFor={id("statedQuantity")}>Stated quantity</Label>
        <Input
          id={id("statedQuantity")}
          name="statedQuantity"
          type="number"
          min={1}
          step={1}
          inputMode="numeric"
          className="h-11"
          defaultValue={defaults.statedQuantity ?? ""}
          placeholder="Bags or square feet still to install"
        />
        <FieldError name="statedQuantity" />
      </div>
      <div className="space-y-2">
        <Label htmlFor={id("statedUnit")}>Quantity unit</Label>
        <NativeSelect
          id={id("statedUnit")}
          name="statedUnit"
          defaultValue={defaults.statedUnit ?? ""}
          className="h-11"
        >
          <option value="">None</option>
          {STATED_QUANTITY_UNITS.map((unit) => (
            <option key={unit} value={unit}>
              {unit === "bags" ? "Bags" : "Square feet"}
            </option>
          ))}
        </NativeSelect>
        <FieldError name="statedUnit" />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={id("workAreaId")}>Work area</Label>
        <NativeSelect
          id={id("workAreaId")}
          name="workAreaId"
          defaultValue={defaults.workAreaId ?? ""}
          className="h-11"
        >
          <option value="">Whole job</option>
          {areas.map((area) => (
            <option key={area.id} value={area.id}>
              {area.name}
            </option>
          ))}
        </NativeSelect>
      </div>
    </>
  );
}

export function DocumentMetaFields({
  idPrefix,
  areas,
  defaults = {},
  allowPlan = true,
}: {
  idPrefix: string;
  areas: Option[];
  defaults?: { kind?: string; workAreaId?: string | null };
  allowPlan?: boolean;
}) {
  const id = (field: string) => `${idPrefix}-${field}`;
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={id("kind")}>Document type</Label>
        <NativeSelect id={id("kind")} name="kind" defaultValue={defaults.kind ?? "plan"} className="h-11">
          {JOB_DOCUMENT_KINDS.filter(
            (kind) => allowPlan || kind !== "plan",
          ).map((kind) => (
            <option key={kind} value={kind}>
              {JOB_DOCUMENT_LABELS[kind]}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-2">
        <Label htmlFor={id("workAreaId")}>Work area</Label>
        <NativeSelect
          id={id("workAreaId")}
          name="workAreaId"
          defaultValue={defaults.workAreaId ?? ""}
          className="h-11"
        >
          <option value="">Whole job</option>
          {areas.map((area) => (
            <option key={area.id} value={area.id}>
              {area.name}
            </option>
          ))}
        </NativeSelect>
      </div>
    </>
  );
}

export function FieldEntryFields({
  idPrefix,
  areas,
  tasks,
  defaults = {},
}: {
  idPrefix: string;
  areas: Option[];
  tasks: Array<{ id: string; title: string }>;
  defaults?: {
    kind?: string;
    quantity?: string;
    unit?: string | null;
    workAreaId?: string | null;
    taskId?: string | null;
    body?: string;
  };
}) {
  const id = (field: string) => `${idPrefix}-${field}`;
  return (
    <>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={id("kind")}>
          Entry type <span aria-hidden="true">*</span>
        </Label>
        <NativeSelect id={id("kind")} name="kind" defaultValue={defaults.kind ?? "note"} className="h-11">
          {FIELD_NOTE_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {FIELD_NOTE_LABELS[kind]}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-2">
        <Label htmlFor={id("quantity")}>Quantity</Label>
        <Input
          id={id("quantity")}
          name="quantity"
          inputMode="decimal"
          className="h-11"
          defaultValue={defaults.quantity ?? ""}
          placeholder="Optional, except on a quantity entry"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={id("unit")}>Unit</Label>
        <NativeSelect
          id={id("unit")}
          name="unit"
          defaultValue={defaults.unit ?? "board_feet"}
          className="h-11"
        >
          {FIELD_QUANTITY_UNITS.map((unit) => (
            <option key={unit} value={unit}>
              {FIELD_QUANTITY_LABELS[unit]}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-2">
        <Label htmlFor={id("workAreaId")}>Work area</Label>
        <NativeSelect
          id={id("workAreaId")}
          name="workAreaId"
          defaultValue={defaults.workAreaId ?? ""}
          className="h-11"
        >
          <option value="">Whole job</option>
          {areas.map((area) => (
            <option key={area.id} value={area.id}>
              {area.name}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-2">
        <Label htmlFor={id("taskId")}>Task</Label>
        <NativeSelect
          id={id("taskId")}
          name="taskId"
          defaultValue={defaults.taskId ?? ""}
          className="h-11"
        >
          <option value="">No task</option>
          {tasks.map((task) => (
            <option key={task.id} value={task.id}>
              {task.title}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={id("body")}>
          Details <span aria-hidden="true">*</span>
        </Label>
        <Textarea
          id={id("body")}
          name="body"
          rows={4}
          maxLength={4000}
          defaultValue={defaults.body ?? ""}
          placeholder="Note, quantity context, blocker, material request, or daily report"
          required
        />
        <FieldError name="body" />
      </div>
    </>
  );
}
