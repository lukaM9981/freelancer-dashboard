import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { ProfileForms } from "@/components/profile/profile-forms";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireViewer } from "@/lib/auth/queries";
import { formatCalendarDate, formatMoney } from "@/lib/format";
import { currentRate } from "@/lib/people/rates";
import { listOwnRates } from "@/lib/people/queries";

export const metadata: Metadata = { title: "Profile · Olifant Workboard" };

export default async function ProfilePage() {
  const viewer = await requireViewer();
  const history = viewer.role === "freelancer" ? await listOwnRates(viewer.id) : null;
  const activeId = history ? currentRate(history.rates, history.today)?.id : null;

  return (
    <div className="space-y-8">
      <PageHeader title="Profile" />
      <p className="text-body-sm text-muted-foreground">{viewer.email}</p>
      <ProfileForms fullName={viewer.fullName} />
      {history ? (
        <section className="max-w-xl space-y-4">
          <h2 className="text-heading-xs">Rate history</h2>
          {history.rates.length === 0 ? (
            <p className="text-body-sm text-muted-foreground">No rate yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Effective from</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.rates.map((rate) => (
                  <TableRow key={rate.id}>
                    <TableCell data-label="Effective from">
                      {formatCalendarDate(rate.effectiveFrom)}
                      {rate.id === activeId ? (
                        <span className="ml-2 text-caption text-muted-foreground">Current</span>
                      ) : null}
                    </TableCell>
                    <TableCell data-label="Rate" className="numeric md:text-right">
                      {formatMoney(rate.cents, rate.currency)} / h
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>
      ) : null}
    </div>
  );
}
