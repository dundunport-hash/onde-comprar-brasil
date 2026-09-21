import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  Activity,
  BarChart3,
  Boxes,
  ClipboardList,
  FileText,
  ImagePlus,
  PackageCheck,
  Percent,
  PlusCircle,
  ReceiptText,
  ShieldCheck,
  Tag,
  TrendingUp,
  UserCog,
} from "lucide-react";
import {
  CartStatus,
  PaymentStatus,
  type StockMovementType,
} from "@prisma/client";
import { requireAdminSession } from "@/lib/admin";
import { currencyFormatter } from "@/lib/currencyFormatter";
import { prisma } from "@/lib/prisma";
import {
  getCartCountsByPaymentStatus,
  getCartCountsByStatus,
  getGroupedCount,
  getPaidCartMetrics,
} from "@/lib/prisma-analytics";
import { SITE_NAME } from "@/lib/store-contact";

export const metadata: Metadata = {
  title: `Dashboard | ${SITE_NAME}`,
  description: `Resumo administrativo da ${SITE_NAME}.`,
  robots: {
    index: false,
    follow: false,
  },
};

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

const paymentStatusLabels: Record<PaymentStatus, string> = {
  PENDING: "Pendente",
  PAID: "Pago",
  CANCELED: "Cancelado",
  FAILED: "Falhou",
};

const paymentStatusClasses: Record<PaymentStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  PAID: "bg-green-100 text-green-800",
  CANCELED: "bg-red-100 text-red-800",
  FAILED: "bg-red-100 text-red-800",
};

const movementLabels: Record<StockMovementType, string> = {
  IN: "Entrada",
  OUT: "Saida",
  ADJUSTMENT: "Ajuste",
  LOSS: "Perda",
  RETURN: "Retorno",
  EXPIRED: "Vencido",
};

