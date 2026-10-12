"use client";

import { useRouter } from "next/navigation";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type MonthOption = { value: string; label: string };

/**
 * Month picker. `month` and `currentMonth` are `yyyy-MM-01`; the list is newest first.
 * Without `hrefs`, a choice opens My time. `hrefs` is a plain map so a server page can
 * point the same picker at Reports.
 */
export function MonthNav({
  months,
  month,
  currentMonth,
  hrefs,
}: {
  months: MonthOption[];
  month: string;
  currentMonth: string;
  hrefs?: Record<string, string>;
}) {
  const router = useRouter();
  const index = months.findIndex((item) => item.value === month);
  const newer = index > 0 ? months[index - 1] : null;
  const older = index >= 0 && index < months.length - 1 ? months[index + 1] : null;
  const items = Object.fromEntries(months.map((item) => [item.value, item.label]));

  function go(value: string) {
    router.push(hrefs?.[value] ?? (value === currentMonth ? "/time" : `/time?month=${value.slice(0, 7)}`));
  }

  return (
    <div className="flex items-end gap-2">
      <Field className="min-w-0 flex-1 sm:max-w-56">
        <FieldLabel htmlFor="time-month">Month</FieldLabel>
        <Select items={items} value={month} onValueChange={(value) => typeof value === "string" && go(value)}>
          <SelectTrigger id="time-month">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <MonthStep label="Previous month" month={older} onGo={go} direction="previous" />
      <MonthStep label="Next month" month={newer} onGo={go} direction="next" />
    </div>
  );
}

function MonthStep({
  label,
  month,
  onGo,
  direction,
}: {
  label: string;
  month: MonthOption | null;
  onGo: (value: string) => void;
  direction: "previous" | "next";
}) {
  const icon = direction === "previous" ? <ChevronLeftIcon /> : <ChevronRightIcon />;
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={label}
            disabled={month == null}
            onClick={() => month && onGo(month.value)}
          >
            {icon}
          </Button>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
