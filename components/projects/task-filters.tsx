"use client";

import { usePathname, useRouter } from "next/navigation";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ALL = "all";

type Option = { value: string; label: string };

type TaskFiltersProps = {
  status: string | null;
  assignee: string | null;
  statusOptions: Option[];
  /** Admins only. */
  assigneeOptions: Option[] | null;
};

export function TaskFilters({ status, assignee, statusOptions, assigneeOptions }: TaskFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();

  function apply(next: { status: string | null; assignee: string | null }) {
    const params = new URLSearchParams();
    if (next.status) params.set("status", next.status);
    if (next.assignee) params.set("assignee", next.assignee);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <FilterSelect
        id="filter-status"
        label="Status"
        allLabel="All statuses"
        value={status}
        options={statusOptions}
        onChange={(value) => apply({ status: value, assignee })}
      />
      {assigneeOptions ? (
        <FilterSelect
          id="filter-assignee"
          label="Assignee"
          allLabel="Everyone"
          value={assignee}
          options={assigneeOptions}
          onChange={(value) => apply({ status, assignee: value })}
        />
      ) : null}
    </div>
  );
}

function FilterSelect({
  id,
  label,
  allLabel,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  allLabel: string;
  value: string | null;
  options: Option[];
  onChange: (value: string | null) => void;
}) {
  const items = { [ALL]: allLabel, ...Object.fromEntries(options.map((option) => [option.value, option.label])) };
  return (
    <Field className="sm:max-w-56">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select
        items={items}
        value={value ?? ALL}
        onValueChange={(next) => onChange(typeof next === "string" && next !== ALL ? next : null)}
      >
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{allLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}
