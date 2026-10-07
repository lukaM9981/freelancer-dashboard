"use client";

import { useId, useState } from "react";
import { type Control, Controller, type FieldValues, type Path } from "react-hook-form";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const RESULT_LIMIT = 8;

type TimeZoneFieldProps<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  zones: readonly string[];
  label: string;
  description?: React.ReactNode;
};

export function TimeZoneField<T extends FieldValues>({
  control,
  name,
  zones,
  label,
  description,
}: TimeZoneFieldProps<T>) {
  const inputId = useId();
  const listId = `${inputId}-list`;
  const descriptionId = `${inputId}-description`;
  const errorId = `${inputId}-error`;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const selected = typeof field.value === "string" ? field.value : "";
        const matches = filterZones(zones, query);
        const active = matches[Math.min(highlight, Math.max(matches.length - 1, 0))];

        function choose(zone: string) {
          field.onChange(zone);
          setQuery("");
          setOpen(false);
        }

        return (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
            <div className="relative">
              <Input
                id={inputId}
                role="combobox"
                aria-expanded={open}
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={open && active ? optionId(listId, active) : undefined}
                aria-invalid={fieldState.invalid}
                aria-describedby={
                  [description && descriptionId, fieldState.invalid && errorId].filter(Boolean).join(" ") ||
                  undefined
                }
                autoComplete="off"
                placeholder={selected || "Search time zones"}
                value={open ? query : selected}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setOpen(true);
                  setHighlight(0);
                }}
                onFocus={() => {
                  setOpen(true);
                  setQuery("");
                  setHighlight(0);
                }}
                onBlur={() => setOpen(false)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    setOpen(true);
                    setHighlight((current) => Math.min(current + 1, matches.length - 1));
                  } else if (event.key === "ArrowUp") {
                    event.preventDefault();
                    setHighlight((current) => Math.max(current - 1, 0));
                  } else if (event.key === "Enter" && open && active) {
                    event.preventDefault();
                    choose(active);
                  } else if (event.key === "Escape") {
                    setOpen(false);
                    setQuery("");
                  }
                }}
              />
              {open ? (
                <ul
                  id={listId}
                  role="listbox"
                  className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-popover p-1 shadow-md"
                >
                  {matches.length === 0 ? (
                    <li className="px-3 py-2 text-body-xs text-muted-foreground">No time zones match.</li>
                  ) : (
                    matches.map((zone) => (
                      <li key={zone} id={optionId(listId, zone)} role="option" aria-selected={zone === selected}>
                        <button
                          type="button"
                          className="w-full rounded-sm px-3 py-2 text-left text-body-xs hover:bg-accent focus-ring data-[active=true]:bg-accent"
                          data-active={zone === active}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => choose(zone)}
                        >
                          {zone}
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              ) : null}
            </div>
            {description ? <FieldDescription id={descriptionId}>{description}</FieldDescription> : null}
            {fieldState.invalid ? <FieldError id={errorId} errors={[fieldState.error]} /> : null}
          </Field>
        );
      }}
    />
  );
}

function filterZones(zones: readonly string[], query: string): string[] {
  const needle = query.trim().toLowerCase();
  const source = needle ? zones.filter((zone) => zone.toLowerCase().includes(needle)) : zones;
  return source.slice(0, RESULT_LIMIT);
}

function optionId(listId: string, zone: string) {
  return `${listId}-${zone.replace(/\//g, "-")}`;
}
