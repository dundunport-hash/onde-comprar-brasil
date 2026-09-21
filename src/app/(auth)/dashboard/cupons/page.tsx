import type { Metadata } from "next";
import { Pencil, Power, Tag, Trash2 } from "lucide-react";
import { requireAdminSession } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { SITE_NAME } from "@/lib/store-contact";
import {
  createCoupon,
  deleteCoupon,
  toggleCoupon,
  updateCoupon,
} from "./actions";

export const metadata: Metadata = {
  title: `Cupons | Dashboard ${SITE_NAME}`,
  description: "Gerencie cupons de desconto.",
  robots: {
    index: false,
    follow: false,
  },
};

type CouponsPageSearchParams = {
  created?: string | string[];
  updated?: string | string[];
  deleted?: string | string[];
};

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CouponsPage({
  searchParams,
}: {
  searchParams: Promise<CouponsPageSearchParams>;
}) {
  await requireAdminSession();

  const [coupons, products, query] = await Promise.all([
    prisma.coupon.findMany({
      include: {
        products: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            product: {
              name: "asc",
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.product.findMany({
      where: {
        active: true,
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
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
        <h1 className="text-3xl font-semibold tracking-tight">Cupons</h1>
        <p className="text-sm text-muted">
          Cadastre codigos percentuais vinculados a produtos especificos.
        </p>
      </div>

      {wasCreated && (
        <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-800">
          Cupom criado com sucesso.
        </div>
      )}
      {wasUpdated && (
        <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm font-medium text-blue-800">
          Cupom atualizado com sucesso.
        </div>
      )}
      {wasDeleted && (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800">
          Cupom removido com sucesso.
        </div>
      )}

      <section className="mt-8 rounded-lg border border-border bg-surface p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Tag className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 className="text-lg font-semibold">Novo cupom</h2>
        </div>

        <form action={createCoupon} className="mt-5 grid gap-4">
          <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="code">
                Codigo
              </label>
              <input
                id="code"
                name="code"
                required
                maxLength={40}
                placeholder="EX: SAUDE10"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 uppercase outline-none focus:border-primary/10 focus:ring-2 focus:ring-primary/10"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="productId">
                Produto
              </label>
              <select
                id="productId"
                name="productId"
                required
                className="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-primary/10 focus:ring-2 focus:ring-primary/10"
              >
                <option value="">Selecione</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid min-w-0 gap-4 md:grid-cols-[180px_1fr] md:items-end">
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="discountPercent">
                % desconto
              </label>
              <input
                id="discountPercent"
                name="discountPercent"
                required
                inputMode="decimal"
                placeholder="10"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-primary/10 focus:ring-2 focus:ring-primary/10"
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
              Ativo imediatamente
            </label>
            <button
              type="submit"
              className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-background transition hover:bg-primary/90"
            >
              Criar cupom
            </button>
          </div>
        </form>
      </section>

      <section className="mt-8">
        {coupons.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-8 text-center shadow-sm">
            <h2 className="text-lg font-semibold">Nenhum cupom cadastrado</h2>
            <p className="mt-2 text-sm text-muted">
              Use o formulario acima para criar o primeiro.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {coupons.map((coupon) => (
              <article
                key={coupon.id}
                className="rounded-lg border border-border bg-surface p-4 shadow-sm"
              >
                <div className="grid gap-4 lg:grid-cols-[120px_90px_minmax(0,1fr)_110px_130px_130px] lg:items-start">
                  <div className="grid gap-1">
                    <span className="text-xs font-medium text-muted">
                      Codigo
                    </span>
                    <span className="font-semibold">{coupon.code}</span>
                  </div>
                  <div className="grid gap-1">
                    <span className="text-xs font-medium text-muted">
                      Desconto
                    </span>
                    <span>{coupon.discountPercent}%</span>
                  </div>
                  <div className="grid min-w-0 gap-1">
                    <span className="text-xs font-medium text-muted">
                      Produtos
                    </span>
                    <div className="grid min-w-0 gap-1 text-sm text-muted">
                      {coupon.products.map(({ product }) => (
                        <span
                          key={product.id}
                          title={product.name}
                          className="line-clamp-2 min-w-0 break-words"
                        >
                          {product.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-1">
                    <span className="text-xs font-medium text-muted">
                      Status
                    </span>
                    <span
                      className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${
                        coupon.active
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {coupon.active ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                  <div className="grid gap-1 text-muted">
                    <span className="text-xs font-medium">Criado</span>
                    <span>{dateTimeFormatter.format(coupon.createdAt)}</span>
                  </div>
                  <div className="grid gap-1 text-muted">
                    <span className="text-xs font-medium">Atualizado</span>
                    <span>{dateTimeFormatter.format(coupon.updatedAt)}</span>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 border-t border-border pt-4">
                  <form
                    action={updateCoupon}
                    className="grid gap-3 rounded-lg border border-border bg-background p-3 shadow-sm"
                  >
                    <input type="hidden" name="couponId" value={coupon.id} />
                    <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_130px]">
                      <div className="grid min-w-0 gap-1.5">
                        <label
                          className="text-xs font-medium text-muted"
                          htmlFor={`code-${coupon.id}`}
                        >
                          Codigo
                        </label>
                        <input
                          id={`code-${coupon.id}`}
                          name="code"
                          defaultValue={coupon.code}
                          required
                          className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm uppercase outline-none focus:border-primary/10 focus:ring-2 focus:ring-primary/10"
                        />
                      </div>
                      <div className="grid min-w-0 gap-1.5">
                        <label
                          className="text-xs font-medium text-muted"
                          htmlFor={`products-${coupon.id}`}
                        >
                          Produto
                        </label>
                        <select
                          id={`products-${coupon.id}`}
                          name="productId"
                          required
                          defaultValue={coupon.products[0]?.productId ?? ""}
                          className="h-10 w-full min-w-0 truncate rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary/10 focus:ring-2 focus:ring-primary/10"
                        >
                          <option value="">Selecione</option>
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid min-w-0 gap-1.5">
                        <label
                          className="text-xs font-medium text-muted"
                          htmlFor={`discount-${coupon.id}`}
                        >
                          Porcentagem
                        </label>
                        <div className="relative">
                          <input
                            id={`discount-${coupon.id}`}
                            name="discountPercent"
                            defaultValue={coupon.discountPercent}
                            required
                            inputMode="decimal"
                            className="h-10 w-full rounded-lg border border-border bg-surface px-3 pr-8 text-sm outline-none focus:border-primary/10 focus:ring-2 focus:ring-primary/10"
                          />
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">
                            %
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <label className="inline-flex items-center gap-2 text-sm text-muted">
                        <input
                          type="checkbox"
                          name="active"
                          defaultChecked={coupon.active}
                          className="h-4 w-4 rounded border-border"
                        />
                        Ativo
                      </label>
                      <button
                        type="submit"
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-secondary px-4 text-sm font-semibold text-foreground transition hover:bg-secondary/90"
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                        Salvar alteracoes
                      </button>
                    </div>
                  </form>

                  <div className="flex flex-wrap justify-end gap-2">
                    <form action={toggleCoupon}>
                      <input type="hidden" name="couponId" value={coupon.id} />
                      <input
                        type="hidden"
                        name="active"
                        value={coupon.active ? "false" : "true"}
                      />
                      <button
                        type="submit"
                        className="inline-flex h-9 items-center gap-2 rounded-lg bg-secondary px-3 text-sm font-medium text-foreground transition hover:bg-secondary/90"
                      >
                        <Power className="h-4 w-4" aria-hidden="true" />
                        {coupon.active ? "Desativar" : "Ativar"}
                      </button>
                    </form>
                    <form action={deleteCoupon}>
                      <input type="hidden" name="couponId" value={coupon.id} />
                      <button
                        type="submit"
                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-danger px-3 text-sm font-medium text-danger transition hover:bg-danger hover:text-background"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        Excluir
                      </button>
                    </form>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
