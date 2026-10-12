import type { Metadata } from "next";
import { MonthlyReport } from "@/components/reports/monthly-report";

export const metadata: Metadata = { title: "Reports · Olifant Workboard" };

type MonthReportPageProps = {
  params: Promise<{ month: string }>;
  searchParams: Promise<{ user?: string | string[] }>;
};

export default async function MonthReportPage({ params, searchParams }: MonthReportPageProps) {
  const [{ month }, { user }] = await Promise.all([params, searchParams]);
  return <MonthlyReport monthParam={month} userParam={Array.isArray(user) ? user[0] : user} />;
}
