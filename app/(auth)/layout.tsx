import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-svh flex-1 flex-col items-center justify-center gap-8 px-4 py-10">
      <Image
        src="/brand/logo-full.png"
        alt="Olifant"
        width={588}
        height={238}
        preload
        className="h-10 w-auto"
      />
      <div className="w-full max-w-100">{children}</div>
    </main>
  );
}