export default async function DashboardPage() {
  const session = await requireAdminSession();
  const now = new Date();
  const expiringLimit = new Date(now);
  expiringLimit.setDate(expiringLimit.getDate() + 30);

  const [
    productCountsByStatus,
    categoryCount,
    activePromotions,
    stockTotals,
    cartCountsByStatus,
    cartCountsByPaymentStatus,
    paidCartMetrics,
    lowStockProducts,
    expiringStockCount,
    expiredStockCount,
    recentOrders,
    latestMovements,
  ] = await Promise.all([
    prisma.product.groupBy({
      by: ["active"],
      _count: {
        _all: true,
      },
    }),
    prisma.category.count(),
    prisma.promotion.count({ where: { active: true } }),
    prisma.stock.aggregate({
      _sum: {
        quantity: true,
        reservedQuantity: true,
      },
    }),
    getCartCountsByStatus(),
    getCartCountsByPaymentStatus(),
    getPaidCartMetrics(),
    prisma.product.findMany({
      where: {
        active: true,
        stock: {
          lte: 5,
        },
      },
      orderBy: [{ stock: "asc" }, { name: "asc" }],
      take: 5,
      select: {
        id: true,
        name: true,
        slug: true,
        stock: true,
      },
    }),
    prisma.stock.count({
      where: {
        quantity: {
          gt: 0,
        },
        expirationDate: {
          gt: now,
          lte: expiringLimit,
        },
      },
    }),
    prisma.stock.count({
      where: {
        quantity: {
          gt: 0,
        },
        expirationDate: {
          lt: now,
        },
      },
    }),
    prisma.cart.findMany({
      where: {
        OR: [
          {
            status: {
              in: [
                CartStatus.CHECKED_OUT,
                CartStatus.AWAITING_SHIPMENT,
                CartStatus.SEPARATED_SHIPPED,
              ],
            },
          },
          {
            paymentStatus: {
              in: [
                PaymentStatus.PAID,
                PaymentStatus.CANCELED,
                PaymentStatus.FAILED,
              ],
            },
          },
        ],
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 5,
      select: {
        id: true,
        paymentStatus: true,
        updatedAt: true,
        user: {
          select: {
            email: true,
          },
        },
        checkoutAddress: {
          select: {
            fullName: true,
            city: true,
            state: true,
          },
        },
        items: {
          select: {
            quantity: true,
            unitPrice: true,
          },
        },
      },
    }),
    prisma.stockMovement.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
      select: {
        id: true,
        type: true,
        quantity: true,
        createdAt: true,
        product: {
          select: {
            name: true,
          },
        },
      },
    }),
  ]);

  const activeProducts = getGroupedCount(productCountsByStatus, "active", true);
  const inactiveProducts = getGroupedCount(
    productCountsByStatus,
    "active",
    false,
  );
  const totalProducts = activeProducts + inactiveProducts;
  const checkedOutOrders = getGroupedCount(
    cartCountsByStatus,
    "status",
    CartStatus.CHECKED_OUT,
  );
  const paidOrders = getGroupedCount(
    cartCountsByPaymentStatus,
    "paymentStatus",
    PaymentStatus.PAID,
  );
  const pendingPayments = getGroupedCount(
    cartCountsByPaymentStatus,
    "paymentStatus",
    PaymentStatus.PENDING,
  );
  const stockQuantity = stockTotals._sum.quantity ?? 0;
  const reservedQuantity = stockTotals._sum.reservedQuantity ?? 0;
  const availableStock = Math.max(stockQuantity - reservedQuantity, 0);
  const paidRevenue = paidCartMetrics.revenue;

  const stats = [
    {
      href: "/dashboard/produtos",
      label: "Produtos",
      value: totalProducts,
      detail: `${activeProducts} ativos em ${categoryCount} categorias`,
      icon: PackageCheck,
    },
    {
      href: "/dashboard/estoque",
      label: "Estoque disponivel",
      value: availableStock,
      detail: `${reservedQuantity} unidades reservadas`,
      icon: Boxes,
    },
    {
      href: "/dashboard/promocoes",
      label: "Promocoes ativas",
      value: activePromotions,
      detail: "Descontos visiveis na loja",
      icon: Percent,
    },
    {
      href: "/dashboard/metricas",
      label: "Receita paga",
      value: currencyFormatter.format(paidRevenue),
      detail: `${paidOrders} pedidos pagos`,
      icon: TrendingUp,
    },
  ];

  const actionLinks = [
    {
      href: "/dashboard/produtos/novo",
      label: "Novo produto",
      description: "Cadastrar item no catalogo.",
      icon: PlusCircle,
    },
    {
      href: "/dashboard/produtos",
      label: "Gerenciar produtos",
      description: "Editar precos, status e categorias.",
      icon: PackageCheck,
    },
    {
      href: "/dashboard/estoque",
      label: "Movimentar estoque",
      description: "Registrar entradas, perdas e ajustes.",
      icon: ClipboardList,
    },
    {
      href: "/dashboard/promocoes",
      label: "Criar promocao",
      description: "Configurar descontos por periodo.",
      icon: Percent,
    },
    {
      href: "/dashboard/cupons",
      label: "Gerenciar cupons",
      description: "Criar codigos de desconto para o carrinho.",
      icon: Tag,
    },
    {
      href: "/dashboard/usuarios",
      label: "Gerenciar usuarios",
      description: "Administrar clientes e permissoes.",
      icon: UserCog,
    },
    {
      href: "/dashboard/pedidos",
      label: "Gerenciar pedidos",
      description: "Acompanhar pagamentos e status.",
      icon: ReceiptText,
    },
    {
      href: "/dashboard/banners",
      label: "Banners da hero",
      description: "Atualizar carrossel responsivo.",
      icon: ImagePlus,
    },
    {
      href: "/dashboard/conteudo",
      label: "Conteudo do site",
      description: "Editar paginas Sobre e Termos.",
      icon: FileText,
    },
    {
      href: "/dashboard/metricas",
      label: "Ver metricas",
      description: "Analisar vendas, funil e estoque.",
      icon: BarChart3,
    },
    {
      href: "/dashboard/auditoria",
      label: "Ver auditoria",
      description: "Consultar eventos administrativos.",
      icon: ShieldCheck,
    },
    {
      href: "/dashboard/observabilidade",
      label: "Ver observabilidade",
      description: "Monitorar runtime, erros e sinais internos.",
      icon: Activity,
    },
  ];

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex flex-col gap-5 border-b border-border pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            Dashboard admin
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Visao geral da loja
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Acompanhe catalogo, estoque, promocoes e pedidos em um unico painel
            operacional.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-surface px-4 py-3 text-sm shadow-sm">
          <p className="font-medium text-foreground">
            {session.user?.name ?? "Administrador"}
          </p>
          <p className="text-muted">{session.user?.email}</p>
        </div>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="rounded-lg border border-border bg-surface p-5 shadow-sm transition hover:border-primary"
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
            </Link>
          );
        })}
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {actionLinks.map((action) => {
          const Icon = action.icon;

          return (
            <Link
              key={action.href}
              href={action.href}
              className="rounded-lg border border-border bg-background p-4 transition hover:border-primary/10  hover:bg-surface"
            >
              <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 className="mt-3 font-semibold">{action.label}</h2>
              <p className="mt-1 text-sm text-muted">{action.description}</p>
            </Link>
          );
        })}
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
          <div className="flex flex-col gap-2 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Pedidos recentes</h2>
              <p className="text-sm text-muted">
                {checkedOutOrders} pedidos finalizados, {pendingPayments} com
                pagamento pendente.
              </p>
            </div>
            <ReceiptText className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>

          {recentOrders.length === 0 ? (
            <div className="p-6 text-sm text-muted">
              Nenhum pedido finalizado ainda.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-180 text-left text-sm">
                <thead className="border-b border-border bg-background">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Cliente</th>
                    <th className="px-4 py-3 font-semibold">Local</th>
                    <th className="px-4 py-3 font-semibold">Total</th>
                    <th className="px-4 py-3 font-semibold">Pagamento</th>
                    <th className="px-4 py-3 font-semibold">Atualizado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentOrders.map((order) => (
                    <tr key={order.id}>
                      <td className="px-4 py-3">
                        <div className="font-medium">
                          {order.checkoutAddress?.fullName ??
                            order.user?.email ??
                            "Cliente sem cadastro"}
                        </div>
                        <div className="text-xs text-muted">
                          {order.user?.email ?? "Compra anonima"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {order.checkoutAddress
                          ? `${order.checkoutAddress.city}/${order.checkoutAddress.state}`
                          : "Endereco nao informado"}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {currencyFormatter.format(
                          order.items.reduce(
                            (total, item) =>
                              total + item.quantity * item.unitPrice,
                            0,
                          ),
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            paymentStatusClasses[order.paymentStatus]
                          }`}
                        >
                          {paymentStatusLabels[order.paymentStatus]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {dateTimeFormatter.format(order.updatedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="grid gap-6">
          <section className="rounded-lg border border-border bg-surface shadow-sm">
            <div className="flex items-center justify-between gap-4 border-b border-border p-5">
              <div>
                <h2 className="text-lg font-semibold">Alertas de estoque</h2>
                <p className="text-sm text-muted">
                  {expiredStockCount} vencidos, {expiringStockCount} vencem em
                  30 dias.
                </p>
              </div>
              <AlertTriangle
                className="h-5 w-5 text-primary"
                aria-hidden="true"
              />
            </div>

            {lowStockProducts.length === 0 ? (
              <div className="p-5 text-sm text-muted">
                Nenhum produto ativo com estoque baixo.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {lowStockProducts.map((product) => (
                  <Link
                    key={product.id}
                    href={`/dashboard/produtos/${product.id}/editar`}
                    className="flex items-center justify-between gap-4 p-4 transition hover:bg-background"
                  >
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-xs text-muted">{product.slug}</p>
                    </div>
                    <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-800">
                      {product.stock} un.
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-lg border border-border bg-surface shadow-sm">
            <div className="border-b border-border p-5">
              <h2 className="text-lg font-semibold">Ultimas movimentacoes</h2>
              <p className="text-sm text-muted">
                Auditoria recente de estoque.
              </p>
            </div>

            {latestMovements.length === 0 ? (
              <div className="p-5 text-sm text-muted">
                Nenhuma movimentacao registrada.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {latestMovements.map((movement) => (
                  <div
                    key={movement.id}
                    className="grid gap-2 p-4 text-sm sm:grid-cols-[1fr_auto]"
                  >
                    <div>
                      <p className="font-medium">{movement.product.name}</p>
                      <p className="text-muted">
                        {movementLabels[movement.type]} de {movement.quantity}{" "}
                        unidades
                      </p>
                    </div>
                    <p className="text-muted">
                      {dateTimeFormatter.format(movement.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
