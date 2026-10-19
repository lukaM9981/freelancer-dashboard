import type { SupabaseClient } from "@supabase/supabase-js";

export const AVATAR_BUCKET = "avatars";
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const AVATAR_URL_SECONDS = 60 * 60;

const EXTENSIONS = ["jpg", "png", "webp"] as const;
type AvatarExtension = (typeof EXTENSIONS)[number];

export function avatarObjectPath(userId: string, extension: AvatarExtension) {
  return `${userId}/avatar.${extension}`;
}

export function avatarObjectPaths(userId: string) {
  return EXTENSIONS.map((extension) => avatarObjectPath(userId, extension));
}

/** The image kind from the file bytes. The declared type is not trusted. */
export function sniffAvatar(bytes: Uint8Array): { extension: AvatarExtension; mime: string } | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return { extension: "jpg", mime: "image/jpeg" };
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { extension: "png", mime: "image/png" };
  }
  if (
    bytes.length >= 12 &&
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { extension: "webp", mime: "image/webp" };
  }
  return null;
}

/** Signed URLs for paths the caller is allowed to read. Missing or refused paths are omitted. */
export async function signAvatarPaths(
  supabase: SupabaseClient,
  paths: readonly (string | null | undefined)[],
): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter((path): path is string => Boolean(path)))];
  const urls = new Map<string, string>();
  if (unique.length === 0) return urls;

  const { data, error } = await supabase.storage.from(AVATAR_BUCKET).createSignedUrls(unique, AVATAR_URL_SECONDS);
  if (error || !data) {
    console.error("Avatar URLs failed", error);
    return urls;
  }
  for (const item of data) {
    if (item.path && item.signedUrl && !item.error) urls.set(item.path, item.signedUrl);
  }
  return urls;
}

export async function signAvatarPath(supabase: SupabaseClient, path: string | null): Promise<string | null> {
  if (!path) return null;
  const urls = await signAvatarPaths(supabase, [path]);
  return urls.get(path) ?? null;
}

function startsWith(bytes: Uint8Array, prefix: readonly number[]) {
  if (bytes.length < prefix.length) return false;
  return prefix.every((value, index) => bytes[index] === value);
}
