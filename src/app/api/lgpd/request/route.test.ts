import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/audit", () => ({
  recordAuditLog: vi.fn(),
}));

import { recordAuditLog } from "@/lib/audit";
import { clearRateLimitStore } from "@/lib/rate-limit";
import { POST } from "./route";

const mockedRecordAuditLog = vi.mocked(recordAuditLog);

beforeEach(() => {
  vi.clearAllMocks();
  clearRateLimitStore();
});

function buildRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/lgpd/request", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "127.0.0.1",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/lgpd/request", () => {
  it("validates required LGPD request fields", async () => {
    const response = await POST(buildRequest({ email: "test@example.com" }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("Preencha");
    expect(mockedRecordAuditLog).not.toHaveBeenCalled();
  });

  it("sanitizes and records a LGPD request protocol", async () => {
    const response = await POST(
      buildRequest({
        name: " <b>Maria Silva</b> ",
        email: " MARIA@Example.COM ",
        requestType: "access",
        details: " Quero acessar meus dados <script>alert(1)</script> ",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.protocol).toMatch(/^LGPD-/);
    expect(mockedRecordAuditLog).toHaveBeenCalledWith({
      action: "lgpd.request.submit",
      entity: "PrivacyRequest",
      entityId: body.protocol,
      actor: {
        email: "maria@example.com",
      },
      metadata: expect.objectContaining({
        protocol: body.protocol,
        requestType: "access",
        requesterName: "Maria Silva",
        requesterEmail: "maria@example.com",
        detailsPreview: "Quero acessar meus dados",
      }),
    });
  });
});
