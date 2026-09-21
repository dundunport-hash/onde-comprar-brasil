"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureMelhorEnvioShipmentForPaidCart } from "@/lib/checkout-fulfillment";
import { getAuditActor, recordAuditLog } from "@/lib/audit";
import {
  getCheckoutAddressValues,
  validateCheckoutAddress,
  type CheckoutAddressErrors,
  type CheckoutAddressValues,
} from "@/lib/address";
import { cartInclude, getOrCreateCart } from "@/lib/cart";
import { prisma } from "@/lib/prisma";
import { sanitizeExternalId } from "@/lib/sanitize";
import { validateCartStock } from "@/lib/stock-validation";

export type CheckoutAddressState = {
  status: "idle" | "success" | "error";
  message: string;
  errors: CheckoutAddressErrors;
  values: CheckoutAddressValues;
};

function getErrorState(
  message: string,
  values: CheckoutAddressValues,
  errors: CheckoutAddressErrors = {},
): CheckoutAddressState {
  return {
    status: "error",
    message,
    errors,
    values,
  };
}

export async function saveCheckoutAddress(
  _previousState: CheckoutAddressState,
  formData: FormData,
): Promise<CheckoutAddressState> {
  const values = getCheckoutAddressValues(formData);
  const stripeCheckoutSessionId = sanitizeExternalId(
    formData.get("stripeCheckoutSessionId"),
  );
  const mercadoPagoPaymentId = sanitizeExternalId(
    formData.get("mercadoPagoPaymentId"),
  );
  const validation = validateCheckoutAddress(values);

  if (!validation.isValid) {
    return getErrorState(
      "Revise os dados do endereco.",
      values,
      validation.errors,
    );
  }

  const session = await getServerSession(authOptions);
  const cart =
    stripeCheckoutSessionId.length > 0 || mercadoPagoPaymentId.length > 0
      ? await prisma.cart.findFirst({
          where:
            stripeCheckoutSessionId.length > 0
              ? {
                  stripeCheckoutSessionId,
                }
              : {
                  mercadoPagoPaymentId,
                },
          include: cartInclude,
        })
      : await getOrCreateCart(session?.user?.id ?? null);

  if (!cart || cart.items.length === 0) {
    return getErrorState("Seu carrinho esta vazio.", values);
  }

  const stockValidation = validateCartStock(cart.items);

  if (!cart.paidAt && !stockValidation.isValid) {
    return getErrorState(
      "Revise o estoque dos itens antes de continuar.",
      values,
    );
  }

  const address = await prisma.checkoutAddress.upsert({
    where: {
      cartId: cart.id,
    },
    create: {
      ...values,
      complement: values.complement || null,
      cartId: cart.id,
      userId: session?.user?.id ?? null,
    },
    update: {
      ...values,
      complement: values.complement || null,
      userId: session?.user?.id ?? null,
    },
  });

  if (session?.user?.id) {
    await prisma.user.update({
      where: {
        id: session.user.id,
      },
      data: {
        phone: values.phone,
      },
    });
  }

  if (address) {
    await recordAuditLog({
      action: "checkout.address.upsert",
      entity: "CheckoutAddress",
      entityId: address.id,
      actor: getAuditActor(session),
      metadata: {
        cartId: cart.id,
        hasComplement: Boolean(address.complement),
        postalCodePrefix: address.postalCode.slice(0, 3),
        city: address.city,
        state: address.state,
      },
    });
  }

  if (cart.paidAt) {
    await ensureMelhorEnvioShipmentForPaidCart(cart.id);
  }

  revalidatePath("/checkout/endereco");
  revalidatePath("/checkout/sucesso");
  revalidatePath("/dashboard/pedidos");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/metricas");

  return {
    status: "success",
    message:
      "Endereco salvo com sucesso. Voce sera redirecionado para a confirmacao do pedido.",
    errors: {},
    values,
  };
}
