"use client";

import { useRouter } from "next/navigation";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { reportPath } from "@/lib/reports/paths";

const EVERYONE = "all";

type PersonOption = { id: string; fullName: string };

/** Admin report filter. Everyone, or one freelancer (PRD §6.10). */
export function PersonFilter({
  people,
  selectedUserId,
  month,
  currentMonth,
}: {
  people: PersonOption[];
  selectedUserId: string | null;
  month: string;
  currentMonth: string;
}) {
  const router = useRouter();
  const items = Object.fromEntries([[EVERYONE, "Everyone"], ...people.map((person) => [person.id, person.fullName])]);

  function go(value: string) {
    router.push(reportPath(month, currentMonth, value === EVERYONE ? null : value));
  }

  return (
    <Field className="min-w-0 flex-1 sm:max-w-56">
      <FieldLabel htmlFor="report-person">Freelancer</FieldLabel>
      <Select items={items} value={selectedUserId ?? EVERYONE} onValueChange={(value) => typeof value === "string" && go(value)}>
        <SelectTrigger id="report-person">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={EVERYONE}>Everyone</SelectItem>
          {people.map((person) => (
            <SelectItem key={person.id} value={person.id}>
              {person.fullName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}
