import { describe, expect, it } from "vitest";
import {
  sanitizeCloudinaryFolder,
  sanitizeEmail,
  sanitizeExternalId,
  sanitizeHexToken,
  sanitizeHttpUrl,
  sanitizeOptionalText,
  sanitizeText,
  escapeHtml,
} from "./sanitize";

describe("sanitize helpers", () => {
  it("removes html tags, control characters, and repeated whitespace", () => {
    expect(
      sanitizeText("  <script>alert(1)</script>\u0000 Dipirona   500mg  "),
    ).toBe("Dipirona 500mg");
  });

  it("returns null for empty optional text", () => {
    expect(sanitizeOptionalText(" <b> </b> ")).toBeNull();
  });

  it("normalizes valid emails and rejects invalid emails", () => {
    expect(sanitizeEmail("  TEST@Example.COM ")).toBe("test@example.com");
    expect(sanitizeEmail("not-an-email")).toBe("");
  });

  it("allows only http and https URLs", () => {
    expect(sanitizeHttpUrl("https://example.com/avatar.png")).toBe(
      "https://example.com/avatar.png",
    );
    expect(sanitizeHttpUrl("javascript:alert(1)")).toBeNull();
  });

  it("accepts fixed-length hex reset tokens", () => {
    const token = "a".repeat(64);

    expect(sanitizeHexToken(token.toUpperCase())).toBe(token);
    expect(sanitizeHexToken(`${token}<script>`)).toBe("");
  });

  it("allows only safe external identifiers", () => {
    expect(sanitizeExternalId(" cs_test_123-ABC ")).toBe("cs_test_123-ABC");
    expect(sanitizeExternalId("cs_123&processed=1")).toBe("");
    expect(sanitizeExternalId("<script>alert(1)</script>")).toBe("");
  });

  it("normalizes Cloudinary folder names", () => {
    expect(sanitizeCloudinaryFolder(" /usuarios<script>/perfil novo ")).toBe(
      "usuarios/perfil-novo",
    );
    expect(sanitizeCloudinaryFolder("")).toBe("drogaria-mega-popular");
  });

  it("escapes html before interpolation into trusted markup", () => {
    expect(escapeHtml(`Ana & "Bia"`)).toBe("Ana &amp; &quot;Bia&quot;");
  });
});
