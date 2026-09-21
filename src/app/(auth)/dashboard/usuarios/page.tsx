import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Mail,
  Search,
  ShieldCheck,
  ShoppingCart,
  UserCog,
  Users,
} from "lucide-react";
import { requireAdminSession } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { getGroupedCount } from "@/lib/prisma-analytics";
import { sanitizeText } from "@/lib/sanitize";
import { SITE_NAME } from "@/lib/store-contact";
import { updateUserRole } from "./actions";

export const metadata: Metadata = {
  title: `Usuarios | Dashboard ${SITE_NAME}`,
  description: "Gestao administrativa de usuarios e permissoes.",
  robots: {
    index: false,
    follow: false,
  },
};

type UsersSearchParams = {
  q?: string | string[];
  role?: string | string[];
};

type UserFilters = {
  q: string;
  role: "ADMIN" | "USER" | "";
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
});

const roleLabels: Record<"ADMIN" | "USER", string> = {
  ADMIN: "Administrador",
  USER: "Cliente",
};

const roleClasses: Record<"ADMIN" | "USER", string> = {
  ADMIN: "bg-green-100 text-green-800",
  USER: "bg-zinc-100 text-zinc-700",
};

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getValidRole(value: string | undefined): UserFilters["role"] {
  if (value === "ADMIN" || value === "USER") {
    return value;
  }

  return "";
}

function getUserFilters(query: UsersSearchParams): UserFilters {
  return {
    q: sanitizeText(getSingleParam(query.q), { maxLength: 120 }),
    role: getValidRole(
      sanitizeText(getSingleParam(query.role), { maxLength: 30 }),
    ),
  };
}

