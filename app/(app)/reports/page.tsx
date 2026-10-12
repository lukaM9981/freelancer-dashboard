import type { Metadata } from "next";
import { MonthlyReport } from "@/components/reports/monthly-report";

export const metadata: Metadata = { title: "Reports · Olifant Workboard" };

type ReportsPageProps = { searchParams: Promise<{ user?: string | string[] }> };

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const { user } = await searchParams;
  return <MonthlyReport userParam={firstParam(user)} />;
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
