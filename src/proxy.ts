import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";
import { AUTH_SESSION_COOKIE_NAME } from "@/lib/auth-cookie";

const PICKUP_SHIPPING_METHOD = "pickup";
const PAID_PAYMENT_STATUS = "PAID";

function isCheckoutAddressPath(pathname: string) {
  return pathname === "/checkout/endereco";
}

async function getPendingCheckoutAddressSessionId(userId: string) {
  const { prisma } = await import("@/lib/prisma");

  const cart = await prisma.cart.findFirst({
    where: {
      userId,
      paymentStatus: PAID_PAYMENT_STATUS,
      NOT: {
        shippingMethod: PICKUP_SHIPPING_METHOD,
      },
      checkoutAddress: {
        is: null,
      },
    },
    select: {
      stripeCheckoutSessionId: true,
      mercadoPagoPaymentId: true,
    },
    orderBy: [
      {
        paidAt: "desc",
      },
      {
        updatedAt: "desc",
      },
    ],
  });

  return cart
    ? {
        stripeCheckoutSessionId: cart.stripeCheckoutSessionId,
        mercadoPagoPaymentId: cart.mercadoPagoPaymentId,
      }
    : null;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isCheckoutAddressPath(pathname) || request.method !== "GET") {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: AUTH_SESSION_COOKIE_NAME,
  });
  const userId = (token?.id as string | undefined) ?? token?.sub;

  if (!userId) {
    return NextResponse.next();
  }

  const pendingCheckoutAddress =
    await getPendingCheckoutAddressSessionId(userId);

  if (!pendingCheckoutAddress) {
    return NextResponse.next();
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/checkout/endereco";
  redirectUrl.search = "";
  if (pendingCheckoutAddress.stripeCheckoutSessionId) {
    redirectUrl.searchParams.set(
      "session_id",
      pendingCheckoutAddress.stripeCheckoutSessionId,
    );
  } else if (pendingCheckoutAddress.mercadoPagoPaymentId) {
    redirectUrl.searchParams.set(
      "mp_payment_id",
      pendingCheckoutAddress.mercadoPagoPaymentId,
    );
  }

  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: [
    {
      source:
        "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
