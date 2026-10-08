"use client";

import { type Control, Controller, type FieldValues, type Path } from "react-hook-form";
import { DurationInput } from "@/components/duration-input";

type DurationFieldProps<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  id: string;
  /** Shown until the person types. The form's own minutes value is separate. */
  defaultText?: string;
};

export function DurationField<T extends FieldValues>({ control, name, id, defaultText = "" }: DurationFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <DurationInput
          id={id}
          label="Duration"
          defaultValue={defaultText}
          error={fieldState.error?.message}
          onBlur={field.onBlur}
          onMinutesChange={(minutes) => {
            field.onChange(minutes == null || Number.isNaN(minutes) ? Number.NaN : minutes);
          }}
        />
      )}
    />
  );
}
