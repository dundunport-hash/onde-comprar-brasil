import type { Metadata } from "next";
import { Power, Tag, Trash2 } from "lucide-react";
import { requireAdminSession } from "@/lib/admin";
import { getCachedActiveProductOptions } from "@/lib/catalog-cache";
import { currencyFormatter } from "@/lib/currencyFormatter";
import { prisma } from "@/lib/prisma";
import { SITE_NAME } from "@/lib/store-contact";
import { createPromotion, deletePromotion, togglePromotion } from "./actions";

export const metadata: Metadata = {
  title: `Promocoes | Dashboard ${SITE_NAME}`,
  description: "Gerencie descontos por produto.",
  robots: {
    index: false,
    follow: false,
  },
};

function toDateTimeLocalValue(date: Date) {
  const offsetDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60000,
  );
  return offsetDate.toISOString().slice(0, 16);
}

type PromotionsPageSearchParams = {
  created?: string | string[];
  updated?: string | string[];
  deleted?: string | string[];
};

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PromotionsPage({
  searchParams,
}: {
  searchParams: Promise<PromotionsPageSearchParams>;
}) {
  await requireAdminSession();

  const now = new Date();
  const defaultEndDate = new Date(now);
  defaultEndDate.setDate(defaultEndDate.getDate() + 7);

  const [products, promotions, query] = await Promise.all([
    getCachedActiveProductOptions(),
    prisma.promotion.findMany({
      include: {
        product: {
          select: {
            name: true,
            price: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    searchParams,
  ]);

  const wasCreated = getSingleParam(query.created) === "1";
  const wasUpdated = getSingleParam(query.updated) === "1";
  const wasDeleted = getSingleParam(query.deleted) === "1";

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
          Dashboard
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Promocoes</h1>
        <p className="text-sm text-muted">
          Cadastre descontos percentuais ou fixos para produtos ativos.
        </p>
      </div>

      {wasCreated && (
        <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-800">
          Promoção criada com sucesso.
        </div>
      )}

      {wasUpdated && (
        <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm font-medium text-blue-800">
          Status da promoção atualizado com sucesso.
        </div>
      )}

      {wasDeleted && (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800">
          Promoção removida com sucesso.
        </div>
      )}

      <section className="mt-8 rounded-lg border border-border bg-surface p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Tag className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 className="text-lg font-semibold">Nova promocao</h2>
        </div>

        <form action={createPromotion} className="mt-5 grid gap-4 min-w-0">
          <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="grid min-w-0 gap-2">
              <label className="text-sm font-medium" htmlFor="name">
                Nome
              </label>
              <input
                id="name"
                name="name"
                required
                placeholder="Ex: Oferta da semana"
                className="w-full min-w-0 max-w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-primary/10 focus:ring-2 focus:ring-primary/10 "
              />
            </div>

            <div className="grid min-w-0 gap-2">
              <label className="text-sm font-medium" htmlFor="productId">
                Produto
              </label>
              <select
                id="productId"
                name="productId"
                required
                className="w-full min-w-0 max-w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-primary/10 focus:ring-2 focus:ring-primary/10 "
              >
                <option value="">Selecione</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} - {currencyFormatter.format(product.price)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_160px_160px_200px_200px] xl:items-end">
            <div className="grid min-w-0 gap-2">
              <label className="text-sm font-medium" htmlFor="description">
                Descricao
              </label>
              <input
                id="description"
                name="description"
                placeholder="Opcional"
                className="w-full min-w-0 max-w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-primary/10 focus:ring-2 focus:ring-primary/10 "
              />
            </div>

            <div className="grid min-w-0 gap-2">
              <label className="text-sm font-medium" htmlFor="discountPercent">
                % desconto
              </label>
              <input
                id="discountPercent"
                name="discountPercent"
                inputMode="decimal"
                defaultValue="0"
                className="w-full min-w-0 max-w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-primary/10 focus:ring-2 focus:ring-primary/10 "
              />
            </div>

            <div className="grid min-w-0 gap-2">
              <label className="text-sm font-medium" htmlFor="discountFixed">
                R$ desconto
              </label>
              <input
                id="discountFixed"
                name="discountFixed"
                inputMode="decimal"
                defaultValue="0"
                className="w-full min-w-0 max-w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-primary/10 focus:ring-2 focus:ring-primary/10 "
              />
            </div>

            <div className="grid min-w-0 gap-2">
              <label className="text-sm font-medium" htmlFor="startDate">
                Inicio
              </label>
              <input
                id="startDate"
                name="startDate"
                type="datetime-local"
                required
                defaultValue={toDateTimeLocalValue(now)}
                className="w-full min-w-0 max-w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-primary/10 focus:ring-2 focus:ring-primary/10 "
              />
            </div>

            <div className="grid min-w-0 gap-2">
              <label className="text-sm font-medium" htmlFor="endDate">
                Fim
              </label>
              <input
                id="endDate"
                name="endDate"
                type="datetime-local"
                required
                defaultValue={toDateTimeLocalValue(defaultEndDate)}
                className="w-full min-w-0 max-w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-primary/10 focus:ring-2 focus:ring-primary/10 "
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="inline-flex items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                name="active"
                defaultChecked
                className="h-4 w-4 rounded border-border"
              />
              Ativa imediatamente
            </label>

            <button
              type="submit"
              className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-background transition hover:bg-primary/90"
            >
              Criar promocao
            </button>
          </div>
        </form>
      </section>

      <section className="mt-8 overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        {promotions.length === 0 ? (
          <div className="p-8 text-center">
            <h2 className="text-lg font-semibold">
              Nenhuma promocao cadastrada
            </h2>
            <p className="mt-2 text-sm text-muted">
              Use o formulario acima para criar a primeira.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-220 border-collapse text-left text-sm">
              <thead className="border-b border-border bg-background">
                <tr>
                  <th className="px-4 py-3 font-semibold">Promocao</th>
                  <th className="px-4 py-3 font-semibold">Produto</th>
                  <th className="px-4 py-3 font-semibold">Desconto</th>
                  <th className="px-4 py-3 font-semibold">Periodo</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {promotions.map((promotion) => (
                  <tr key={promotion.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium">{promotion.name}</div>
                      {promotion.description && (
                        <div className="text-xs text-muted">
                          {promotion.description}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {promotion.product?.name ?? "Produto removido"}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        {promotion.discountPercent > 0 &&
                          `${promotion.discountPercent}%`}
                      </div>
                      <div>
                        {promotion.discountFixed > 0 &&
                          currencyFormatter.format(promotion.discountFixed)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      <div>
                        {promotion.startDate.toLocaleDateString("pt-BR")}
                      </div>
                      <div>{promotion.endDate.toLocaleDateString("pt-BR")}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          promotion.active
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {promotion.active ? "Ativa" : "Inativa"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <form action={togglePromotion}>
                          <input
                            type="hidden"
                            name="promotionId"
                            value={promotion.id}
                          />
                          <input
                            type="hidden"
                            name="active"
                            value={promotion.active ? "false" : "true"}
                          />
                          <button
                            type="submit"
                            className="inline-flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 font-medium text-foreground transition hover:bg-secondary/90"
                          >
                            <Power className="h-4 w-4" aria-hidden="true" />
                            {promotion.active ? "Desativar" : "Ativar"}
                          </button>
                        </form>

                        <form action={deletePromotion}>
                          <input
                            type="hidden"
                            name="promotionId"
                            value={promotion.id}
                          />
                          <button
                            type="submit"
                            className="inline-flex items-center gap-2 rounded-lg border border-danger px-3 py-2 font-medium text-danger transition hover:bg-danger hover:text-background"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                            Excluir
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
