import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/admin", () => ({
  requireAdminSession: vi.fn(),
}));

import { requireAdminSession } from "@/lib/admin";
import { clearObservabilityForTests } from "@/lib/observability";
import { GET } from "./route";

const mockedRequireAdminSession = vi.mocked(requireAdminSession);

beforeEach(() => {
  vi.clearAllMocks();
  clearObservabilityForTests();
  mockedRequireAdminSession.mockResolvedValue({
    user: {
      id: "admin-1",
      email: "admin@example.com",
      role: "ADMIN",
    },
    expires: new Date(Date.now() + 60_000).toISOString(),
  });
});

describe("GET /api/observability", () => {
  it("requires an admin session and returns the current snapshot", async () => {
    const response = await GET(
      new Request("http://localhost/api/observability"),
    );
    const body = await response.json();

    expect(mockedRequireAdminSession).toHaveBeenCalled();
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body.eventCount).toBe(1);
    expect(body.events[0]).toMatchObject({
      level: "info",
      scope: "api.observability",
      message: "Snapshot de observabilidade solicitado",
      metadata: {
        path: "/api/observability",
        actorId: "admin-1",
        actorEmail: "admin@example.com",
      },
    });
  });
});
