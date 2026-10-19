import { describe, expect, it } from "vitest";
import { sniffAvatar } from "@/lib/avatars";

describe("sniffAvatar", () => {
  it("recognises jpeg, png, and webp", () => {
    expect(sniffAvatar(Uint8Array.of(0xff, 0xd8, 0xff, 0x00))).toEqual({ extension: "jpg", mime: "image/jpeg" });
    expect(sniffAvatar(Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toEqual({
      extension: "png",
      mime: "image/png",
    });
    const webp = new Uint8Array(12);
    webp.set([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
    expect(sniffAvatar(webp)).toEqual({ extension: "webp", mime: "image/webp" });
  });

  it("rejects anything else", () => {
    expect(sniffAvatar(Uint8Array.of(0x3c, 0x73, 0x76, 0x67))).toBeNull();
    expect(sniffAvatar(new Uint8Array())).toBeNull();
  });
});
