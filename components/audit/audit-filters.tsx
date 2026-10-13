"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EVENT_GROUPS } from "@/lib/audit/events";
import { type AuditFilters as Filters, auditHref, hasFilters, NO_FILTERS, rangeIsInverted } from "@/lib/audit/filters";

const ANY = "any";
const DATE_DELAY_MS = 500;

type Option = { id: string; name: string };

const TYPE_ITEMS: Record<string, string> = Object.fromEntries([
  [ANY, "All events"],
  ...EVENT_GROUPS.flatMap((group) => [
    [group.id, `All ${group.label.toLowerCase()}`],
    ...group.types.map(([type, label]) => [type, label]),
  ]),
]);

/** Person, project, event type, and date range (PRD §6.13). Every change updates the URL. */
export function AuditFilters({ filters, people, projects }: { filters: Filters; people: Option[]; projects: Option[] }) {
  const router = useRouter();
  const inverted = rangeIsInverted(filters);

  function apply(change: Partial<Filters>) {
    router.push(auditHref({ ...filters, ...change }));
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 lg:flex-row lg:flex-wrap lg:items-end">
      <OptionSelect
        id="audit-person"
        label="Person"
        anyLabel="Everyone"
        options={people}
        value={filters.person}
        onChange={(person) => apply({ person })}
      />
      <OptionSelect
        id="audit-project"
        label="Project"
        anyLabel="All projects"
        options={projects}
        value={filters.project}
        onChange={(project) => apply({ project })}
      />
      <Field className="min-w-0 lg:w-60">
        <FieldLabel htmlFor="audit-type">Event type</FieldLabel>
        <Select
          items={TYPE_ITEMS}
          value={filters.type ?? ANY}
          onValueChange={(value) => typeof value === "string" && apply({ type: value === ANY ? null : value })}
        >
          <SelectTrigger id="audit-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>All events</SelectItem>
            {EVENT_GROUPS.map((group) => (
              <SelectGroup key={group.id}>
                <SelectSeparator />
                <SelectLabel>{group.label}</SelectLabel>
                <SelectItem value={group.id}>{TYPE_ITEMS[group.id]}</SelectItem>
                {group.types.map(([type, label]) => (
                  <SelectItem key={type} value={type} className="pl-6">
                    {label}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <div className="flex gap-4">
        <DateFilter
          id="audit-from"
          label="From"
          value={filters.from}
          max={filters.to}
          invalid={inverted}
          onChange={(from) => apply({ from })}
        />
        <DateFilter
          id="audit-to"
          label="To"
          value={filters.to}
          min={filters.from}
          invalid={inverted}
          onChange={(to) => apply({ to })}
        />
      </div>
      {hasFilters(filters) ? (
        <Button variant="ghost" className="self-start lg:self-end" onClick={() => router.push(auditHref(NO_FILTERS))}>
          Clear Filters
        </Button>
      ) : null}
      {inverted ? (
        <FieldError id="audit-range-error" className="lg:basis-full">
          The start date is after the end date.
        </FieldError>
      ) : null}
    </div>
  );
}

/** A typed date applies once typing pauses; a partial year like "0002" never reaches the URL. */
function DateFilter({
  id,
  label,
  value,
  min,
  max,
  invalid,
  onChange,
}: {
  id: string;
  label: string;
  value: string | null;
  min?: string | null;
  max?: string | null;
  invalid: boolean;
  onChange: (value: string | null) => void;
}) {
  const [draft, setDraft] = useState(value ?? "");
  const [applied, setApplied] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  if (value !== applied) {
    setApplied(value);
    setDraft(value ?? "");
  }

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function change(next: string) {
    setDraft(next);
    if (timer.current) clearTimeout(timer.current);
    if (next !== "" && !/^(19|20)\d{2}-\d{2}-\d{2}$/.test(next)) return;
    timer.current = setTimeout(() => onChange(next || null), DATE_DELAY_MS);
  }

  return (
    <Field className="min-w-0 flex-1 lg:w-44">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        type="date"
        value={draft}
        min={min ?? undefined}
        max={max ?? undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? "audit-range-error" : undefined}
        onChange={(event) => change(event.target.value)}
      />
    </Field>
  );
}

function OptionSelect({
  id,
  label,
  anyLabel,
  options,
  value,
  onChange,
}: {
  id: string;
  label: string;
  anyLabel: string;
  options: Option[];
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const known = value != null && options.some((option) => option.id === value);
  const items = Object.fromEntries([[ANY, anyLabel], ...options.map((option) => [option.id, option.name])]);
  return (
    <Field className="min-w-0 lg:w-56">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select
        items={items}
        value={known ? value : ANY}
        onValueChange={(next) => typeof next === "string" && onChange(next === ANY ? null : next)}
      >
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>{anyLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}
