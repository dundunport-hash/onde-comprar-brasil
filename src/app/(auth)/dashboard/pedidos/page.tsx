import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  CreditCard,
  Download,
  FileText,
  MapPin,
  PackageCheck,
  ReceiptText,
  Search,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { CartStatus, PaymentStatus, type Prisma } from "@prisma/client";
import { requireAdminSession } from "@/lib/admin";
import { currencyFormatter } from "@/lib/currencyFormatter";
import { getMelhorEnvioShipmentScopeStatus } from "@/lib/melhor-envio";
import { prisma } from "@/lib/prisma";
import { sanitizeText } from "@/lib/sanitize";
import { isPickupShippingMethod } from "@/lib/shipping";
import { SITE_NAME } from "@/lib/store-contact";
import {
  deleteOrder,
  generateMelhorEnvioShippingLabel,
  updateOrderStatus,
  updatePaymentStatus,
} from "./actions";

export const metadata: Metadata = {
  title: `Pedidos | Dashboard ${SITE_NAME}`,
  description: "Gestao administrativa de pedidos e pagamentos.",
  robots: {
    index: false,
    follow: false,
  },
};

type OrdersSearchParams = {
  q?: string | string[];
  status?: string | string[];
  paymentStatus?: string | string[];
  labelFeedback?: string | string[];
  message?: string | string[];
  order?: string | string[];
};

type OrderFilters = {
  q: string;
  status: CartStatus | "";
  paymentStatus: PaymentStatus | "";
};

type DashboardOrderItem = {
  id: string;
  quantity: number;
  unitPrice: number;
  product: {
    name: string;
    slug: string;
    lengthCm: number;
    widthCm: number;
    heightCm: number;
    weightKg: number;
  };
};

type DashboardOrder = {
  id: string;
  status: CartStatus;
  paymentStatus: PaymentStatus;
  stripeCheckoutSessionId: string | null;
  mercadoPagoPaymentId: string | null;
  shippingLabel: string | null;
  shippingMethod: string | null;
  shippingPrice: number | null;
  shipmentId: string | null;
  shipmentTrackingCode: string | null;
  shipmentLabelRequestId: string | null;
  shipmentStatus: string | null;
  shipmentError: string | null;
  shipmentCreatedAt: Date | null;
  shipmentLabelRequestedAt: Date | null;
  prescriptionImageUrl: string | null;
  prescriptionUploadedAt: Date | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  user: {
    email: string;
  } | null;
  checkoutAddress: {
    fullName: string;
    document: string | null;
    phone: string;
    postalCode: string;
    street: string;
    number: string;
    complement: string | null;
    neighborhood: string;
    city: string;
    state: string;
  } | null;
  items: DashboardOrderItem[];
};

type GroupedCountRow<TField extends string> = {
  [key in TField]: string;
} & {
  _count: {
    _all: number;
  };
};

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

const cartStatusValues = [
  "ACTIVE",
  "CHECKED_OUT",
  "AWAITING_SHIPMENT",
  "SEPARATED_SHIPPED",
  "DELIVERED",
  "AWAITING_PICKUP",
  "ABANDONED",
  "EXPIRED",
] satisfies CartStatus[];

const cartStatusLabels: Record<CartStatus, string> = {
  ACTIVE: "Carrinho ativo",
  CHECKED_OUT: "Finalizado",
  AWAITING_SHIPMENT: "Aguardando envio",
  SEPARATED_SHIPPED: "Separado/enviado",
  DELIVERED: "Entregue",
  AWAITING_PICKUP: "Aguardando retirada na loja",
  ABANDONED: "Abandonado",
  EXPIRED: "Expirado",
};

const cartStatusClasses: Record<CartStatus, string> = {
  ACTIVE: "bg-yellow-100 text-yellow-800",
  CHECKED_OUT: "bg-green-100 text-green-800",
  AWAITING_SHIPMENT: "bg-amber-100 text-amber-800",
  SEPARATED_SHIPPED: "bg-blue-100 text-blue-800",
  DELIVERED: "bg-emerald-100 text-emerald-800",
  AWAITING_PICKUP: "bg-indigo-100 text-indigo-800",
  ABANDONED: "bg-red-100 text-red-800",
  EXPIRED: "bg-zinc-100 text-zinc-700",
};

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

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getValidCartStatus(value: string | undefined): CartStatus | "" {
  if (cartStatusValues.includes(value as CartStatus)) {
    return value as CartStatus;
  }

  return "";
}

