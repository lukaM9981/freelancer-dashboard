"use client";

import { type Control, Controller, type FieldValues, type Path } from "react-hook-form";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

type TextareaFieldProps<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  label: string;
  description?: React.ReactNode;
} & Omit<React.ComponentProps<typeof Textarea>, "name" | "value" | "defaultValue" | "onChange" | "onBlur">;

export function TextareaField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  id,
  ...textareaProps
}: TextareaFieldProps<T>) {
  const inputId = id ?? `field-${name}`;
  const descriptionId = `${inputId}-description`;
  const errorId = `${inputId}-error`;

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
          <Textarea
            {...textareaProps}
            {...field}
            id={inputId}
            aria-invalid={fieldState.invalid}
            aria-describedby={
              [description && descriptionId, fieldState.invalid && errorId].filter(Boolean).join(" ") ||
              undefined
            }
          />
          {description && <FieldDescription id={descriptionId}>{description}</FieldDescription>}
          {fieldState.invalid && <FieldError id={errorId} errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}
