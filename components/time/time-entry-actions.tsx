"use client";

import { DeleteTimeButton } from "@/components/time/delete-time-button";
import { EditTimeButton } from "@/components/time/edit-time-dialog";
import { EntryDescriptionButton } from "@/components/time/entry-description-button";
import { formatCalendarDate } from "@/lib/format";

type EntryAction = {
  id: string;
  description: string;
  workDate: string;
  source: "timer" | "manual";
  durationMinutes: number;
  startedAt: string | null;
  endedAt: string | null;
  canEdit: boolean;
  canCorrectDescription: boolean;
  dateMin: string;
};

/** Edit and delete while the task accepts time; otherwise only the description, while the month is open. */
export function TimeEntryActions({
  entry,
  dateMax,
  timeZone,
  viewedMonth,
  currentMonth,
}: {
  entry: EntryAction;
  dateMax: string;
  timeZone: string;
  /** `yyyy-MM`. Set on My time so an entry moved to another month opens there. */
  viewedMonth?: string;
  currentMonth?: string;
}) {
  const timed = entry.source === "timer";
  const canEditTimes = entry.canEdit && (!timed || (entry.startedAt != null && entry.endedAt != null));

  return (
    <div className="flex justify-end gap-1">
      {canEditTimes ? (
        <EditTimeButton
          entry={{ ...entry, dateMax, timeZone }}
          viewedMonth={viewedMonth}
          currentMonth={currentMonth}
        />
      ) : entry.canCorrectDescription ? (
        <EntryDescriptionButton
          entryId={entry.id}
          description={entry.description}
          dateLabel={formatCalendarDate(entry.workDate)}
        />
      ) : null}
      {entry.canEdit ? (
        <DeleteTimeButton entryId={entry.id} workDate={entry.workDate} durationMinutes={entry.durationMinutes} />
      ) : null}
    </div>
  );
}
