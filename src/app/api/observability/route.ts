import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin";
import {
  getObservabilitySnapshot,
  recordObservabilityEvent,
} from "@/lib/observability";

export async function GET(request: Request) {
  const session = await requireAdminSession();
  const path = new URL(request.url).pathname;

  recordObservabilityEvent({
    level: "info",
    scope: "api.observability",
    message: "Snapshot de observabilidade solicitado",
    metadata: {
      path,
      actorId: session.user?.id,
      actorEmail: session.user?.email,
    },
  });

  return NextResponse.json(getObservabilitySnapshot(), {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
