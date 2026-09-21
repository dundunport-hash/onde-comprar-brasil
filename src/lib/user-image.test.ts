import { describe, expect, it } from "vitest";
import { normalizeUserImage } from "./user-image";

describe("normalizeUserImage", () => {
  it("accepts http and https image URLs", () => {
    expect(normalizeUserImage("https://example.com/avatar.png")).toBe(
      "https://example.com/avatar.png",
    );
    expect(normalizeUserImage("http://example.com/avatar.png")).toBe(
      "http://example.com/avatar.png",
    );
  });

  it("rejects inline, invalid and oversized values", () => {
    expect(normalizeUserImage("data:image/png;base64,abc123")).toBeNull();
    expect(normalizeUserImage("javascript:alert(1)")).toBeNull();
    expect(normalizeUserImage("x".repeat(600))).toBeNull();
    expect(normalizeUserImage(null)).toBeNull();
  });
});
