import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/actions";
import { requireViewer } from "@/lib/auth/queries";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireViewer();

  return (
    <div className="flex min-h-svh flex-1 flex-col">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 w-full max-w-content items-center justify-between gap-4 px-4 md:px-6 lg:px-8">
          <Link href="/dashboard" className="shrink-0 rounded-sm focus-ring">
            <Image
              src="/brand/logo-full.png"
              alt="Olifant Workboard"
              width={588}
              height={238}
              preload
              className="h-8 w-auto"
            />
          </Link>
          <div className="flex min-w-0 items-center gap-4">
            <span className="truncate text-body-xs font-medium">{viewer.fullName}</span>
            <form action={signOut}>
              <Button type="submit" variant="outline" size="sm">
                Sign Out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-content flex-1 px-4 py-6 md:px-6 lg:px-8 lg:py-8">
        {children}
      </main>
    </div>
  );
}
