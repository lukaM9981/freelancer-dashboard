import { z } from "zod";
import { getViewer } from "@/lib/auth/queries";
import { isMonthParam, loadReportCsv } from "@/lib/reports/queries";

type CsvRouteProps = { params: Promise<{ month: string }> };

export async function GET(request: Request, { params }: CsvRouteProps) {
  const viewer = await getViewer();
  if (!viewer) return new Response("Sign in to export a report.", { status: 401 });

  const { month } = await params;
  if (!isMonthParam(month)) return new Response("Choose a month.", { status: 404 });

  const user = new URL(request.url).searchParams.get("user");
  if (user && !z.uuid().safeParse(user).success) return new Response("Choose a person.", { status: 400 });
  if (viewer.role === "freelancer" && user && user !== viewer.id) {
    return new Response("You can export only your own report.", { status: 403 });
  }

  const result = await loadReportCsv(viewer, month, viewer.role === "admin" ? user : viewer.id);
  if ("error" in result) return new Response("That month has no report.", { status: 404 });

  return new Response(result.body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${result.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