function getValidPaymentStatus(value: string | undefined): PaymentStatus | "" {
  if (Object.values(PaymentStatus).includes(value as PaymentStatus)) {
    return value as PaymentStatus;
  }

  return "";
}

function getOrderFilters(query: OrdersSearchParams): OrderFilters {
  return {
    q: sanitizeText(getSingleParam(query.q), { maxLength: 120 }),
    status: getValidCartStatus(
      sanitizeText(getSingleParam(query.status), { maxLength: 30 }),
    ),
    paymentStatus: getValidPaymentStatus(
      sanitizeText(getSingleParam(query.paymentStatus), { maxLength: 30 }),
    ),
  };
}

function isObjectId(value: string) {
  return /^[a-f\d]{24}$/i.test(value);
}

function buildOrdersWhere(filters: OrderFilters): Prisma.CartWhereInput {
  const AND: Prisma.CartWhereInput[] = [];

  if (filters.status) {
    AND.push({ status: filters.status });
  }

  if (filters.paymentStatus) {
    AND.push({ paymentStatus: filters.paymentStatus });
  }

  if (filters.q) {
    const textSearch: Prisma.CartWhereInput[] = [
      { stripeCheckoutSessionId: { contains: filters.q, mode: "insensitive" } },
      { mercadoPagoPaymentId: { contains: filters.q, mode: "insensitive" } },
      {
        user: {
          is: {
            email: { contains: filters.q, mode: "insensitive" },
          },
        },
      },
      {
        checkoutAddress: {
          is: {
            OR: [
              { fullName: { contains: filters.q, mode: "insensitive" } },
              { phone: { contains: filters.q, mode: "insensitive" } },
            ],
          },
        },
      },
    ];

    if (isObjectId(filters.q)) {
      textSearch.unshift({ id: filters.q });
    }

    AND.push({ OR: textSearch });
  }

  return AND.length > 0 ? { AND } : {};
}

function getGroupedCount<TField extends string>(
  rows: Array<GroupedCountRow<TField>>,
  field: TField,
  value: string,
) {
  return rows.find((row) => row[field] === value)?._count._all ?? 0;
}

function getItemsTotal(
  items: Array<{
    quantity: number;
    unitPrice: number;
  }>,
) {
  return items.reduce(
    (total, item) => total + item.quantity * item.unitPrice,
    0,
  );
}

function getOrderTotal({
  items,
  shippingPrice,
}: {
  items: Array<{
    quantity: number;
    unitPrice: number;
  }>;
  shippingPrice: number | null;
}) {
  return getItemsTotal(items) + (shippingPrice ?? 0);
}

function getOrderCode(id: string) {
  return id.slice(0, 8).toUpperCase();
}

