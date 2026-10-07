export function appUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL;
  if (!base) throw new Error("NEXT_PUBLIC_APP_URL must be set.");
  return new URL(path, base).toString();
}
