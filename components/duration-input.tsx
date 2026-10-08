"use client";

import { useId, useState } from "react";
import { TriangleAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatDuration, parseDuration, snapMinutes } from "@/lib/duration";

type DurationInputProps = {
  label: string;
  id?: string;
  /** Writes the parsed minutes (after snapping) on a hidden input. */
  name?: string;
  defaultValue?: string;
  /** When set, the stored minutes snap to this step. 15 shows the estimate helper. */
  step?: number;
  helperText?: string;
  disabled?: boolean;
  /** Minutes after snapping: null when empty, NaN when the text can't be read. */
  onMinutesChange?: (minutes: number | null) => void;
  onBlur?: () => void;
  /** A validation message from the form, shown instead of the helper text. */
  error?: string;
};

export function DurationInput({
  label,
  id,
  name,
  defaultValue = "",
  step,
  helperText,
  disabled,
  onMinutesChange,
  onBlur,
  error,
}: DurationInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const captionId = `${inputId}-caption`;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;
  const [text, setText] = useState(defaultValue);

  const { invalid, minutes } = readDuration(text, step);
  const helper = helperText ?? (step != null ? "In 15-minute steps" : undefined);
  const message = invalid ? "Enter a duration like 1h 30m." : error;

  return (
    <div className="group flex flex-col gap-1.5">
      <label
        htmlFor={inputId}
        className="text-body-xs font-medium transition-colors duration-150 ease-brand group-focus-within:text-pine-700"
      >
        {label}
      </label>
      <Input
        id={inputId}
        value={text}
        disabled={disabled}
        inputMode="decimal"
        autoComplete="off"
        aria-invalid={message ? true : undefined}
        aria-describedby={message ? errorId : minutes != null ? captionId : helper ? helperId : undefined}
        onBlur={onBlur}
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          if (onMinutesChange) {
            const read = readDuration(next, step);
            onMinutesChange(read.invalid ? Number.NaN : read.minutes);
          }
        }}
      />
      {name ? <input type="hidden" name={name} value={minutes ?? ""} /> : null}
      {message ? (
        <p id={errorId} className="flex items-center gap-1 text-caption text-destructive">
          <TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" />
          {message}
        </p>
      ) : (
        <>
          {minutes != null ? (
            <p id={captionId} className="text-caption text-muted-foreground numeric">
              = {formatDuration(minutes)}
            </p>
          ) : null}
          {helper ? (
            <p id={helperId} className="text-caption text-muted-foreground">
              {helper}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}

function readDuration(text: string, step: number | undefined): { invalid: boolean; minutes: number | null } {
  const trimmed = text.trim();
  const parsed = trimmed === "" ? null : parseDuration(trimmed);
  if (trimmed !== "" && parsed == null) return { invalid: true, minutes: null };
  if (parsed == null) return { invalid: false, minutes: null };
  return { invalid: false, minutes: step == null ? parsed : snapMinutes(parsed, step) };
}
