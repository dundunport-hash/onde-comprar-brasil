import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";
import { authOptions } from "./auth";

async function getHeaderMap() {
  const headersConfig = await nextConfig.headers?.();
  const rootHeaders = headersConfig?.find(
    (entry) => entry.source === "/:path*",
  );

  return new Map(
    rootHeaders?.headers.map((header) => [header.key, header.value]) ?? [],
  );
}

describe("security configuration", () => {
  it("applies baseline browser security headers to every route", async () => {
    const headers = await getHeaderMap();

    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(headers.get("Permissions-Policy")).toContain("camera=()");
    expect(headers.get("Permissions-Policy")).toContain("microphone=()");
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("X-DNS-Prefetch-Control")).toBe("off");
    expect(headers.get("Cross-Origin-Opener-Policy")).toBe("same-origin");
    expect(headers.get("Cross-Origin-Resource-Policy")).toBe("same-origin");
    expect(headers.get("Strict-Transport-Security")).toBe(
      "max-age=63072000; includeSubDomains; preload",
    );
  });

  it("keeps the global CSP restrictive for XSS and clickjacking", async () => {
    const headers = await getHeaderMap();
    const csp = headers.get("Content-Security-Policy");

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("frame-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("upgrade-insecure-requests");
  });

  it("configures the authentication session cookie defensively", () => {
    expect(authOptions.cookies?.sessionToken?.options).toMatchObject({
      httpOnly: true,
      sameSite: "strict",
      path: "/",
      maxAge: 24 * 60 * 60,
    });
  });
});
