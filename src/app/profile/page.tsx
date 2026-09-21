import type { Metadata } from "next";
import Link from "next/link";
import {
  CreditCard,
  MapPin,
  PackageCheck,
  ReceiptText,
  ShoppingBag,
  Truck,
  User,
} from "lucide-react";
import { CartStatus, PaymentStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth-session";
import { currencyFormatter } from "@/lib/currencyFormatter";
import { prisma } from "@/lib/prisma";
import { isPickupShippingMethod } from "@/lib/shipping";
import { SITE_NAME } from "@/lib/store-contact";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Perfil | ${SITE_NAME}`,
  description: `Acompanhe seus dados e pedidos na ${SITE_NAME}.`,
};

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

type ProfileOrderItem = {
  id: string;
  quantity: number;
  unitPrice: number;
  product: {
    name: string;
    slug: string;
  };
};

type ProfileOrder = {
  id: string;
  status: CartStatus;
  paymentStatus: PaymentStatus;
  shippingLabel: string | null;
  shippingMethod: string | null;
  shippingPrice: number | null;
  shipmentTrackingCode: string | null;
  shipmentStatus: string | null;
  shipmentError: string | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  checkoutAddress: {
    fullName: string;
    phone: string;
    postalCode: string;
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
  } | null;
  items: ProfileOrderItem[];
};

const cartStatusLabels: Record<CartStatus, string> = {
  ACTIVE: "Pedido iniciado",
  CHECKED_OUT: "Finalizado",
  AWAITING_SHIPMENT: "Aguardando envio",
  SEPARATED_SHIPPED: "Separado/enviado",
  DELIVERED: "Entregue",
  AWAITING_PICKUP: "Aguardando retirada na loja",
  ABANDONED: "Cancelado",
  EXPIRED: "Expirado",
};

const paymentStatusLabels: Record<PaymentStatus, string> = {
  PENDING: "Pagamento pendente",
  PAID: "Pagamento aprovado",
  CANCELED: "Pagamento cancelado",
  FAILED: "Pagamento falhou",
};

const statusClasses: Record<CartStatus, string> = {
  ACTIVE: "bg-yellow-100 text-yellow-800",
  CHECKED_OUT: "bg-green-100 text-green-800",
  AWAITING_SHIPMENT: "bg-amber-100 text-amber-800",
  SEPARATED_SHIPPED: "bg-blue-100 text-blue-800",
  DELIVERED: "bg-emerald-100 text-emerald-800",
  AWAITING_PICKUP: "bg-indigo-100 text-indigo-800",
  ABANDONED: "bg-red-100 text-red-800",
  EXPIRED: "bg-zinc-100 text-zinc-700",
};

const paymentClasses: Record<PaymentStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  PAID: "bg-green-100 text-green-800",
  CANCELED: "bg-red-100 text-red-800",
  FAILED: "bg-red-100 text-red-800",
};

function getOrderCode(id: string) {
  return id.slice(0, 8).toUpperCase();
}

function getItemsTotal(items: Array<{ quantity: number; unitPrice: number }>) {
  return items.reduce(
    (total, item) => total + item.quantity * item.unitPrice,
    0,
  );
}

function getOrderTotal({
  items,
  shippingPrice,
}: {
  items: Array<{ quantity: number; unitPrice: number }>;
  shippingPrice: number | null;
}) {
  return getItemsTotal(items) + (shippingPrice ?? 0);
}

export default async function ProfilePage() {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/profile");
  }

  const [user, rawOrders] = await Promise.all([
    prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: {
        name: true,
        email: true,
        phone: true,
        createdAt: true,
      },
    }),
    prisma.cart.findMany({
      where: {
        userId: session.user.id,
        OR: [
          { status: { not: CartStatus.ACTIVE } },
          { paymentStatus: { not: PaymentStatus.PENDING } },
          { stripeCheckoutSessionId: { not: null } },
          { mercadoPagoPaymentId: { not: null } },
          { paidAt: { not: null } },
        ],
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 30,
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        shippingLabel: true,
        shippingMethod: true,
        shippingPrice: true,
        shipmentTrackingCode: true,
        shipmentStatus: true,
        shipmentError: true,
        paidAt: true,
        createdAt: true,
        updatedAt: true,
        checkoutAddress: {
          select: {
            fullName: true,
            phone: true,
            postalCode: true,
            street: true,
            number: true,
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
              },
            },
          },
        },
      },
    }),
  ]);

  const orders: ProfileOrder[] = rawOrders;
  const paidOrders = orders.filter(
    (order) => order.paymentStatus === PaymentStatus.PAID,
  ).length;
  const totalSpent = orders.reduce((total, order) => {
    if (order.paymentStatus !== PaymentStatus.PAID) {
      return total;
    }

    return total + getOrderTotal(order);
  }, 0);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="h-fit rounded-lg border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <User className="h-6 w-6" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                Minha conta
              </p>
              <h1 className="truncate text-xl font-semibold">
                {user?.name ?? session.user.name ?? "Cliente"}
              </h1>
            </div>
          </div>

          <dl className="mt-6 grid gap-4 text-sm">
            <ProfileLine label="E-mail" value={user?.email ?? "-"} />
            <ProfileLine
              label="Telefone"
              value={user?.phone ?? "Nao informado"}
            />
            <ProfileLine
              label="Cliente desde"
              value={
                user?.createdAt
                  ? dateTimeFormatter.format(user.createdAt)
                  : "Data indisponivel"
              }
            />
          </dl>

          <div className="mt-6 grid gap-3 border-t border-border pt-5">
            <MetricCard
              icon={<ReceiptText className="h-4 w-4" aria-hidden="true" />}
              label="Pedidos"
              value={String(orders.length)}
            />
            <MetricCard
              icon={<CreditCard className="h-4 w-4" aria-hidden="true" />}
              label="Pagos"
              value={String(paidOrders)}
            />
            <MetricCard
              icon={<ShoppingBag className="h-4 w-4" aria-hidden="true" />}
              label="Total pago"
              value={currencyFormatter.format(totalSpent)}
            />
          </div>
        </aside>

        <section className="min-w-0">
          <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                  Pedidos
                </p>
                <h2 className="text-2xl font-semibold tracking-tight">
                  Acompanhe suas compras
                </h2>
              </div>
              <p className="text-sm text-muted">
                Atualizado conforme o gerenciamento da loja.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4">
            {orders.length === 0 ? (
              <div className="rounded-lg border border-border bg-surface p-8 text-center shadow-sm">
                <PackageCheck
                  className="mx-auto h-9 w-9 text-primary"
                  aria-hidden="true"
                />
                <h3 className="mt-3 text-lg font-semibold">
                  Nenhum pedido encontrado
                </h3>
                <p className="mt-2 text-sm text-muted">
                  Quando uma compra for iniciada ou finalizada, ela aparecera
                  aqui.
                </p>
                <Link
                  href="/"
                  className="mt-5 inline-flex rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-background transition hover:bg-primary/90"
                >
                  Ver produtos
                </Link>
              </div>
            ) : (
              orders.map((order) => {
                const isPickup = isPickupShippingMethod(order.shippingMethod);
                const itemsTotal = getItemsTotal(order.items);
                const total = getOrderTotal(order);

                return (
                  <article
                    key={order.id}
                    className="rounded-lg border border-border bg-surface p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-primary">
                          Pedido #{getOrderCode(order.id)}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          Criado em {dateTimeFormatter.format(order.createdAt)}
                        </p>
                        <p className="text-xs text-muted">
                          Atualizado em{" "}
                          {dateTimeFormatter.format(order.updatedAt)}
                        </p>
                        {order.paidAt && (
                          <p className="text-xs text-muted">
                            Pago em {dateTimeFormatter.format(order.paidAt)}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            statusClasses[order.status]
                          }`}
                        >
                          {cartStatusLabels[order.status]}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            paymentClasses[order.paymentStatus]
                          }`}
                        >
                          {paymentStatusLabels[order.paymentStatus]}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_260px]">
                      <div className="grid gap-3">
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <PackageCheck
                            className="h-4 w-4 text-primary"
                            aria-hidden="true"
                          />
                          Itens
                        </div>
                        <div className="divide-y divide-border rounded-lg border border-border bg-background">
                          {order.items.map((item) => (
                            <div
                              key={item.id}
                              className="flex flex-col gap-1 p-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div>
                                <p className="font-medium">
                                  {item.quantity}x {item.product.name}
                                </p>
                                <p className="text-xs text-muted">
                                  {currencyFormatter.format(item.unitPrice)} un.
                                </p>
                              </div>
                              <p className="text-sm font-semibold text-primary">
                                {currencyFormatter.format(
                                  item.quantity * item.unitPrice,
                                )}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid gap-4">
                        <InfoBlock
                          icon={
                            <Truck className="h-4 w-4" aria-hidden="true" />
                          }
                          title="Entrega"
                        >
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
                          {order.shipmentTrackingCode && (
                            <p>Rastreio: {order.shipmentTrackingCode}</p>
                          )}
                          {!order.shipmentTrackingCode &&
                            order.shipmentStatus === "failed" && (
                              <p>
                                Entrega em revisao:{" "}
                                {order.shipmentError ??
                                  "a loja esta revisando o envio."}
                              </p>
                            )}
                        </InfoBlock>

                        <InfoBlock
                          icon={
                            <MapPin className="h-4 w-4" aria-hidden="true" />
                          }
                          title={isPickup ? "Retirada" : "Endereco"}
                        >
                          {order.checkoutAddress ? (
                            <>
                              <p className="font-medium text-foreground">
                                {order.checkoutAddress.fullName}
                              </p>
                              <p>
                                {order.checkoutAddress.street},{" "}
                                {order.checkoutAddress.number}
                              </p>
                              <p>
                                {order.checkoutAddress.neighborhood} -{" "}
                                {order.checkoutAddress.city}/
                                {order.checkoutAddress.state}
                              </p>
                              <p>CEP {order.checkoutAddress.postalCode}</p>
                              <p>{order.checkoutAddress.phone}</p>
                            </>
                          ) : isPickup ? (
                            <p>Retirada na loja selecionada.</p>
                          ) : (
                            <p>Endereco ainda nao informado.</p>
                          )}
                        </InfoBlock>

                        <div className="rounded-lg border border-border bg-background p-3 text-sm">
                          <div className="flex items-center justify-between gap-4 text-muted">
                            <span>Itens</span>
                            <span>{currencyFormatter.format(itemsTotal)}</span>
                          </div>
                          <div className="mt-2 flex items-center justify-between gap-4 text-muted">
                            <span>Frete</span>
                            <span>
                              {isPickup
                                ? "Retirada"
                                : currencyFormatter.format(
                                    order.shippingPrice ?? 0,
                                  )}
                            </span>
                          </div>
                          <div className="mt-3 flex items-center justify-between gap-4 border-t border-border pt-3 font-semibold">
                            <span>Total</span>
                            <span className="text-primary">
                              {currencyFormatter.format(total)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function ProfileLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
        {label}
      </dt>
      <dd className="mt-1 break-words font-medium">{value}</dd>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3">
      <div>
        <p className="text-xs text-muted">{label}</p>
        <p className="font-semibold">{value}</p>
      </div>
      <span className="rounded-lg bg-primary/10 p-2 text-primary">{icon}</span>
    </div>
  );
}

function InfoBlock({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-background p-3 text-sm text-muted">
      <div className="mb-2 flex items-center gap-2 font-semibold text-foreground">
        <span className="text-primary">{icon}</span>
        {title}
      </div>
      <div className="grid gap-1">{children}</div>
    </section>
  );
}
