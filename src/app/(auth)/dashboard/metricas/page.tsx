import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  Boxes,
  CircleDollarSign,
  PackageSearch,
  Percent,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import { CartStatus, PaymentStatus } from "@prisma/client";
import { requireAdminSession } from "@/lib/admin";
import { currencyFormatter } from "@/lib/currencyFormatter";
import { prisma } from "@/lib/prisma";
import {
  getCartCountsByPaymentStatus,
  getCartCountsByStatus,
  getDailyPaidSales,
  getGroupedCount,
  getInventoryValue,
  getPaidCartMetrics,
  getTopPaidProducts,
} from "@/lib/prisma-analytics";
import { SITE_NAME } from "@/lib/store-contact";

export const metadata: Metadata = {
  title: `Metricas | Dashboard ${SITE_NAME}`,
  description: "Indicadores administrativos de vendas, estoque e catalogo.",
  robots: {
    index: false,
    follow: false,
  },
};

const dayFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
});

const integerFormatter = new Intl.NumberFormat("pt-BR");
const percentFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
});

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_IN_MS);
}

function getPercent(value: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return (value / total) * 100;
}

export default async function MetricsPage() {
  await requireAdminSession();

  const now = new Date();
  const today = startOfDay(now);
  const lastSevenDaysStart = addDays(today, -6);
  const lastThirtyDaysStart = addDays(today, -29);

  const [
    paidCartMetrics,
    paidCartMetricsLastThirtyDays,
    dailyPaidSales,
    cartCountsByStatus,
    cartCountsByPaymentStatus,
    users,
    productCountsByStatus,
    outOfStockProducts,
    lowStockProducts,
    inventoryValue,
    categories,
    activePromotions,
    scheduledPromotions,
    expiredPromotions,
    stockTotals,
    topProducts,
  ] = await Promise.all([
    getPaidCartMetrics(),
    getPaidCartMetrics(lastThirtyDaysStart),
    getDailyPaidSales(lastSevenDaysStart),
    getCartCountsByStatus(),
    getCartCountsByPaymentStatus(),
    prisma.user.count(),
    prisma.product.groupBy({
      by: ["active"],
      _count: {
        _all: true,
      },
    }),
    prisma.product.count({ where: { active: true, stock: 0 } }),
    prisma.product.count({ where: { active: true, stock: { lte: 5 } } }),
    getInventoryValue(),
    prisma.category.findMany({
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            products: true,
          },
        },
      },
    }),
    prisma.promotion.count({
      where: {
        active: true,
        startDate: {
          lte: now,
        },
        endDate: {
          gte: now,
        },
      },
    }),
    prisma.promotion.count({
      where: {
        active: true,
        startDate: {
          gt: now,
        },
      },
    }),
    prisma.promotion.count({
      where: {
        endDate: {
          lt: now,
        },
      },
    }),
    prisma.stock.aggregate({
      _sum: {
        quantity: true,
        reservedQuantity: true,
      },
    }),
    getTopPaidProducts(5),
  ]);

  const totalCarts = cartCountsByStatus.reduce(
    (total, row) => total + row._count._all,
    0,
  );
  const activeCarts = getGroupedCount(
    cartCountsByStatus,
    "status",
    CartStatus.ACTIVE,
  );
  const abandonedCarts = getGroupedCount(
    cartCountsByStatus,
    "status",
    CartStatus.ABANDONED,
  );
  const checkedOutCarts = getGroupedCount(
    cartCountsByStatus,
    "status",
    CartStatus.CHECKED_OUT,
  );
  const pendingPayments = getGroupedCount(
    cartCountsByPaymentStatus,
    "paymentStatus",
    PaymentStatus.PENDING,
  );
  const failedPayments = getGroupedCount(
    cartCountsByPaymentStatus,
    "paymentStatus",
    PaymentStatus.FAILED,
  );
  const canceledPayments = getGroupedCount(
    cartCountsByPaymentStatus,
    "paymentStatus",
    PaymentStatus.CANCELED,
  );
  const activeProducts = getGroupedCount(productCountsByStatus, "active", true);
  const inactiveProducts = getGroupedCount(
    productCountsByStatus,
    "active",
    false,
  );
  const paidOrders = paidCartMetrics.orders;
  const revenue = paidCartMetrics.revenue;
  const revenueLastThirtyDays = paidCartMetricsLastThirtyDays.revenue;
  const itemsSoldLastThirtyDays = paidCartMetricsLastThirtyDays.itemsSold;
  const averageTicket =
    paidCartMetricsLastThirtyDays.orders > 0
      ? revenueLastThirtyDays / paidCartMetricsLastThirtyDays.orders
      : 0;

  const stockQuantity = stockTotals._sum.quantity ?? 0;
  const reservedQuantity = stockTotals._sum.reservedQuantity ?? 0;
  const availableStock = Math.max(stockQuantity - reservedQuantity, 0);
  const catalogTotal = activeProducts + inactiveProducts;

  const dailySales = Array.from({ length: 7 }, (_, index) => {
    const day = addDays(lastSevenDaysStart, index);
    const sales = dailyPaidSales.find(
      (row) => startOfDay(row.day).getTime() === day.getTime(),
    );

    return {
      label: dayFormatter.format(day),
      orders: sales?.orders ?? 0,
      revenue: sales?.revenue ?? 0,
    };
  });

  const maxDailyRevenue = Math.max(...dailySales.map((day) => day.revenue), 1);

  const biggestCategoryCount = Math.max(
    ...categories.map((category) => category._count.products),
    1,
  );

  const metricCards = [
    {
      label: "Receita 30 dias",
      value: currencyFormatter.format(revenueLastThirtyDays),
      detail: `${paidCartMetricsLastThirtyDays.orders} pedidos pagos`,
      icon: CircleDollarSign,
    },
    {
      label: "Ticket medio",
      value: currencyFormatter.format(averageTicket),
      detail: "Media dos pedidos pagos recentes",
      icon: TrendingUp,
    },
    {
      label: "Itens vendidos",
      value: integerFormatter.format(itemsSoldLastThirtyDays),
      detail: "Unidades nos ultimos 30 dias",
      icon: ShoppingCart,
    },
    {
      label: "Receita total",
      value: currencyFormatter.format(revenue),
      detail: `${paidOrders} pedidos pagos no historico`,
      icon: BarChart3,
    },
  ];

  const funnelRows = [
    {
      label: "Carrinhos criados",
      value: totalCarts,
      percent: 100,
    },
    {
      label: "Checkouts finalizados",
      value: checkedOutCarts,
      percent: getPercent(checkedOutCarts, totalCarts),
    },
    {
      label: "Pagamentos aprovados",
      value: paidOrders,
      percent: getPercent(paidOrders, totalCarts),
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
            Metricas
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Indicadores da loja
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Acompanhe desempenho comercial, funil de compra, catalogo, promocoes
            e saude do estoque.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4 lg:min-w-130">
          <div className="rounded-lg border border-border bg-surface p-3">
            <p className="text-muted">Usuarios</p>
            <p className="text-xl font-semibold">{users}</p>
          </div>
          <div className="rounded-lg border border-border bg-surface p-3">
            <p className="text-muted">Ativos</p>
            <p className="text-xl font-semibold">{activeCarts}</p>
          </div>
          <div className="rounded-lg border border-border bg-surface p-3">
            <p className="text-muted">Pendentes</p>
            <p className="text-xl font-semibold">{pendingPayments}</p>
          </div>
          <div className="rounded-lg border border-border bg-surface p-3">
            <p className="text-muted">Abandono</p>
            <p className="text-xl font-semibold">{abandonedCarts}</p>
          </div>
        </div>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((metric) => {
          const Icon = metric.icon;

          return (
            <div
              key={metric.label}
              className="rounded-lg border border-border bg-surface p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-muted">
                    {metric.label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">
                    {metric.value}
                  </p>
                </div>
                <span className="rounded-lg bg-background p-2 text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
              </div>
              <p className="mt-4 text-sm text-muted">{metric.detail}</p>
            </div>
          );
        })}
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Vendas por dia</h2>
              <p className="text-sm text-muted">
                Receita paga nos ultimos 7 dias.
              </p>
            </div>
            <BarChart3 className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>

          <div className="mt-6 grid gap-4">
            {dailySales.map((day) => (
              <div
                key={day.label}
                className="grid gap-3 sm:grid-cols-[72px_1fr_150px] sm:items-center"
              >
                <p className="text-sm font-medium">{day.label}</p>
                <div className="h-3 overflow-hidden rounded-full bg-background">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{
                      width: `${Math.max((day.revenue / maxDailyRevenue) * 100, day.revenue > 0 ? 8 : 0)}%`,
                    }}
                  />
                </div>
                <p className="text-sm text-muted sm:text-right">
                  {currencyFormatter.format(day.revenue)} / {day.orders} ped.
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Funil de compra</h2>
              <p className="text-sm text-muted">
                Conversao de carrinho para pagamento.
              </p>
            </div>
            <TrendingUp className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>

          <div className="mt-6 grid gap-5">
            {funnelRows.map((row) => (
              <div key={row.label}>
                <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                  <p className="font-medium">{row.label}</p>
                  <p className="text-muted">
                    {integerFormatter.format(row.value)} (
                    {percentFormatter.format(row.percent)}%)
                  </p>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-background">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{
                      width: `${Math.max(row.percent, row.value > 0 ? 6 : 0)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-muted">Falhas</p>
              <p className="text-xl font-semibold">{failedPayments}</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-muted">Cancelados</p>
              <p className="text-xl font-semibold">{canceledPayments}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Catalogo</h2>
            <PackageSearch
              className="h-5 w-5 text-primary"
              aria-hidden="true"
            />
          </div>
          <div className="mt-5 grid gap-4 text-sm">
            <MetricRow
              label="Produtos ativos"
              value={`${activeProducts} de ${catalogTotal}`}
              percent={getPercent(activeProducts, catalogTotal)}
            />
            <MetricRow
              label="Produtos inativos"
              value={inactiveProducts}
              percent={getPercent(inactiveProducts, catalogTotal)}
            />
            <MetricRow
              label="Categorias"
              value={categories.length}
              percent={100}
            />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Estoque</h2>
            <Boxes className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div className="mt-5 grid gap-4 text-sm">
            <MetricRow
              label="Disponivel"
              value={`${availableStock} un.`}
              percent={getPercent(availableStock, stockQuantity)}
            />
            <MetricRow
              label="Reservado"
              value={`${reservedQuantity} un.`}
              percent={getPercent(reservedQuantity, stockQuantity)}
            />
            <MetricRow
              label="Valor em estoque"
              value={currencyFormatter.format(inventoryValue)}
              percent={100}
            />
            <MetricRow
              label="Estoque zerado"
              value={outOfStockProducts}
              percent={getPercent(outOfStockProducts, activeProducts)}
            />
            <MetricRow
              label="Estoque baixo"
              value={lowStockProducts}
              percent={getPercent(lowStockProducts, activeProducts)}
            />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Promocoes</h2>
            <Percent className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div className="mt-5 grid gap-4 text-sm">
            <MetricRow
              label="Ativas agora"
              value={activePromotions}
              percent={100}
            />
            <MetricRow
              label="Agendadas"
              value={scheduledPromotions}
              percent={100}
            />
            <MetricRow
              label="Encerradas"
              value={expiredPromotions}
              percent={100}
            />
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
          <div className="border-b border-border p-5">
            <h2 className="text-lg font-semibold">Produtos mais vendidos</h2>
            <p className="text-sm text-muted">
              Ranking por receita em pedidos pagos.
            </p>
          </div>

          {topProducts.length === 0 ? (
            <div className="p-6 text-sm text-muted">
              Nenhum produto vendido ainda.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="border-b border-border bg-background">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Produto</th>
                    <th className="px-4 py-3 font-semibold">Unidades</th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Receita
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {topProducts.map((product) => (
                    <tr key={product.id}>
                      <td className="px-4 py-3">
                        <div className="font-medium">{product.name}</div>
                        <div className="text-xs text-muted">{product.slug}</div>
                      </td>
                      <td className="px-4 py-3">
                        {integerFormatter.format(product.quantity)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {currencyFormatter.format(product.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Produtos por categoria</h2>
          <p className="text-sm text-muted">
            Distribuicao do catalogo cadastrado.
          </p>

          {categories.length === 0 ? (
            <div className="mt-5 text-sm text-muted">
              Nenhuma categoria cadastrada.
            </div>
          ) : (
            <div className="mt-6 grid gap-4">
              {categories.map((category) => {
                const percent = getPercent(
                  category._count.products,
                  biggestCategoryCount,
                );

                return (
                  <div
                    key={category.id}
                    className="grid gap-2 sm:grid-cols-[170px_1fr_72px] sm:items-center"
                  >
                    <p className="text-sm font-medium">{category.name}</p>
                    <div className="h-2 overflow-hidden rounded-full bg-background">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{
                          width: `${Math.max(percent, category._count.products > 0 ? 6 : 0)}%`,
                        }}
                      />
                    </div>
                    <p className="text-sm text-muted sm:text-right">
                      {category._count.products} prod.
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function MetricRow({
  label,
  value,
  percent,
}: {
  label: string;
  value: string | number;
  percent: number;
}) {
  const safePercent = Math.min(Math.max(percent, 0), 100);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-4">
        <p className="font-medium">{label}</p>
        <p className="text-muted">{value}</p>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-background">
        <div
          className="h-full rounded-full bg-primary"
          style={{
            width: `${Math.max(safePercent, Number(value) > 0 ? 6 : 0)}%`,
          }}
        />
      </div>
    </div>
  );
}