function buildUsersWhere(filters: UserFilters) {
  const where: Record<string, unknown> = {};

  if (filters.role) {
    where.role = filters.role;
  }

  if (filters.q) {
    where.OR = [
      {
        name: {
          contains: filters.q,
          mode: "insensitive",
        },
      },
      {
        email: {
          contains: filters.q,
          mode: "insensitive",
        },
      },
    ];
  }

  return where;
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<UsersSearchParams>;
}) {
  const session = await requireAdminSession();
  const query = await searchParams;
  const filters = getUserFilters(query);
  const where = buildUsersWhere(filters);
  const hasActiveFilters = Boolean(filters.q || filters.role);

  const [users, filteredUsers, userCountsByRole, usersWithOrders] =
    await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        take: 80,
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          role: true,
          createdAt: true,
          resetTokenExpiry: true,
          _count: {
            select: {
              carts: true,
              checkoutAddresses: true,
              stockMovements: true,
            },
          },
          carts: {
            where: {
              paymentStatus: "PAID",
            },
            select: {
              id: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
      prisma.user.groupBy({
        by: ["role"],
        _count: {
          _all: true,
        },
      }),
      prisma.user.count({
        where: {
          carts: {
            some: {
              paymentStatus: "PAID",
            },
          },
        },
      }),
    ]);

  const totalUsers = userCountsByRole.reduce(
    (total, row) => total + row._count._all,
    0,
  );
  const admins = getGroupedCount(userCountsByRole, "role", "ADMIN");
  const customers = getGroupedCount(userCountsByRole, "role", "USER");
  const stats = [
    {
      label: "Usuarios filtrados",
      value: filteredUsers,
      detail: `${users.length} exibidos de ${totalUsers}`,
      icon: Users,
    },
    {
      label: "Administradores",
      value: admins,
      detail: "Acesso ao dashboard",
      icon: ShieldCheck,
    },
    {
      label: "Clientes",
      value: customers,
      detail: "Usuarios comuns",
      icon: UserCog,
    },
    {
      label: "Com pedidos pagos",
      value: usersWithOrders,
      detail: "Clientes com historico de compra",
      icon: ShoppingCart,
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
            Gestao
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Usuarios
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Consulte clientes, acompanhe historico e gerencie permissoes
            administrativas.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-surface px-4 py-3 text-sm shadow-sm">
          <p className="text-muted">Administrador atual</p>
          <p className="font-medium text-foreground">{session.user?.email}</p>
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
        action="/dashboard/usuarios"
        className="mt-8 grid gap-4 rounded-lg border border-border bg-surface p-4 shadow-sm"
      >
        <div className="grid gap-4 lg:grid-cols-[1fr_180px_auto] lg:items-end">
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
                placeholder="Nome ou e-mail"
                className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-foreground outline-none focus:border-primary/10 focus:ring-2 focus:ring-primary/10 "
              />
            </div>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="role">
              Papel
            </label>
            <select
              id="role"
              name="role"
              defaultValue={filters.role}
              className="rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-primary/10 focus:ring-2 focus:ring-primary/10 "
            >
              <option value="">Todos</option>
              <option value="ADMIN">{roleLabels.ADMIN}</option>
              <option value="USER">{roleLabels.USER}</option>
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
              href="/dashboard/usuarios"
              className="text-sm font-medium text-primary hover:underline"
            >
              Limpar filtros
            </Link>
          </div>
        )}
      </form>

      <section className="mt-8 overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        {users.length === 0 ? (
          <div className="p-8 text-center">
            <h2 className="text-lg font-semibold">Nenhum usuario encontrado</h2>
            <p className="mt-2 text-sm text-muted">
              Ajuste os filtros para consultar outros cadastros.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] border-collapse text-left text-sm">
              <thead className="border-b border-border bg-background">
                <tr>
                  <th className="px-4 py-3 font-semibold">Usuario</th>
                  <th className="px-4 py-3 font-semibold">Cadastro</th>
                  <th className="px-4 py-3 font-semibold">Atividade</th>
                  <th className="px-4 py-3 font-semibold">Seguranca</th>
                  <th className="px-4 py-3 font-semibold">Permissao</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => {
                  const role =
                    user.role === "ADMIN" || user.role === "USER"
                      ? user.role
                      : "USER";

                  return (
                    <tr key={user.id} className="align-top">
                      <td className="px-4 py-4">
                        <div className="flex items-start gap-3">
                          {user.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={user.image}
                              alt=""
                              className="h-10 w-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background text-sm font-semibold text-primary">
                              {(user.name ?? user.email)
                                .slice(0, 1)
                                .toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold">
                              {user.name ?? "Sem nome"}
                            </div>
                            <div className="mt-1 flex items-center gap-1 text-xs text-muted">
                              <Mail
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                              {user.email}
                            </div>
                            {session.user?.id === user.id && (
                              <span className="mt-2 inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                                Voce
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 text-muted">
                          <CalendarDays
                            className="h-4 w-4 text-primary"
                            aria-hidden="true"
                          />
                          {dateFormatter.format(user.createdAt)}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="grid gap-1 text-muted">
                          <p>{user._count.carts} carrinhos</p>
                          <p>{user.carts.length} pedidos pagos</p>
                          <p>{user._count.checkoutAddresses} enderecos</p>
                          {user._count.stockMovements > 0 && (
                            <p>{user._count.stockMovements} mov. estoque</p>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        {user.resetTokenExpiry &&
                        user.resetTokenExpiry > new Date() ? (
                          <span className="rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-semibold text-yellow-800">
                            Reset pendente
                          </span>
                        ) : (
                          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700">
                            Regular
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <form action={updateUserRole} className="grid gap-2">
                          <input type="hidden" name="userId" value={user.id} />
                          <span
                            className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${roleClasses[role]}`}
                          >
                            {roleLabels[role]}
                          </span>
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <select
                              name="role"
                              defaultValue={role}
                              className="rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-primary/10 focus:ring-2 focus:ring-primary/10 "
                            >
                              <option value="USER">{roleLabels.USER}</option>
                              <option value="ADMIN">{roleLabels.ADMIN}</option>
                            </select>
                            <button
                              type="submit"
                              className="rounded-lg bg-secondary px-3 py-2 text-sm font-medium text-foreground transition hover:bg-secondary/90"
                            >
                              Salvar
                            </button>
                          </div>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {filteredUsers > users.length && (
        <div className="mt-4 text-sm text-muted">
          Exibindo os 80 usuarios mais recentes. Refine os filtros para
          localizar cadastros antigos.
        </div>
      )}
    </main>
  );
}
