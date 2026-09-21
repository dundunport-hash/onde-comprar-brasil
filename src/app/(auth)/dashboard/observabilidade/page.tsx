import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Clock3,
  Cpu,
  Server,
} from "lucide-react";
import { requireAdminSession } from "@/lib/admin";
import { getObservabilitySnapshot } from "@/lib/observability";
import { SITE_NAME } from "@/lib/store-contact";

export const metadata: Metadata = {
  title: `Observabilidade | ${SITE_NAME}`,
  description: "Monitoramento operacional da aplicacao.",
  robots: {
    index: false,
    follow: false,
  },
};

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

function formatBytes(value?: number) {
  if (!value) {
    return "0 MB";
  }

  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function formatDuration(ms: number) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}min`;
  }

  if (minutes > 0) {
    return `${minutes}min ${seconds % 60}s`;
  }

  return `${seconds}s`;
}

function getLevelClass(level: string) {
  if (level === "error") {
    return "bg-red-100 text-red-800";
  }

  if (level === "warn") {
    return "bg-yellow-100 text-yellow-800";
  }

  return "bg-green-100 text-green-800";
}

export default async function ObservabilityPage() {
  await requireAdminSession();

  const snapshot = getObservabilitySnapshot();
  const memory = snapshot.runtime.memory;
  const lastEvent = snapshot.events[0];
  const topScopes = snapshot.scopeCounts.slice(0, 6);

  const stats = [
    {
      label: "Uptime",
      value: formatDuration(snapshot.uptimeMs),
      detail: `Desde ${dateTimeFormatter.format(new Date(snapshot.startedAt))}`,
      icon: Clock3,
    },
    {
      label: "Eventos recentes",
      value: snapshot.eventCount,
      detail: `Janela em memoria: ${snapshot.maxEvents}`,
      icon: Activity,
    },
    {
      label: "Erros capturados",
      value: snapshot.levelCounts.error,
      detail: `${snapshot.levelCounts.warn} alertas registrados`,
      icon: AlertTriangle,
    },
    {
      label: "Heap usado",
      value: formatBytes(memory?.heapUsed),
      detail: `RSS ${formatBytes(memory?.rss)}`,
      icon: Cpu,
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
            Voltar ao dashboard
          </Link>
          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            Observabilidade
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Saude operacional da aplicacao
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Acompanhe inicializacao, erros capturados pelo Next, consumo de
            memoria e eventos internos sem expor dados sensiveis.
          </p>
        </div>

        <Link
          href="/api/observability"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold shadow-sm transition hover:border-primary"
        >
          <Server className="h-4 w-4" aria-hidden="true" />
          JSON
        </Link>
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

      <section className="mt-8 grid gap-6 xl:grid-cols-[1fr_1.5fr]">
        <div className="rounded-lg border border-border bg-surface shadow-sm">
          <div className="border-b border-border p-5">
            <h2 className="text-lg font-semibold">Escopos monitorados</h2>
            <p className="text-sm text-muted">
              Distribuicao dos eventos por origem.
            </p>
          </div>

          {topScopes.length === 0 ? (
            <div className="p-5 text-sm text-muted">
              Nenhum evento registrado nesta instancia.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {topScopes.map((item) => (
                <div
                  key={item.scope}
                  className="flex items-center justify-between gap-4 p-4 text-sm"
                >
                  <span className="font-medium">{item.scope}</span>
                  <span className="rounded-full bg-background px-2.5 py-1 text-xs font-semibold text-primary">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
          <div className="flex flex-col gap-2 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Eventos recentes</h2>
              <p className="text-sm text-muted">
                {lastEvent
                  ? `Ultimo evento em ${dateTimeFormatter.format(
                      new Date(lastEvent.timestamp),
                    )}`
                  : "Aguardando novos sinais."}
              </p>
            </div>
            <Activity className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>

          {snapshot.events.length === 0 ? (
            <div className="p-6 text-sm text-muted">
              Nenhum evento de observabilidade registrado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-left text-sm">
                <thead className="border-b border-border bg-background">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Nivel</th>
                    <th className="px-4 py-3 font-semibold">Escopo</th>
                    <th className="px-4 py-3 font-semibold">Mensagem</th>
                    <th className="px-4 py-3 font-semibold">Duracao</th>
                    <th className="px-4 py-3 font-semibold">Horario</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {snapshot.events.slice(0, 12).map((event) => (
                    <tr key={event.id}>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getLevelClass(
                            event.level,
                          )}`}
                        >
                          {event.level}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">{event.scope}</td>
                      <td className="px-4 py-3">
                        <p>{event.message}</p>
                        {event.error ? (
                          <p className="mt-1 text-xs text-muted">
                            {event.error.name}: {event.error.message}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {typeof event.durationMs === "number"
                          ? `${event.durationMs} ms`
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {dateTimeFormatter.format(new Date(event.timestamp))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
