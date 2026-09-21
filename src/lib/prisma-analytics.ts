import { PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type CountRow<Key extends string, Value> = {
  [key in Key]: Value;
} & {
  _count: {
    _all: number;
  };
};

export function getGroupedCount<Key extends string, Value>(
  rows: Array<CountRow<Key, Value>>,
  key: Key,
  value: Value,
) {
  return rows.find((row) => row[key] === value)?._count._all ?? 0;
}

export async function getCartCountsByStatus() {
  return prisma.cart.groupBy({
    by: ["status"],
    _count: {
      _all: true,
    },
  });
}

export async function getCartCountsByPaymentStatus() {
  return prisma.cart.groupBy({
    by: ["paymentStatus"],
    _count: {
      _all: true,
    },
  });
}

export async function getPaidCartMetrics(from?: Date) {
  const carts = await prisma.cart.findMany({
    where: {
      paymentStatus: PaymentStatus.PAID,
      ...(from
        ? {
            OR: [
              { paidAt: { gte: from } },
              { paidAt: null, updatedAt: { gte: from } },
            ],
          }
        : {}),
    },
    select: {
      items: {
        select: {
          quantity: true,
          unitPrice: true,
        },
      },
    },
  });

  return carts.reduce(
    (metrics, cart) => {
      const items = cart.items.reduce(
        (subtotal, item) => ({
          revenue: subtotal.revenue + item.quantity * item.unitPrice,
          itemsSold: subtotal.itemsSold + item.quantity,
        }),
        { revenue: 0, itemsSold: 0 },
      );

      return {
        orders: metrics.orders + 1,
        revenue: metrics.revenue + items.revenue,
        itemsSold: metrics.itemsSold + items.itemsSold,
      };
    },
    { orders: 0, revenue: 0, itemsSold: 0 },
  );
}

export async function getInventoryValue() {
  const products = await prisma.product.findMany({
    select: {
      price: true,
      stock: true,
    },
  });

  return products.reduce(
    (total, product) => total + product.price * product.stock,
    0,
  );
}

export async function getDailyPaidSales(from: Date) {
  const carts = await prisma.cart.findMany({
    where: {
      paymentStatus: PaymentStatus.PAID,
      OR: [
        { paidAt: { gte: from } },
        { paidAt: null, updatedAt: { gte: from } },
      ],
    },
    select: {
      paidAt: true,
      updatedAt: true,
      items: {
        select: {
          quantity: true,
          unitPrice: true,
        },
      },
    },
    orderBy: {
      updatedAt: "asc",
    },
  });

  const salesByDay = new Map<
    string,
    { day: Date; orders: number; revenue: number }
  >();

  carts.forEach((cart) => {
    const referenceDate = cart.paidAt ?? cart.updatedAt;
    const day = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth(),
      referenceDate.getDate(),
    );
    const key = day.toISOString();
    const current = salesByDay.get(key) ?? { day, orders: 0, revenue: 0 };

    salesByDay.set(key, {
      day,
      orders: current.orders + 1,
      revenue:
        current.revenue +
        cart.items.reduce(
          (total, item) => total + item.quantity * item.unitPrice,
          0,
        ),
    });
  });

  return Array.from(salesByDay.values()).sort(
    (left, right) => left.day.getTime() - right.day.getTime(),
  );
}

export async function getTopPaidProducts(limit: number) {
  const items = await prisma.cartItem.findMany({
    where: {
      cart: {
        paymentStatus: PaymentStatus.PAID,
      },
    },
    select: {
      quantity: true,
      unitPrice: true,
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  const products = new Map<
    string,
    {
      id: string;
      name: string;
      slug: string;
      quantity: number;
      revenue: number;
    }
  >();

  items.forEach((item) => {
    const current = products.get(item.product.id) ?? {
      ...item.product,
      quantity: 0,
      revenue: 0,
    };

    products.set(item.product.id, {
      ...current,
      quantity: current.quantity + item.quantity,
      revenue: current.revenue + item.quantity * item.unitPrice,
    });
  });

  return Array.from(products.values())
    .sort((left, right) => right.revenue - left.revenue)
    .slice(0, limit);
}
