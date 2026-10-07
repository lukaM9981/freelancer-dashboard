"use client";

import { type Control, Controller, type FieldValues, type Path } from "react-hook-form";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Option = { value: string; label: string; disabled?: boolean };

type SelectFieldProps<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  label: string;
  options: readonly Option[];
  description?: React.ReactNode;
};

export function SelectField<T extends FieldValues>({
  control,
  name,
  label,
  options,
  description,
}: SelectFieldProps<T>) {
  const inputId = `field-${name}`;
  const descriptionId = `${inputId}-description`;
  const errorId = `${inputId}-error`;
  const items = Object.fromEntries(options.map((option) => [option.value, option.label]));

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
          <Select
            items={items}
            value={field.value}
            onValueChange={(value) => {
              if (typeof value === "string") field.onChange(value);
            }}
          >
            <SelectTrigger
              id={inputId}
              aria-invalid={fieldState.invalid}
              aria-describedby={
                [description && descriptionId, fieldState.invalid && errorId].filter(Boolean).join(" ") ||
                undefined
              }
              onBlur={field.onBlur}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {description ? <FieldDescription id={descriptionId}>{description}</FieldDescription> : null}
          {fieldState.invalid ? <FieldError id={errorId} errors={[fieldState.error]} /> : null}
        </Field>
      )}
    />
  );
}
