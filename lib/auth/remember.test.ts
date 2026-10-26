import { describe, expect, it } from "vitest";
import { applyRemember, prefersPersistentSession } from "@/lib/auth/remember";

describe("remember me", () => {
  const persistent = {
    path: "/",
    sameSite: "lax" as const,
    httpOnly: false,
    maxAge: 400 * 24 * 60 * 60,
  };

  it("keeps a persistent session unless the preference is off", () => {
    expect(prefersPersistentSession(undefined)).toBe(true);
    expect(prefersPersistentSession("1")).toBe(true);
    expect(prefersPersistentSession("0")).toBe(false);
    expect(applyRemember(persistent, true)).toEqual(persistent);
  });

  it("turns a stored session into a session cookie and still deletes cookies", () => {
    expect(applyRemember(persistent, false)).toEqual({
      path: "/",
      sameSite: "lax",
      httpOnly: false,
    });
    expect(applyRemember({ ...persistent, maxAge: 0 }, false).maxAge).toBe(0);
  });
});
