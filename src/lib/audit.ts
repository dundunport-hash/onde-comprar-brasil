import { Prisma } from "@prisma/client";
import type { Session } from "next-auth";
import { recordObservabilityEvent } from "@/lib/observability";
import { prisma } from "@/lib/prisma";

const REDACTED_VALUE = "[redacted]";
const SENSITIVE_METADATA_KEY_PATTERN =
  /(authorization|cookie|password|senha|secret|token|api[-_]?key)/i;

type AuditActor = {
  id?: string | null;
  email?: string | null;
};

type AuditJsonValue = Prisma.InputJsonValue | null;

export type AuditLogInput = {
  action: string;
  entity: string;
  entityId?: string | null;
  actor?: AuditActor | null;
  metadata?: unknown | null;
};

export function getAuditActor(session: Session | null | undefined) {
  return {
    id: session?.user?.id ?? null,
    email: session?.user?.email ?? null,
  };
}

function normalizeAuditMetadata(metadata: unknown): AuditJsonValue | undefined {
  if (metadata === undefined) {
    return undefined;
  }

  if (metadata === null) {
    return null;
  }

  if (
    typeof metadata === "string" ||
    typeof metadata === "number" ||
    typeof metadata === "boolean"
  ) {
    return metadata;
  }

  if (metadata instanceof Date) {
    return metadata.toISOString();
  }

  if (Array.isArray(metadata)) {
    return metadata
      .map((item) => normalizeAuditMetadata(item))
      .filter((item): item is AuditJsonValue => item !== undefined);
  }

  if (metadata && typeof metadata === "object") {
    const entries = Object.entries(metadata)
      .map(([key, value]) => {
        const normalizedValue = SENSITIVE_METADATA_KEY_PATTERN.test(key)
          ? REDACTED_VALUE
          : normalizeAuditMetadata(value);

        return normalizedValue === undefined
          ? null
          : ([key, normalizedValue] as const);
      })
      .filter((entry): entry is readonly [string, AuditJsonValue] =>
        Boolean(entry),
      );

    return Object.fromEntries(entries) as Prisma.InputJsonObject;
  }

  return String(metadata);
}

export function redactAuditMetadata(metadata: unknown): AuditJsonValue {
  return normalizeAuditMetadata(metadata) ?? null;
}

export async function recordAuditLog({
  action,
  entity,
  entityId,
  actor,
  metadata,
}: AuditLogInput) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        entity,
        entityId: entityId ?? null,
        actorId: actor?.id ?? null,
        actorEmail: actor?.email ?? null,
        metadata: metadata == null ? undefined : redactAuditMetadata(metadata),
      },
    });
  } catch (error) {
    recordObservabilityEvent({
      level: "error",
      scope: "audit.persistence",
      message: "Falha ao persistir auditoria",
      error,
      metadata: {
        action,
        entity,
        entityId,
        actorId: actor?.id,
      },
    });

    if (process.env.NODE_ENV !== "test") {
      console.error("Erro ao registrar auditoria:", error);
    }
  }
}
