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
};

export function DurationInput({
  label,
  id,
  name,
  defaultValue = "",
  step,
  helperText,
  disabled,
}: DurationInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const captionId = `${inputId}-caption`;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;
  const [text, setText] = useState(defaultValue);

  const trimmed = text.trim();
  const parsed = trimmed === "" ? null : parseDuration(trimmed);
  const invalid = trimmed !== "" && parsed == null;
  const minutes = parsed == null ? null : step == null ? parsed : snapMinutes(parsed, step);
  const helper = helperText ?? (step != null ? "In 15-minute steps" : undefined);

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
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? errorId : minutes != null ? captionId : helper ? helperId : undefined}
        onChange={(event) => setText(event.target.value)}
      />
      {name ? <input type="hidden" name={name} value={minutes ?? ""} /> : null}
      {invalid ? (
        <p id={errorId} className="flex items-center gap-1 text-caption text-destructive">
          <TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" />
          Enter a duration like 1h 30m.
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