function buildOrdersHref(filters: OrderFilters) {
  const params = new URLSearchParams();

  if (filters.q) {
    params.set("q", filters.q);
  }

  if (filters.status) {
    params.set("status", filters.status);
  }

  if (filters.paymentStatus) {
    params.set("paymentStatus", filters.paymentStatus);
  }

  const query = params.toString();
  return query ? `/dashboard/pedidos?${query}` : "/dashboard/pedidos";
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<OrdersSearchParams>;
}) {
  await requireAdminSession();

  const query = await searchParams;
  const filters = getOrderFilters(query);
  const where = buildOrdersWhere(filters);
  const labelFeedback = sanitizeText(getSingleParam(query.labelFeedback), {
    maxLength: 30,
  });
  const labelFeedbackMessage = sanitizeText(getSingleParam(query.message), {
    maxLength: 420,
  });
  const labelFeedbackOrder = sanitizeText(getSingleParam(query.order), {
    maxLength: 20,
  });
  const showLabelErrorFeedback =
    labelFeedback === "error" && Boolean(labelFeedbackMessage);
  const melhorEnvioScopeStatus = getMelhorEnvioShipmentScopeStatus();
  const showMelhorEnvioScopeWarning =
    melhorEnvioScopeStatus.configured &&
    melhorEnvioScopeStatus.canVerifyScopes &&
    !melhorEnvioScopeStatus.canGenerateLabels;
  const hasActiveFilters = Boolean(
    filters.q || filters.status || filters.paymentStatus,
  );

  const [
    rawOrders,
    filteredOrders,
    cartCountsByStatus,
    cartCountsByPaymentStatus,
  ] = await Promise.all([
    prisma.cart.findMany({
      where,
      orderBy: {
        updatedAt: "desc",
      },
      take: 50,
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        stripeCheckoutSessionId: true,
        mercadoPagoPaymentId: true,
        shippingLabel: true,
        shippingMethod: true,
        shippingPrice: true,
        shipmentId: true,
        shipmentTrackingCode: true,
        shipmentLabelRequestId: true,
        shipmentStatus: true,
        shipmentError: true,
        shipmentCreatedAt: true,
        shipmentLabelRequestedAt: true,
        prescriptionImageUrl: true,
        prescriptionUploadedAt: true,
        paidAt: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            email: true,
          },
        },
        checkoutAddress: {
          select: {
            fullName: true,
            document: true,
            phone: true,
            postalCode: true,
            street: true,
            number: true,
            complement: true,
            neighborhood: true,
            city: true,
            state: true,
          },
        },
        items: {
          orderBy: {
            createdAt: "asc",
          },
          select: {
            id: true,
            quantity: true,
            unitPrice: true,
            product: {
              select: {
                name: true,
                slug: true,
                lengthCm: true,
                widthCm: true,
                heightCm: true,
                weightKg: true,
              },
            },
          },
        },
      },
    }),
    prisma.cart.count({ where }),
    prisma.cart.groupBy({
      by: ["status"],
      _count: {
        _all: true,
      },
    }),
    prisma.cart.groupBy({
      by: ["paymentStatus"],
      _count: {
        _all: true,
      },
    }),
  ]);

  const orders: DashboardOrder[] = rawOrders;
  const totalOrders = cartCountsByStatus.reduce(
    (total, row) => total + row._count._all,
    0,
  );
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
  const totalRevenue = orders.reduce(
    (total, order) => total + getOrderTotal(order),
    0,
  );

  const stats = [
    {
      label: "Pedidos filtrados",
      value: filteredOrders,
      detail: `${orders.length} exibidos de ${totalOrders}`,
      icon: ReceiptText,
    },
    {
      label: "Finalizados",
      value: checkedOutOrders,
      detail: "Pedidos em checkout concluido",
      icon: PackageCheck,
    },
    {
      label: "Pagos",
      value: paidOrders,
      detail: "Pagamentos aprovados",
      icon: CreditCard,
    },
    {
      label: "Pendentes",
      value: pendingPayments,
      detail: "Aguardando pagamento",
      icon: ShoppingBag,
    },
  ];

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <div className="flex flex-col gap-3 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Dashboard
          </Link>
          <p className="mt-2 text-sm font-semibold uppercase tracking-[0.16em] text-primary">
            Gestao
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">Pedidos</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Consulte pedidos, acompanhe pagamentos e ajuste status
            administrativos.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-surface px-3 py-1 text-sm shadow-sm">
          <p className="text-muted">Total listado</p>
          <p className="text-xl font-semibold text-foreground">
            {currencyFormatter.format(totalRevenue)}
          </p>
        </div>
      </div>

      <section className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className="rounded-lg border border-border bg-surface p-3 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-muted">{stat.label}</p>
                  <p className="mt-1 text-xl font-semibold text-foreground">
                    {stat.value}
                  </p>
                </div>
                <span className="rounded-lg bg-background p-2 text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
              </div>
              <p className="mt-2 text-sm text-muted">{stat.detail}</p>
            </div>
          );
        })}
      </section>

      {showMelhorEnvioScopeWarning && (
        <section className="mt-4 rounded-lg border border-warning bg-yellow-50 p-3 text-sm text-warning shadow-sm">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-semibold text-foreground">
                Melhor Envio precisa ser autorizado novamente
              </h2>
              <p className="mt-1">
                O token atual permite apenas:{" "}
                {melhorEnvioScopeStatus.currentScopes.join(", ")}. Para gerar
                etiquetas, faltam:{" "}
                {melhorEnvioScopeStatus.missingScopes.join(", ")}.
              </p>
            </div>
            <Link
              href="/api/melhor-envio/authorize"
              className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg bg-primary px-3 text-sm font-semibold text-background transition hover:bg-primary/90"
            >
              Autorizar Melhor Envio
            </Link>
          </div>
        </section>
      )}

      {showLabelErrorFeedback && (
        <section
          role="alert"
          className="mt-4 rounded-lg border border-danger bg-red-50 p-1 text-sm text-danger shadow-sm"
        >
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="font-semibold text-foreground">
                Etiqueta nao gerada
              </h2>
              <p className="mt-1">
                {labelFeedbackOrder ? `Pedido #${labelFeedbackOrder}: ` : null}
                {labelFeedbackMessage}
              </p>
            </div>
            <Link
              href="/dashboard/pedidos"
              className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg border border-danger px-3 text-sm font-semibold text-danger transition hover:bg-danger hover:text-background"
            >
              Dispensar aviso
            </Link>
          </div>
        </section>
      )}

      <form
        action="/dashboard/pedidos"
        className="mt-4 grid gap-3 rounded-lg border border-border bg-surface p-4 shadow-sm"
      >
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px_auto] lg:items-end">
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
                placeholder="Pedido, cliente, telefone ou Stripe"
                className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-foreground outline-none focus:border-primary/10 focus:ring-2 focus:ring-primary/10 "
              />
            </div>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="status">
              Status pedido
            </label>
            <select
              id="status"
              name="status"
              defaultValue={filters.status}
              className="rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-primary/10 focus:ring-2 focus:ring-primary/10 "
            >
              <option value="">Todos</option>
              {cartStatusValues.map((status) => (
                <option key={status} value={status}>
                  {cartStatusLabels[status]}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="paymentStatus">
              Pagamento
            </label>
            <select
              id="paymentStatus"
              name="paymentStatus"
              defaultValue={filters.paymentStatus}
              className="rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-primary/10 focus:ring-2 focus:ring-primary/10 "
            >
              <option value="">Todos</option>
              {Object.values(PaymentStatus).map((status) => (
                <option key={status} value={status}>
                  {paymentStatusLabels[status]}
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
              href="/dashboard/pedidos"
              className="text-sm font-medium text-primary hover:underline"
            >
              Limpar filtros
            </Link>
          </div>
        )}
      </form>

      <section className="mt-4">
        {orders.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-6 text-center shadow-sm">
            <h2 className="text-lg font-semibold">Nenhum pedido encontrado</h2>
            <p className="mt-2 text-sm text-muted">
              Ajuste os filtros para consultar outros pedidos.
            </p>
          </div>
        ) : (
          <div className="grid gap-5">
            {orders.map((order) => {
              const itemsTotal = getItemsTotal(order.items);
              const orderTotal = getOrderTotal(order);
              const isPickup = isPickupShippingMethod(order.shippingMethod);
              const canGenerateMelhorEnvioLabel =
                order.paymentStatus === PaymentStatus.PAID &&
                !isPickup &&
                Boolean(order.checkoutAddress?.document) &&
                Boolean(order.shippingMethod) &&
                order.shippingPrice != null;
              const addressHref = order.mercadoPagoPaymentId
                ? `/checkout/endereco?mp_payment_id=${order.mercadoPagoPaymentId}`
                : order.stripeCheckoutSessionId
                  ? `/checkout/endereco?session_id=${order.stripeCheckoutSessionId}`
                  : null;

              return (
                <article
                  key={order.id}
                  className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm"
                >
                  <div className="grid gap-3 border-b border-border bg-background/70 p-2 lg:grid-cols-[1fr_auto] lg:items-start">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-semibold tracking-tight">
                          Pedido #{getOrderCode(order.id)}
                        </h2>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            cartStatusClasses[order.status]
                          }`}
                        >
                          {cartStatusLabels[order.status]}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            paymentStatusClasses[order.paymentStatus]
                          }`}
                        >
                          {paymentStatusLabels[order.paymentStatus]}
                        </span>
                      </div>

                      <div className="mt-2 grid gap-1 text-xs text-muted sm:grid-cols-2 lg:grid-cols-4">
                        <p>
                          Criado em {dateTimeFormatter.format(order.createdAt)}
                        </p>
                        <p>
                          Atualizado em{" "}
                          {dateTimeFormatter.format(order.updatedAt)}
                        </p>
                        {order.paidAt && (
                          <p>
                            Pago em {dateTimeFormatter.format(order.paidAt)}
                          </p>
                        )}
                        {order.prescriptionUploadedAt && (
                          <p>
                            Receita em{" "}
                            {dateTimeFormatter.format(
                              order.prescriptionUploadedAt,
                            )}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-left lg:text-right">
                      <p className="text-xs font-medium uppercase text-muted">
                        Total
                      </p>
                      <p className="text-lg font-semibold text-foreground">
                        {currencyFormatter.format(orderTotal)}
                      </p>
                      <p className="text-xs text-muted">
                        Itens {currencyFormatter.format(itemsTotal)}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 p-2 xl:grid-cols-[1.2fr_1.3fr_1.2fr_260px]">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase text-muted">
                        Cliente
                      </p>
                      <p className="mt-2 wrap-break-word font-medium">
                        {order.checkoutAddress?.fullName ??
                          order.user?.email ??
                          "Cliente sem cadastro"}
                      </p>
                      <p className="mt-1 wrap-break-word text-sm text-muted">
                        {order.user?.email ?? "Compra anonima"}
                      </p>
                      {order.checkoutAddress?.phone && (
                        <p className="mt-1 text-sm text-muted">
                          {order.checkoutAddress.phone}
                        </p>
                      )}
                      <div className="mt-3 grid gap-1 text-xs text-muted">
                        {order.mercadoPagoPaymentId && (
                          <p className="break-all">
                            Pix: {order.mercadoPagoPaymentId}
                          </p>
                        )}
                        {order.stripeCheckoutSessionId && (
                          <p className="break-all">
                            Stripe: {order.stripeCheckoutSessionId}
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase text-muted">
                        Itens do pedido
                      </p>
                      <div className="mt-1 grid gap-2">
                        {order.items.length === 0 ? (
                          <p className="text-sm text-muted">Sem itens</p>
                        ) : (
                          order.items.map((item) => (
                            <div
                              key={item.id}
                              className="border-b border-border pb-2 last:border-0 last:pb-0"
                            >
                              <p className="">
                                {item.quantity}x {item.product.name}
                              </p>
                              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                                <span>
                                  {currencyFormatter.format(item.unitPrice)} un.
                                </span>
                                <span>
                                  {item.product.lengthCm} x{" "}
                                  {item.product.widthCm} x{" "}
                                  {item.product.heightCm} cm
                                </span>
                                <span>{item.product.weightKg} kg</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase text-muted">
                        Entrega
                      </p>
                      {order.checkoutAddress ? (
                        <div className="mt-2 grid gap-1 text-sm text-muted">
                          <div className="flex items-center gap-1 font-medium text-foreground">
                            <MapPin
                              className="h-4 w-4 shrink-0"
                              aria-hidden="true"
                            />
                            {order.checkoutAddress.city}/
                            {order.checkoutAddress.state}
                          </div>
                          {!order.checkoutAddress.document && (
                            <p className="text-warning">
                              CPF do destinatario pendente
                            </p>
                          )}
                          <p>
                            {order.checkoutAddress.street},{" "}
                            {order.checkoutAddress.number}
                          </p>
                          {order.checkoutAddress.complement && (
                            <p>{order.checkoutAddress.complement}</p>
                          )}
                          <p>{order.checkoutAddress.neighborhood}</p>
                          <p>CEP {order.checkoutAddress.postalCode}</p>
                        </div>
                      ) : (
                        <div className="mt-2 grid gap-2 text-sm">
                          <p className="text-muted">Endereco nao informado</p>
                          {addressHref &&
                            order.paymentStatus === PaymentStatus.PAID && (
                              <Link
                                href={addressHref}
                                className="w-fit rounded-lg border border-border px-3 py-1 text-xs font-medium text-primary transition hover:border-primary"
                              >
                                Cadastrar endereco
                              </Link>
                            )}
                        </div>
                      )}

                      <div className="mt-3 grid gap-1 text-sm text-muted">
                        <p>
                          {isPickup
                            ? "Retirada na loja"
                            : (order.shippingLabel ?? "Frete nao calculado")}
                        </p>
                        <p>
                          {isPickup
                            ? "Sem cobranca de frete"
                            : order.shippingPrice != null
                              ? currencyFormatter.format(order.shippingPrice)
                              : "Sem valor de frete"}
                        </p>
                      </div>

                      {!isPickup && (
                        <div className="mt-3 border-t border-border pt-3 text-sm text-muted">
                          <p className="font-medium text-foreground">
                            Etiqueta Melhor Envio
                          </p>
                          {order.shipmentId ? (
                            <div className="mt-1 grid gap-1">
                              <p>Envio: {order.shipmentId}</p>
                              {order.shipmentTrackingCode && (
                                <p>Rastreio: {order.shipmentTrackingCode}</p>
                              )}
                              {order.shipmentLabelRequestId && (
                                <a
                                  href={order.shipmentLabelRequestId}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="font-medium text-primary underline-offset-2 hover:underline"
                                >
                                  Abrir etiqueta
                                </a>
                              )}
                              {order.shipmentCreatedAt && (
                                <p>
                                  Gerada em{" "}
                                  {dateTimeFormatter.format(
                                    order.shipmentCreatedAt,
                                  )}
                                </p>
                              )}
                            </div>
                          ) : order.shipmentStatus === "failed" ? (
                            <p className="mt-1 text-danger">
                              {order.shipmentError ??
                                "Falha ao gerar etiqueta."}
                            </p>
                          ) : (
                            <p className="mt-1">Ainda nao gerada.</p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="border-t border-border pt-3 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
                      <p className="text-xs font-semibold uppercase text-muted">
                        Ações
                      </p>
                      <div className="mt-2 grid gap-2">
                        <form action={updateOrderStatus} className="grid gap-2">
                          <input
                            type="hidden"
                            name="orderId"
                            value={order.id}
                          />
                          <label
                            className="text-xs font-medium text-muted"
                            htmlFor={`status-${order.id}`}
                          >
                            Status pedido
                          </label>
                          <select
                            id={`status-${order.id}`}
                            name="status"
                            defaultValue={order.status}
                            className="rounded-lg border border-border bg-background px-3 py-1 text-foreground text-xs outline-none focus:border-primary/10 focus:ring-2 focus:ring-primary/10 "
                          >
                            {cartStatusValues.map((status) => (
                              <option key={status} value={status}>
                                {cartStatusLabels[status]}
                              </option>
                            ))}
                          </select>
                          <button
                            type="submit"
                            className="rounded-lg bg-secondary px-3 py-1  font-medium text-foreground text-xs transition hover:bg-secondary/90"
                          >
                            Salvar pedido
                          </button>
                        </form>

                        <form
                          action={updatePaymentStatus}
                          className="grid gap-2"
                        >
                          <input
                            type="hidden"
                            name="orderId"
                            value={order.id}
                          />
                          <label
                            className="text-xs font-medium text-muted"
                            htmlFor={`payment-${order.id}`}
                          >
                            Pagamento
                          </label>
                          <select
                            id={`payment-${order.id}`}
                            name="paymentStatus"
                            defaultValue={order.paymentStatus}
                            className="rounded-lg border border-border bg-background px-3 py-1 text-foreground  text-xs outline-none focus:border-primary/10 focus:ring-2 focus:ring-primary/10 "
                          >
                            {Object.values(PaymentStatus).map((status) => (
                              <option key={status} value={status}>
                                {paymentStatusLabels[status]}
                              </option>
                            ))}
                          </select>
                          <button
                            type="submit"
                            className="rounded-lg border border-border px-3 py-1 text-xs font-medium transition hover:border-primary/10 hover:text-primary"
                          >
                            Salvar pagamento
                          </button>
                        </form>

                        {canGenerateMelhorEnvioLabel &&
                          melhorEnvioScopeStatus.canGenerateLabels && (
                            <form action={generateMelhorEnvioShippingLabel}>
                              <input
                                type="hidden"
                                name="orderId"
                                value={order.id}
                              />
                              <button
                                type="submit"
                                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-primary/10 px-3 py-1 text-xs font-medium text-primary transition hover:bg-primary hover:text-background"
                              >
                                <FileText
                                  className="h-3 w-3"
                                  aria-hidden="true"
                                />
                                {order.shipmentId
                                  ? "Atualizar etiqueta"
                                  : "Gerar etiqueta"}
                              </button>
                            </form>
                          )}

                        {order.prescriptionImageUrl && (
                          <a
                            href={`/dashboard/pedidos/${order.id}/receita`}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-1 text-xs font-medium transition hover:border-primary/10 hover:text-primary"
                          >
                            <Download className="h-3 w-3" aria-hidden="true" />
                            Baixar receita
                          </a>
                        )}

                        {canGenerateMelhorEnvioLabel &&
                          !melhorEnvioScopeStatus.canGenerateLabels && (
                            <div className="grid gap-2 rounded-lg border border-warning bg-yellow-50 p-2 text-xs text-warning">
                              <p>
                                Reautorize o Melhor Envio para liberar a compra
                                e impressao de etiquetas.
                              </p>
                              <Link
                                href="/api/melhor-envio/authorize"
                                className="w-fit rounded-lg bg-primary px-3 py-1 font-medium text-background transition hover:bg-primary/90"
                              >
                                Autorizar agora
                              </Link>
                            </div>
                          )}

                        {order.paymentStatus === PaymentStatus.PAID &&
                          !isPickup &&
                          !canGenerateMelhorEnvioLabel && (
                            <div className="grid gap-2 rounded-lg border border-warning bg-yellow-50 p-2 text-xs text-warning">
                              <p>
                                {order.checkoutAddress?.document
                                  ? "Calcule ou revise o frete antes de gerar a etiqueta."
                                  : order.checkoutAddress
                                    ? "Informe o CPF do destinatario para liberar a etiqueta do Melhor Envio."
                                    : "Cadastre o endereco para liberar a etiqueta do Melhor Envio."}
                              </p>
                              {addressHref &&
                                (!order.checkoutAddress ||
                                  !order.checkoutAddress.document) && (
                                  <Link
                                    href={addressHref}
                                    className="w-fit rounded-lg bg-primary px-3 py-1 font-medium text-background transition hover:bg-primary/90"
                                  >
                                    Completar endereco
                                  </Link>
                                )}
                            </div>
                          )}

                        {order.paymentStatus !== PaymentStatus.PAID && (
                          <form action={deleteOrder}>
                            <input
                              type="hidden"
                              name="orderId"
                              value={order.id}
                            />
                            <button
                              type="submit"
                              className="inline-flex items-center justify-center gap-2 rounded-lg border border-danger px-3 py-1 text-sm font-medium text-danger transition hover:bg-danger hover:text-background w-full"
                            >
                              <Trash2 className="h-3 w-3" aria-hidden="true" />
                              Excluir pedido
                            </button>
                          </form>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {filteredOrders > orders.length && (
        <div className="mt-3 text-sm text-muted">
          Exibindo os 50 pedidos mais recentes. Refine os filtros para localizar
          pedidos antigos.
        </div>
      )}

      {hasActiveFilters && (
        <div className="mt-3 text-sm text-muted">
          Link da consulta atual:{" "}
          <Link
            href={buildOrdersHref(filters)}
            className="font-medium text-primary hover:underline"
          >
            {buildOrdersHref(filters)}
          </Link>
        </div>
      )}
    </main>
  );
}
