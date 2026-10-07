"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { SelectField } from "@/components/select-field";
import { SubmitButton } from "@/components/submit-button";
import { TextField } from "@/components/text-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { applyFieldErrors } from "@/lib/forms";
import { formatCalendarDate, formatMoney } from "@/lib/format";
import { addRate, deleteRate } from "@/lib/people/actions";
import { currentRate, isFutureRate, type DisplayRate } from "@/lib/people/rates";
import { type AddRateInput, addRateSchema } from "@/lib/people/schemas";

export function RateSection({
  userId,
  rates,
  today,
  defaultCurrency,
  earliestRateDate,
}: {
  userId: string;
  rates: DisplayRate[];
  today: string;
  defaultCurrency: "EUR" | "USD";
  earliestRateDate: string | null;
}) {
  return (
    <div className="flex flex-col gap-8">
      {rates.length === 0 ? (
        <p className="text-body-sm text-muted-foreground">No rate yet. Time can still be tracked, and shows as no rate.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Effective from</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rates.map((rate) => {
              const future = isFutureRate(rate.effectiveFrom, today);
              const current = currentRate(rates, today)?.id === rate.id;
              return (
                <TableRow key={rate.id}>
                  <TableCell data-label="Effective from">
                    {formatCalendarDate(rate.effectiveFrom)}
                    {current ? <span className="ml-2 text-caption text-muted-foreground">Current</span> : null}
                  </TableCell>
                  <TableCell data-label="Rate" className="numeric text-right">
                    {formatMoney(rate.cents, rate.currency)} / h
                  </TableCell>
                  <TableCell data-label="" className="text-right">
                    {future ? <DeleteRateButton rate={rate} /> : null}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
      <RateForm
        userId={userId}
        defaultCurrency={defaultCurrency}
        defaultDate={earliestRateDate && earliestRateDate > today ? earliestRateDate : today}
        earliestRateDate={earliestRateDate}
      />
    </div>
  );
}

function RateForm({
  userId,
  defaultCurrency,
  defaultDate,
  earliestRateDate,
}: {
  userId: string;
  defaultCurrency: "EUR" | "USD";
  defaultDate: string;
  earliestRateDate: string | null;
}) {
  const router = useRouter();
  const form = useForm<AddRateInput>({
    resolver: zodResolver(addRateSchema),
    defaultValues: { userId, amount: "", currency: defaultCurrency, effectiveFrom: defaultDate },
  });

  async function onSubmit(values: AddRateInput) {
    const result = await addRate(values);
    if (!result.ok) {
      applyFieldErrors(form.setError, result.fieldErrors);
      toast.error(result.error);
      return;
    }
    toast.success("Rate added.");
    form.reset({ userId, amount: "", currency: values.currency, effectiveFrom: values.effectiveFrom });
    router.refresh();
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <h3 className="text-body-sm font-bold">Add a rate</h3>
      <FieldGroup>
        <TextField
          control={form.control}
          name="amount"
          label="Amount"
          inputMode="decimal"
          autoComplete="off"
          placeholder="45.00"
        />
        <SelectField
          control={form.control}
          name="currency"
          label="Currency"
          options={[
            { value: "EUR", label: "EUR" },
            { value: "USD", label: "USD" },
          ]}
        />
        <TextField
          control={form.control}
          name="effectiveFrom"
          label="Effective from"
          type="date"
          min={earliestRateDate ?? undefined}
          description="A rate dated today or earlier stays. A future rate can be deleted."
        />
      </FieldGroup>
      <div className="flex justify-end">
        <SubmitButton pending={form.formState.isSubmitting}>Add Rate</SubmitButton>
      </div>
    </form>
  );
}

function DeleteRateButton({ rate }: { rate: DisplayRate }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const label = `${formatMoney(rate.cents, rate.currency)} / h from ${formatCalendarDate(rate.effectiveFrom)}`;

  async function remove() {
    setPending(true);
    const result = await deleteRate({ rateId: rate.id });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setOpen(false);
    toast.success("Rate deleted.");
    router.refresh();
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Delete
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this rate?</DialogTitle>
            <DialogDescription>{label} has not started yet. Deleting it cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="max-sm:flex-col-reverse max-sm:items-stretch">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" disabled={pending} onClick={remove}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
