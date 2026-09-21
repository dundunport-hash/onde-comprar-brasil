import type { Instrumentation } from "next";

export async function register() {
  if (process.env.NODE_ENV === "production") {
    await import("@/lib/env");
  }

  const { recordObservabilityEvent } = await import("@/lib/observability");

  recordObservabilityEvent({
    level: "info",
    scope: "next.runtime",
    message: "Observabilidade inicializada",
    metadata: {
      nodeEnv: process.env.NODE_ENV,
      nextRuntime: process.env.NEXT_RUNTIME ?? "nodejs",
    },
  });
}

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  const { recordObservabilityEvent } = await import("@/lib/observability");

  recordObservabilityEvent({
    level: "error",
    scope: "next.request",
    message: "Erro de servidor capturado pelo Next",
    error,
    metadata: {
      path: request.path,
      method: request.method,
      routePath: context.routePath,
      routeType: context.routeType,
      routerKind: context.routerKind,
      renderSource: context.renderSource,
      revalidateReason: context.revalidateReason,
    },
  });
};
