import type { Metadata } from "next";
import Link from "next/link";
import { StockMovementType } from "@prisma/client";
import { requireAdminSession } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { isExpired, isExpiringSoon } from "@/lib/stock";
import { SITE_NAME } from "@/lib/store-contact";
import { createStockMovement } from "./actions";

export const metadata: Metadata = {
  title: `Estoque | Dashboard ${SITE_NAME}`,
  description:
    "Controle movimentacoes, auditoria e validade dos lotes de estoque.",
  robots: {
    index: false,
    follow: false,
  },
};

const movementLabels: Record<StockMovementType, string> = {
  IN: "Entrada",
  OUT: "Saida",
  ADJUSTMENT: "Ajuste",
  LOSS: "Perda",
  RETURN: "Retorno",
  EXPIRED: "Vencido",
};

function formatDate(date: Date | null) {
  if (!date) {
    return "Sem validade";
  }

  return new Intl.DateTimeFormat("pt-BR").format(date);
}

export default async function StockPage() {
  await requireAdminSession();

  const [products, stocks, movements] = await Promise.all([
    prisma.product.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
      },
    }),
    prisma.stock.findMany({
      orderBy: [{ expirationDate: "asc" }, { createdAt: "desc" }],
      include: {
        product: {
          select: {
            name: true,
          },
        },
      },
    }),
    prisma.stockMovement.findMany({
      take: 50,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        product: {
          select: {
            name: true,
          },
        },
        stock: {
          select: {
            batch: true,
          },
        },
        createdBy: {
          select: {
            email: true,
          },
        },
      },
    }),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            Dashboard
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Estoque</h1>
          <p className="mt-2 text-sm text-muted">
            Registre movimentacoes e acompanhe lotes, saldos e validade.
          </p>
        </div>

        <Link
          href="/dashboard/produtos"
          className="inline-flex items-center justify-center rounded-lg bg-secondary px-5 py-2 font-medium text-foreground transition hover:bg-secondary/90"
        >
          Produtos
        </Link>
      </div>

      <section className="mt-8 rounded-lg border border-border bg-surface p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Nova movimentacao</h2>
        <form action={createStockMovement} className="mt-5 grid gap-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="productId">
                Produto
              </label>
              <select
                id="productId"
                name="productId"
                required
                className="rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-primary/10 focus:ring-2 focus:ring-primary/10 "
              >
                <option value="">Selecione</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="stockId">
                Lote existente
              </label>
              <select
                id="stockId"
                name="stockId"
                className="rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-primary/10 focus:ring-2 focus:ring-primary/10 "
              >
                <option value="">Novo lote</option>
                {stocks.map((stock) => (
                  <option key={stock.id} value={stock.id}>
                    {stock.product.name} - {stock.batch ?? "sem lote"} (
                    {stock.quantity})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="type">
                Tipo
              </label>
              <select
                id="type"
                name="type"
                required
                className="rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-primary/10 focus:ring-2 focus:ring-primary/10 "
              >
                {Object.values(StockMovementType).map((type) => (
                  <option key={type} value={type}>
                    {movementLabels[type]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="quantity">
                Quantidade
              </label>
              <input
                id="quantity"
                name="quantity"
                type="number"
                min="0"
                step="1"
                required
                className="rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-primary/10 focus:ring-2 focus:ring-primary/10 "
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="batch">
                Lote
              </label>
              <input
                id="batch"
                name="batch"
                className="rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-primary/10 focus:ring-2 focus:ring-primary/10 "
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="expirationDate">
                Validade
              </label>
              <input
                id="expirationDate"
                name="expirationDate"
                type="date"
                className="rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-primary/10 focus:ring-2 focus:ring-primary/10 "
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="reason">
                Motivo
              </label>
              <input
                id="reason"
                name="reason"
                className="rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-primary/10 focus:ring-2 focus:ring-primary/10 "
              />
            </div>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="notes">
              Observacoes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              className="rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-primary/10 focus:ring-2 focus:ring-primary/10 "
            />
          </div>

          <div>
            <button
              type="submit"
              className="rounded-lg bg-primary px-5 py-2 font-medium text-background transition hover:bg-primary/90"
            >
              Registrar movimentacao
            </button>
          </div>
        </form>
      </section>

      <section className="mt-8 rounded-lg border border-border bg-surface shadow-sm">
        <div className="border-b border-border p-5">
          <h2 className="text-lg font-semibold">Lotes e validade</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-190 text-left text-sm">
            <thead className="border-b border-border bg-background">
              <tr>
                <th className="px-4 py-3">Produto</th>
                <th className="px-4 py-3">Lote</th>
                <th className="px-4 py-3">Quantidade</th>
                <th className="px-4 py-3">Reservado</th>
                <th className="px-4 py-3">Validade</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {stocks.map((stock) => {
                const expired = isExpired(stock.expirationDate);
                const expiringSoon = isExpiringSoon(stock.expirationDate);

                return (
                  <tr key={stock.id}>
                    <td className="px-4 py-3 font-medium">
                      {stock.product.name}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {stock.batch ?? "Sem lote"}
                    </td>
                    <td className="px-4 py-3">{stock.quantity}</td>
                    <td className="px-4 py-3">{stock.reservedQuantity}</td>
                    <td className="px-4 py-3">
                      {formatDate(stock.expirationDate)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          expired
                            ? "bg-red-100 text-red-700"
                            : expiringSoon
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-green-100 text-green-700"
                        }`}
                      >
                        {expired
                          ? "Vencido"
                          : expiringSoon
                            ? "Perto do vencimento"
                            : "Regular"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 rounded-lg border border-border bg-surface shadow-sm">
        <div className="border-b border-border p-5">
          <h2 className="text-lg font-semibold">Auditoria de estoque</h2>
          <p className="mt-1 text-sm text-muted">
            Ultimas 50 movimentacoes registradas.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-225 text-left text-sm">
            <thead className="border-b border-border bg-background">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Produto</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Qtd.</th>
                <th className="px-4 py-3">Antes</th>
                <th className="px-4 py-3">Depois</th>
                <th className="px-4 py-3">Lote</th>
                <th className="px-4 py-3">Usuario</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {movements.map((movement) => (
                <tr key={movement.id}>
                  <td className="px-4 py-3">
                    {new Intl.DateTimeFormat("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    }).format(movement.createdAt)}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {movement.product.name}
                  </td>
                  <td className="px-4 py-3">{movementLabels[movement.type]}</td>
                  <td className="px-4 py-3">{movement.quantity}</td>
                  <td className="px-4 py-3">{movement.previousQuantity}</td>
                  <td className="px-4 py-3">{movement.newQuantity}</td>
                  <td className="px-4 py-3">
                    {movement.stock.batch ?? "Sem lote"}
                  </td>
                  <td className="px-4 py-3">
                    {movement.createdBy?.email ?? "Sistema"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
