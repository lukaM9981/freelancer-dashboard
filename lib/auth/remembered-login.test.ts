import { afterEach, describe, expect, it, vi } from "vitest";
import {
  REMEMBERED_LOGIN_KEY,
  clearRememberedLogin,
  readRememberedLogin,
  rememberedPasswordFor,
  writeRememberedLogin,
} from "@/lib/auth/remembered-login";

function installStorage() {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
  vi.stubGlobal("localStorage", storage);
  return storage;
}

describe("remembered login", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("stores one email and password and fills only that email", () => {
    installStorage();
    writeRememberedLogin("  Person@Olifant.test ", "secret-pass");
    const saved = readRememberedLogin();
    expect(saved).toEqual({ email: "person@olifant.test", password: "secret-pass" });
    expect(rememberedPasswordFor(saved, "Person@Olifant.test")).toBe("secret-pass");
    expect(rememberedPasswordFor(saved, "other@olifant.test")).toBeNull();
  });

  it("forgets the login and ignores a broken value", () => {
    const storage = installStorage();
    writeRememberedLogin("person@olifant.test", "secret-pass");
    clearRememberedLogin();
    expect(readRememberedLogin()).toBeNull();

    storage.setItem(REMEMBERED_LOGIN_KEY, "{");
    expect(readRememberedLogin()).toBeNull();
  });
});
