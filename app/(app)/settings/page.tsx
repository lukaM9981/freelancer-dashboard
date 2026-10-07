import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { SettingsForm } from "@/components/settings/settings-form";
import { requireAdmin } from "@/lib/auth/queries";
import { getOrganizationSettings } from "@/lib/settings/queries";
import { listTimeZones } from "@/lib/settings/time-zones";

export const metadata: Metadata = { title: "Settings · Olifant Workboard" };

export default async function SettingsPage() {
  await requireAdmin();
  const settings = await getOrganizationSettings();

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Admin" title="Settings" />
      <SettingsForm
        values={{
          name: settings.name,
          timeZone: settings.timeZone,
          tolerancePercent: Math.round(settings.tolerancePercent),
          defaultCurrency: settings.defaultCurrency,
        }}
        zones={listTimeZones()}
      />
    </div>
  );
}
