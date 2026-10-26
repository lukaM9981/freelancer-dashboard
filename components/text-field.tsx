"use client";

import { useState } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { type Control, Controller, type FieldValues, type Path } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type TextFieldProps<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  label: string;
  description?: React.ReactNode;
  /** Store a number instead of the input's string. */
  valueAsNumber?: boolean;
  /** Password fields only: an eye button that shows the value while it is typed. */
  reveal?: boolean;
} & Omit<React.ComponentProps<typeof Input>, "name" | "value" | "defaultValue" | "onChange" | "onBlur">;

export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  id,
  valueAsNumber = false,
  reveal = false,
  type,
  className,
  ...inputProps
}: TextFieldProps<T>) {
  const [visible, setVisible] = useState(false);
  const inputId = id ?? `field-${name}`;
  const descriptionId = `${inputId}-description`;
  const errorId = `${inputId}-error`;
  const revealable = reveal && type === "password";
  const inputType = revealable && visible ? "text" : type;

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const input = (
          <Input
            {...inputProps}
            {...field}
            value={valueAsNumber && typeof field.value === "number" && Number.isNaN(field.value) ? "" : field.value}
            onChange={(event) => {
              if (!valueAsNumber) {
                field.onChange(event);
                return;
              }
              const next = event.target.value;
              field.onChange(next === "" ? Number.NaN : Number(next));
            }}
            id={inputId}
            type={inputType}
            spellCheck={revealable ? false : inputProps.spellCheck}
            autoCapitalize={revealable ? "off" : inputProps.autoCapitalize}
            className={cn(className, revealable && "pr-12")}
            aria-invalid={fieldState.invalid}
            aria-describedby={
              [description && descriptionId, fieldState.invalid && errorId].filter(Boolean).join(" ") ||
              undefined
            }
          />
        );

        return (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
            {revealable ? (
              <div className="relative">
                {input}
                <PasswordReveal label={label} visible={visible} onToggle={() => setVisible((current) => !current)} />
              </div>
            ) : (
              input
            )}
            {description && <FieldDescription id={descriptionId}>{description}</FieldDescription>}
            {fieldState.invalid && <FieldError id={errorId} errors={[fieldState.error]} />}
          </Field>
        );
      }}
    />
  );
}

function PasswordReveal({
  label,
  visible,
  onToggle,
}: {
  label: string;
  visible: boolean;
  onToggle: () => void;
}) {
  const toggleLabel = `${visible ? "Hide" : "Show"} ${label.toLowerCase()}`;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={toggleLabel}
              aria-pressed={visible}
              onMouseDown={(event) => event.preventDefault()}
              onClick={onToggle}
              className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground"
            >
              {visible ? <EyeOffIcon /> : <EyeIcon />}
            </Button>
          }
        />
        <TooltipContent>{toggleLabel}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
