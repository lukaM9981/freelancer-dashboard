"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { SelectField } from "@/components/select-field";
import { SubmitButton } from "@/components/submit-button";
import { TextField } from "@/components/text-field";
import { TimeZoneField } from "@/components/time-zone-field";
import { FieldGroup } from "@/components/ui/field";
import { applyFieldErrors } from "@/lib/forms";
import { updateSettings } from "@/lib/settings/actions";
import { type SettingsInput, settingsSchema } from "@/lib/settings/schemas";

export function SettingsForm({
  values,
  zones,
}: {
  values: SettingsInput;
  zones: readonly string[];
}) {
  const router = useRouter();
  const form = useForm<SettingsInput>({
    resolver: zodResolver(settingsSchema),
    defaultValues: values,
  });

  async function onSubmit(input: SettingsInput) {
    const result = await updateSettings(input);
    if (!result.ok) {
      applyFieldErrors(form.setError, result.fieldErrors);
      toast.error(result.error);
      return;
    }
    toast.success("Settings saved.");
    router.refresh();
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex max-w-md flex-col gap-8">
      <FieldGroup>
        <TextField control={form.control} name="name" label="Organization name" autoComplete="organization" />
        <TimeZoneField
          control={form.control}
          name="timeZone"
          zones={zones}
          label="Time zone"
          description="Dates, today, and month boundaries follow this zone."
        />
        <TextField
          control={form.control}
          name="tolerancePercent"
          label="Tolerance (%)"
          type="number"
          inputMode="numeric"
          min={0}
          max={100}
          step={1}
          description="Added to every task's approved limit. Time inside that margin still counts. Time past it is unpaid until extra hours are approved. Open months are recalculated immediately. Closed months stay as they are."
          valueAsNumber
        />
        <SelectField
          control={form.control}
          name="defaultCurrency"
          label="Default currency"
          description="Suggested for new rates."
          options={[
            { value: "EUR", label: "EUR" },
            { value: "USD", label: "USD" },
          ]}
        />
      </FieldGroup>
      <div className="flex justify-end">
        <SubmitButton pending={form.formState.isSubmitting}>Save Settings</SubmitButton>
      </div>
    </form>
  );
}
