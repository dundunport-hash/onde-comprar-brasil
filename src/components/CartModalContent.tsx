import Image from "next/image";
import Link from "next/link";
import {
  CreditCard,
  Minus,
  Plus,
  QrCode,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import {
  clearCart,
  removeCartItem,
  updateCartItem,
} from "@/app/carrinho/actions";
import { currencyFormatter } from "@/lib/currencyFormatter";
import {
  cartHasControlledMedication,
  getCartSummary,
  type PersistedCart,
} from "@/lib/cart";
import {
  isPickupShippingMethod,
  type ShippingMethod,
  type ShippingOption,
} from "@/lib/shipping";
import { validateCartStock } from "@/lib/stock-validation";
import { LazyShippingCalculatorCard } from "@/app/carrinho/LazyShippingCalculatorCard";
import { PrescriptionUploadCard } from "@/app/carrinho/PrescriptionUploadCard";
import {
  createMercadoPagoPixPayment,
  createStripeCheckoutSession,
} from "@/app/checkout/pagamento/actions";
import { CartActionForm } from "./CartActionForm";

type CartModalContentProps = {
  cart: PersistedCart | null;
  isAuthenticated?: boolean;
};

function getPersistedShippingOptions({
  shippingMethod,
  shippingLabel,
  shippingPrice,
  shippingEstimatedDays,
}: {
  shippingMethod: string | null;
  shippingLabel: string | null;
  shippingPrice: number | null;
  shippingEstimatedDays: number | null;
}) {
  if (!shippingMethod || !shippingLabel || shippingPrice == null) {
    return [];
  }

  return [
    {
      method: shippingMethod,
      label: shippingLabel,
      price: shippingPrice,
      estimatedDays: shippingEstimatedDays ?? 1,
    },
  ] satisfies ShippingOption[];
}

export function CartModalContent({
  cart,
  isAuthenticated = false,
}: CartModalContentProps) {
  if (!cart || cart.items.length === 0) {
    return (
      <div className="grid justify-items-center gap-4 rounded-2xl bg-background px-5 py-10 text-center">
        <ShoppingBag className="h-12 w-12 text-primary" aria-hidden="true" />
        <h2 className="text-xl font-bold">Seu carrinho está vazio</h2>
        <p className="max-w-sm text-sm text-muted">
          Explore eletrônicos e acessórios e adicione seus favoritos para
          começar.
        </p>
        <Link
          href="/#catalogo"
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Explorar produtos
        </Link>
      </div>
    );
  }

  const summary = getCartSummary(cart);
  const stockValidation = validateCartStock(cart.items);
  const hasControlledMedication = cartHasControlledMedication(cart);
  const isPickup =
    hasControlledMedication || isPickupShippingMethod(cart.shippingMethod);
  const initialShippingOptions = isPickup
    ? []
    : getPersistedShippingOptions(cart);
  const selectedShippingMethod =
    cart.shippingMethod && !isPickup ? cart.shippingMethod : "standard";
  const hasShipping = Boolean(
    hasControlledMedication ||
    isPickup ||
    (cart.shippingLabel &&
      cart.shippingPrice != null &&
      cart.shippingPrice > 0),
  );
  const missingPrescription =
    hasControlledMedication && !cart.prescriptionImageUrl;
  const canCheckout =
    stockValidation.isValid && hasShipping && !missingPrescription;

  return (
    <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-start">
      <section
        aria-labelledby="cart-items-title"
        className="grid min-w-0 content-start gap-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="cart-items-title" className="text-lg font-bold">
            Seus produtos{" "}
            <span className="text-sm font-normal text-muted">
              ({summary.quantity}{" "}
              {summary.quantity === 1 ? "unidade" : "unidades"})
            </span>
          </h2>
          <Link
            href="/#catalogo"
            className="inline-flex min-h-11 items-center rounded-lg text-sm font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Continuar comprando
          </Link>
        </div>
        {!stockValidation.isValid && (
          <div className="rounded-lg border border-danger bg-red-50 p-3 text-sm text-danger">
            <p className="font-semibold">
              Revise o estoque antes de finalizar.
            </p>
            <ul className="mt-2 grid gap-1">
              {stockValidation.issues.map((issue) => (
                <li key={`${issue.productId}-${issue.code}`}>
                  {issue.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid min-w-0 content-start gap-3">
          {cart.items.map((item) => {
            const productImage =
              item.product.imageUrl ??
              item.product.imageUrl2 ??
              item.product.imageUrl3;

            const baseUnitPrice = item.baseUnitPrice ?? item.product.price;
            const hasItemCoupon =
              Boolean(item.couponCode) && item.couponDiscountAmount > 0;
            const itemCouponDiscountTotal =
              item.couponDiscountAmount * item.quantity;
            const originalItemTotal = baseUnitPrice * item.quantity;
            const finalItemTotal = item.unitPrice * item.quantity;

            return (
              <article
                key={item.id}
                className="grid grid-cols-[5rem_minmax(0,1fr)] gap-3 rounded-2xl border border-border bg-background p-3 sm:gap-4 sm:p-4"
              >
                <div className="relative aspect-square overflow-hidden w-20 h-20 rounded-lg bg-surface">
                  {productImage ? (
                    <Image
                      src={productImage}
                      alt={item.product.name}
                      fill
                      sizes="80px"
                      loading="lazy"
                      className="object-contain"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-muted">
                      Sem imagem
                    </div>
                  )}
                </div>

                <div className="grid min-w-0 gap-3">
                  <div className="grid min-w-0 gap-2">
                    <div className="min-w-0">
                      <h3 className="break-words text-sm font-semibold leading-5">
                        <Link
                          href={`/product/${item.product.slug}`}
                          className="rounded-sm hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2"
                        >
                          {item.product.name}
                        </Link>
                      </h3>
                      <p className="text-xs text-muted">
                        {currencyFormatter.format(item.unitPrice)} cada
                      </p>
                      {hasItemCoupon && (
                        <div className="mt-1 grid gap-0.5 text-xs text-muted">
                          <p>
                            Original:{" "}
                            <span className="line-through">
                              {currencyFormatter.format(originalItemTotal)}
                            </span>
                          </p>
                          <p className="text-primary">
                            Cupom {item.couponCode}:{" "}
                            {item.couponDiscountPercent}% ( -
                            {currencyFormatter.format(itemCouponDiscountTotal)})
                          </p>
                          <p>
                            Final: {currencyFormatter.format(finalItemTotal)}
                          </p>
                        </div>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-primary">
                      {currencyFormatter.format(item.quantity * item.unitPrice)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CartActionForm
                      action={updateCartItem}
                      successMessage="Quantidade atualizada."
                      className="flex items-center overflow-hidden rounded-lg border border-border bg-surface"
                    >
                      <input type="hidden" name="cartItemId" value={item.id} />
                      <button
                        type="submit"
                        name="quantity"
                        value={Math.max(item.quantity - 1, 1)}
                        disabled={item.quantity <= 1}
                        className="flex min-h-11 min-w-11 items-center justify-center text-muted transition hover:text-primary focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label={`Diminuir quantidade de ${item.product.name}`}
                      >
                        <Minus className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <span className="flex h-9 min-w-10 items-center justify-center border-x border-border px-2 text-sm font-semibold">
                        {item.quantity}
                      </span>
                      <button
                        type="submit"
                        name="quantity"
                        value={item.quantity + 1}
                        disabled={item.quantity >= item.product.stock}
                        className="flex min-h-11 min-w-11 items-center justify-center text-muted transition hover:text-primary focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label={`Aumentar quantidade de ${item.product.name}`}
                      >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </CartActionForm>

                    <CartActionForm
                      action={removeCartItem}
                      successMessage={`${item.product.name} foi removido do carrinho.`}
                    >
                      <input type="hidden" name="cartItemId" value={item.id} />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1 text-sm font-medium text-muted transition hover:border-danger hover:text-danger"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        Remover
                      </button>
                    </CartActionForm>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
      <aside
        aria-label="Entrega e resumo da compra"
        className="grid min-w-0 gap-4"
      >
        {hasControlledMedication ? (
          <PrescriptionUploadCard value={cart.prescriptionImageUrl} />
        ) : (
          <LazyShippingCalculatorCard
            initialState={{
              status: "idle",
              message: cart.shippingLabel
                ? isPickup
                  ? "Retirada na loja selecionada."
                  : `${cart.shippingLabel} adicionada ao carrinho.`
                : "",
              fulfillmentMethod: isPickup ? "pickup" : "shipping",
              postalCode: cart.shippingPostalCode ?? "",
              selectedMethod: selectedShippingMethod as ShippingMethod,
              options: initialShippingOptions,
            }}
          />
        )}

        <section className="rounded-lg border border-border bg-surface p-3 shadow-sm">
          <h2 className="text-lg font-semibold">Resumo</h2>
          <div className="mt-3 grid gap-3 text-sm">
            <div className="flex items-center justify-between text-muted">
              <span>Itens</span>
              <span>{summary.quantity}</span>
            </div>
            <div className="flex items-center justify-between text-muted">
              <span>Subtotal</span>
              <span>{currencyFormatter.format(summary.subtotal)}</span>
            </div>
            {summary.discountTotal > 0 && (
              <>
                <div className="flex items-center justify-between text-muted">
                  <span>Subtotal original</span>
                  <span>
                    {currencyFormatter.format(summary.originalSubtotal)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-primary">
                  <span>Descontos</span>
                  <span>
                    -{currencyFormatter.format(summary.discountTotal)}
                  </span>
                </div>
              </>
            )}
            <div className="flex items-center justify-between text-muted">
              <span>Frete</span>
              <span>
                {summary.shippingTotal > 0
                  ? currencyFormatter.format(summary.shippingTotal)
                  : isPickup
                    ? "Retirada na loja"
                    : cart.shippingLabel
                      ? "Recalcule o frete"
                      : "Nao calculado"}
              </span>
            </div>
            {cart.shippingLabel && (
              <p className="rounded-lg bg-background px-3 py-1 text-xs text-muted">
                {cart.shippingLabel}
                {cart.shippingEstimatedDays
                  ? ` - ${cart.shippingEstimatedDays} dia${cart.shippingEstimatedDays === 1 ? "" : "s"} uteis`
                  : ""}
              </p>
            )}
            <div className="flex items-center justify-between border-t border-border pt-2 text-base font-semibold">
              <span>Total</span>
              <span className="text-primary">
                {currencyFormatter.format(summary.total)}
              </span>
            </div>
          </div>

          {!hasShipping && (
            <p className="mt-2 rounded-lg border border-warning bg-yellow-50 p-3 text-sm text-warning">
              Calcule o frete antes de finalizar a compra.
            </p>
          )}

          {missingPrescription && (
            <p className="mt-2 rounded-lg border border-warning bg-yellow-50 p-3 text-sm text-warning">
              Anexe a receita para finalizar medicamentos controlados.
            </p>
          )}

          {canCheckout && isAuthenticated ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <form action={createMercadoPagoPixPayment}>
                <button
                  type="submit"
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-3 text-sm font-semibold text-background transition hover:bg-primary/90"
                >
                  <QrCode className="h-4 w-4" aria-hidden="true" />
                  Pix
                </button>
              </form>
              <form action={createStripeCheckoutSession}>
                <button
                  type="submit"
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-3 text-sm font-semibold transition hover:border-primary/10 hover:text-primary"
                >
                  <CreditCard className="h-4 w-4" aria-hidden="true" />
                  Cartão de crédito
                </button>
              </form>
            </div>
          ) : canCheckout ? (
            <Link
              href="/login?callbackUrl=/checkout/pagamento"
              className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-background transition hover:bg-primary/90"
            >
              Fazer login para finalizar a compra
            </Link>
          ) : (
            <p className="mt-3 rounded-lg border border-warning bg-yellow-50 p-3 text-sm text-warning">
              Revise os avisos acima para liberar o pagamento.
            </p>
          )}

          <CartActionForm
            action={clearCart}
            successMessage="Carrinho esvaziado."
            className="mt-3"
          >
            <button
              type="submit"
              className="w-full rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted transition hover:border-danger hover:text-danger"
            >
              Limpar carrinho
            </button>
          </CartActionForm>
        </section>
      </aside>
    </div>
  );
}
