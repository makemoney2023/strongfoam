"use client";

import { CalendarCogIcon, Trash2Icon } from "lucide-react";
import { ActionForm } from "@/components/ops/action-form";
import { ConfirmForm } from "@/components/ops/confirm-form";
import { FormDialog } from "@/components/ops/form-dialog";
import { NativeSelect } from "@/components/ops/native-select";
import { SubmitButton } from "@/components/ops/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  removeScheduleCalendarException,
  saveProjectScheduleCalendar,
  saveScheduleCalendarException,
} from "@/app/app/projects/actions";
import type { ResolvedWorkingCalendar } from "@/lib/ops/project-schedule-planning";

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

type CalendarProps = ResolvedWorkingCalendar & {
  id: string;
  name: string;
  updatedAt: string;
  updatedBy: string;
};

export function ScheduleCalendarDialog({
  projectId,
  calendar,
  returnTo,
}: {
  projectId: string;
  calendar: CalendarProps;
  returnTo: string;
}) {
  return (
    <FormDialog
      triggerLabel="Working calendar"
      triggerIcon={<CalendarCogIcon aria-hidden="true" />}
      triggerVariant="outline"
      title="Working calendar"
      description="Calendar changes update calculations; stored dates do not move."
      contentClassName="sm:max-w-2xl"
    >
      <div className="space-y-6">
        <ActionForm
          action={saveProjectScheduleCalendar}
          className="grid gap-3 sm:grid-cols-2"
        >
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <div className="space-y-2">
            <Label htmlFor="calendar-name">Calendar name</Label>
            <Input
              id="calendar-name"
              name="name"
              className="h-11"
              defaultValue={calendar.name}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="calendar-time-zone">IANA time zone</Label>
            <Input
              id="calendar-time-zone"
              name="timeZone"
              className="h-11"
              defaultValue={calendar.timeZone}
              required
            />
          </div>
          <fieldset className="space-y-2 sm:col-span-2">
            <legend className="text-sm font-medium">Non-working weekdays</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {WEEKDAYS.map((day, index) => (
                <label
                  key={day}
                  className="flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm"
                >
                  <input
                    type="checkbox"
                    name="weekendDays"
                    value={index}
                    defaultChecked={calendar.weekendDays.includes(index)}
                    className="size-4 accent-primary"
                  />
                  {day}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="sm:col-span-2">
            <SubmitButton className="min-h-11">Save calendar</SubmitButton>
          </div>
        </ActionForm>

        <div className="space-y-3 border-t pt-5">
          <div>
            <h3 className="font-medium">Dated exceptions</h3>
            <p className="text-sm text-muted-foreground">
              A closure or working-day exception overrides the weekday rule.
            </p>
          </div>
          <ActionForm
            action={saveScheduleCalendarException}
            className="grid gap-3 sm:grid-cols-2"
          >
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="calendarId" value={calendar.id} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <input
              type="hidden"
              name="calendarName"
              value={calendar.name}
            />
            <input
              type="hidden"
              name="calendarTimeZone"
              value={calendar.timeZone}
            />
            {calendar.weekendDays.map((day) => (
              <input
                key={day}
                type="hidden"
                name="calendarWeekendDays"
                value={day}
              />
            ))}
            <div className="space-y-2">
              <Label htmlFor="calendar-exception-date">Date</Label>
              <Input
                id="calendar-exception-date"
                name="date"
                type="date"
                className="h-11"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="calendar-exception-name">Name</Label>
              <Input
                id="calendar-exception-name"
                name="name"
                className="h-11"
                placeholder="Civic holiday"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="calendar-exception-state">State</Label>
              <NativeSelect
                id="calendar-exception-state"
                name="isWorkingDay"
                className="h-11"
                defaultValue="false"
              >
                <option value="false">Closed</option>
                <option value="true">Working day</option>
              </NativeSelect>
            </div>
            <div className="flex items-end">
              <SubmitButton className="min-h-11">Add exception</SubmitButton>
            </div>
          </ActionForm>

          {calendar.exceptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No dated exceptions.</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {calendar.exceptions.map((exception) => (
                <li
                  key={exception.id ?? exception.date}
                  className="flex min-h-11 items-center justify-between gap-3 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {exception.date} · {exception.name ?? "Exception"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {exception.isWorkingDay ? "Working day" : "Closed"}
                    </p>
                  </div>
                  {exception.id ? (
                    <ConfirmForm
                      action={removeScheduleCalendarException}
                      message={`Remove the ${exception.date} calendar exception?`}
                      confirmLabel="Remove exception"
                    >
                      <input
                        type="hidden"
                        name="projectId"
                        value={projectId}
                      />
                      <input
                        type="hidden"
                        name="calendarId"
                        value={calendar.id}
                      />
                      <input
                        type="hidden"
                        name="exceptionId"
                        value={exception.id}
                      />
                      <input type="hidden" name="returnTo" value={returnTo} />
                      <SubmitButton
                        variant="ghost"
                        className="min-h-11"
                        aria-label={`Remove ${exception.date} exception`}
                      >
                        <Trash2Icon aria-hidden="true" />
                        Remove
                      </SubmitButton>
                    </ConfirmForm>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-muted-foreground">
            Last changed by {calendar.updatedBy}.
          </p>
        </div>
      </div>
    </FormDialog>
  );
}
