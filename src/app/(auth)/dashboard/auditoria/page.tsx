import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  Clock,
  Database,
  Search,
  ShieldCheck,
  User,
} from "lucide-react";
import { requireAdminSession } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { sanitizeText } from "@/lib/sanitize";
import { SITE_NAME } from "@/lib/store-contact";

export const metadata: Metadata = {
  title: `Auditoria | Dashboard ${SITE_NAME}`,
  description: "Trilha de auditoria administrativa e eventos sensiveis.",
  robots: {
    index: false,
    follow: false,
  },
};

const AUDIT_PAGE_SIZE = 40;

type AuditSearchParams = {
  q?: string | string[];
  action?: string | string[];
  entity?: string | string[];
  page?: string | string[];
};

type AuditFilters = {
  q: string;
  action: string;
  entity: string;
  page: number;
};

type AuditActionOption = {
  action: string;
};

type AuditEntityOption = {
  entity: string;
};

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getAuditFilters(query: AuditSearchParams): AuditFilters {
  return {
    q: sanitizeText(getSingleParam(query.q), { maxLength: 120 }),
    action: sanitizeText(getSingleParam(query.action), { maxLength: 120 }),
    entity: sanitizeText(getSingleParam(query.entity), { maxLength: 80 }),
    page: Math.max(Number(getSingleParam(query.page)) || 1, 1),
  };
}

function buildAuditWhere(filters: AuditFilters): Prisma.AuditLogWhereInput {
  const and: Prisma.AuditLogWhereInput[] = [];

  if (filters.action) {
    and.push({ action: filters.action });
  }

  if (filters.entity) {
    and.push({ entity: filters.entity });
  }

  if (filters.q) {
    and.push({
      OR: [
        { action: { contains: filters.q, mode: "insensitive" } },
        { entity: { contains: filters.q, mode: "insensitive" } },
        { entityId: { contains: filters.q, mode: "insensitive" } },
        { actorEmail: { contains: filters.q, mode: "insensitive" } },
      ],
    });
  }

  return and.length > 0 ? { AND: and } : {};
}

function buildAuditHref(
  filters: Partial<AuditFilters>,
  overrides: Partial<AuditFilters> = {},
) {
  const params = new URLSearchParams();
  const nextFilters = {
    ...filters,
    ...overrides,
  };

  if (nextFilters.q) {
    params.set("q", nextFilters.q);
  }

  if (nextFilters.action) {
    params.set("action", nextFilters.action);
  }

  if (nextFilters.entity) {
    params.set("entity", nextFilters.entity);
  }

  if (nextFilters.page && nextFilters.page > 1) {
    params.set("page", String(nextFilters.page));
  }

  const queryString = params.toString();
  return queryString
    ? `/dashboard/auditoria?${queryString}`
    : "/dashboard/auditoria";
}

