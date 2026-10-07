import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { HOME_PATH, LOGIN_PATH } from "@/lib/auth/routes";

export type Role = "admin" | "freelancer";

export type Viewer = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
};

/**
 * The signed-in, active person, or null. The role comes from profiles.role, never from
 * the JWT or user_metadata (Tech.md §5.1).
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = createClient(await cookies());

  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (error || !userId) return null;

  // RLS returns no row for a deactivated profile (app.viewer_id(), DB.md §2).
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, status")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    console.error("Failed to load the viewer's profile", profileError);
    return null;
  }
  if (!profile || profile.status !== "active") return null;

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    role: profile.role as Role,
  };
});

export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(LOGIN_PATH);
  return viewer;
}

export async function requireAdmin(): Promise<Viewer> {
  const viewer = await requireViewer();
  if (viewer.role !== "admin") redirect(HOME_PATH);
  return viewer;
}

/** My time is a freelancer screen (PRD §9). Admins are sent back to the dashboard. */
export async function requireFreelancer(): Promise<Viewer> {
  const viewer = await requireViewer();
  if (viewer.role !== "freelancer") redirect(HOME_PATH);
  return viewer;
}