function formatMetadata(metadata: unknown | null) {
  if (!metadata) {
    return "-";
  }

  return JSON.stringify(metadata, null, 2).slice(0, 900);
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<AuditSearchParams>;
}) {
  await requireAdminSession();

  const query = await searchParams;
  const filters = getAuditFilters(query);
  const where = buildAuditWhere(filters);
  const skip = (filters.page - 1) * AUDIT_PAGE_SIZE;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    auditLogs,
    filteredAuditLogs,
    totalAuditLogs,
    todayAuditLogs,
    authAuditLogs,
    actionOptions,
    entityOptions,
  ] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      take: AUDIT_PAGE_SIZE,
      skip,
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.count(),
    prisma.auditLog.count({
      where: {
        createdAt: {
          gte: today,
        },
      },
    }),
    prisma.auditLog.count({
      where: {
        action: {
          startsWith: "auth.",
        },
      },
    }),
    prisma.auditLog.groupBy({
      by: ["action"],
      orderBy: {
        action: "asc",
      },
    }),
    prisma.auditLog.groupBy({
      by: ["entity"],
      orderBy: {
        entity: "asc",
      },
    }),
  ]);

  const totalPages = Math.max(
    Math.ceil(filteredAuditLogs / AUDIT_PAGE_SIZE),
    1,
  );
  const hasActiveFilters = Boolean(
    filters.q || filters.action || filters.entity,
  );
  const auditActionOptions: AuditActionOption[] = actionOptions;
  const auditEntityOptions: AuditEntityOption[] = entityOptions;
  const stats = [
    {
      label: "Eventos filtrados",
      value: filteredAuditLogs,
      detail: `${auditLogs.length} exibidos de ${totalAuditLogs}`,
      icon: Activity,
    },
    {
      label: "Eventos hoje",
      value: todayAuditLogs,
      detail: "Registrados desde 00:00",
      icon: Clock,
    },
    {
      label: "Eventos de auth",
      value: authAuditLogs,
      detail: "Login, cadastro e senha",
      icon: ShieldCheck,
    },
    {
      label: "Entidades",
      value: entityOptions.length,
      detail: "Tipos auditados",
      icon: Database,
    },
  ];

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex flex-col gap-5 border-b border-border pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Dashboard
          </Link>
          <p className="mt-5 text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            Seguranca
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Auditoria
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Consulte a trilha de eventos administrativos, pagamentos, estoque e
            autenticacao.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-surface px-4 py-3 text-sm shadow-sm">
          <p className="text-muted">Retencao operacional</p>
          <p className="font-medium text-foreground">
            Eventos ordenados por data recente
          </p>
        </div>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className="rounded-lg border border-border bg-surface p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-muted">{stat.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">
                    {stat.value}
                  </p>
                </div>
                <span className="rounded-lg bg-background p-2 text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
              </div>
              <p className="mt-4 text-sm text-muted">{stat.detail}</p>
            </div>
          );
        })}
      </section>

      <form
        action="/dashboard/auditoria"
        className="mt-8 grid gap-4 rounded-lg border border-border bg-surface p-4 shadow-sm"
      >
        <div className="grid gap-4 lg:grid-cols-[1fr_220px_180px_auto] lg:items-end">
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="q">
              Busca
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                aria-hidden="true"
              />
              <input
                id="q"
                name="q"
                defaultValue={filters.q}
                placeholder="Acao, entidade, ID ou usuario"
                className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-foreground outline-none focus:border-primary/10  focus:ring-2 focus:ring-primary/10 "
              />
            </div>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="action">
              Acao
            </label>
            <select
              id="action"
              name="action"
              defaultValue={filters.action}
              className="rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-primary/10  focus:ring-2 focus:ring-primary/10 "
            >
              <option value="">Todas</option>
              {auditActionOptions.map((option) => (
                <option key={option.action} value={option.action}>
                  {option.action}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="entity">
              Entidade
            </label>
            <select
              id="entity"
              name="entity"
              defaultValue={filters.entity}
              className="rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-primary/10  focus:ring-2 focus:ring-primary/10 "
            >
              <option value="">Todas</option>
              {auditEntityOptions.map((option) => (
                <option key={option.entity} value={option.entity}>
                  {option.entity}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="rounded-lg bg-primary px-5 py-2 font-medium text-background transition hover:bg-primary/90"
          >
            Filtrar
          </button>
        </div>

        {hasActiveFilters && (
          <div>
            <Link
              href="/dashboard/auditoria"
              className="text-sm font-medium text-primary hover:underline"
            >
              Limpar filtros
            </Link>
          </div>
        )}
      </form>

      <section className="mt-8 overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        {auditLogs.length === 0 ? (
          <div className="p-8 text-center">
            <h2 className="text-lg font-semibold">
              Nenhum evento de auditoria encontrado
            </h2>
            <p className="mt-2 text-sm text-muted">
              Ajuste os filtros para consultar outros eventos.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-270 border-collapse text-left text-sm">
              <thead className="border-b border-border bg-background">
                <tr>
                  <th className="px-4 py-3 font-semibold">Quando</th>
                  <th className="px-4 py-3 font-semibold">Acao</th>
                  <th className="px-4 py-3 font-semibold">Entidade</th>
                  <th className="px-4 py-3 font-semibold">Ator</th>
                  <th className="px-4 py-3 font-semibold">Metadados</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="align-top">
                    <td className="whitespace-nowrap px-4 py-4 text-muted">
                      {dateTimeFormatter.format(log.createdAt)}
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-medium">{log.entity}</p>
                      <p className="mt-1 max-w-48 truncate text-xs text-muted">
                        {log.entityId ?? "Sem entidade especifica"}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-start gap-2">
                        <User
                          className="mt-0.5 h-4 w-4 text-primary"
                          aria-hidden="true"
                        />
                        <div>
                          <p className="font-medium">
                            {log.actorEmail ?? "Sistema"}
                          </p>
                          <p className="mt-1 max-w-48 truncate text-xs text-muted">
                            {log.actorId ?? "Sem usuario vinculado"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <pre className="max-h-40 max-w-xl overflow-auto rounded-lg bg-background p-3 text-xs leading-relaxed text-muted">
                        {formatMetadata(log.metadata)}
                      </pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="mt-5 flex flex-col gap-3 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          Pagina {Math.min(filters.page, totalPages)} de {totalPages}
        </p>
        <div className="flex gap-2">
          <Link
            aria-disabled={filters.page <= 1}
            href={
              filters.page <= 1
                ? buildAuditHref(filters)
                : buildAuditHref(filters, { page: filters.page - 1 })
            }
            className="rounded-lg border border-border px-3 py-2 font-medium transition hover:border-primary/10  hover:text-primary aria-disabled:pointer-events-none aria-disabled:opacity-50"
          >
            Anterior
          </Link>
          <Link
            aria-disabled={filters.page >= totalPages}
            href={
              filters.page >= totalPages
                ? buildAuditHref(filters)
                : buildAuditHref(filters, { page: filters.page + 1 })
            }
            className="rounded-lg border border-border px-3 py-2 font-medium transition hover:border-primary/10  hover:text-primary aria-disabled:pointer-events-none aria-disabled:opacity-50"
          >
            Proxima
          </Link>
        </div>
      </div>
    </main>
  );
}
