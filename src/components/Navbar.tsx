import Link from "next/link";
import { getServerSession } from "next-auth";
import { CartStatus, PaymentStatus } from "@prisma/client";
import {
  Grid3X3,
  Home,
  LayoutDashboard,
  Lock,
  MapPin,
  Menu,
  Percent,
  User,
  type LucideIcon,
} from "lucide-react";
import { authOptions } from "@/lib/auth";
import { getCart, getCartSummary } from "@/lib/cart";
import { prisma } from "@/lib/prisma";
import { CartModal } from "./CartModal";
import { CartModalContent } from "./CartModalContent";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badgeCount?: number;
};

const publicNavItems: NavItem[] = [
  { href: "/#ofertas", label: "Ofertas", icon: Percent },
  { href: "/#destaques", label: "Mais Vendidos", icon: Percent },
  { href: "/#catalogo", label: "Novidades", icon: Grid3X3 },
  { href: "/#catalogo", label: "Eletronicos", icon: Grid3X3 },
  { href: "/#catalogo", label: "Casa e Decoracao", icon: Home },
  { href: "/#catalogo", label: "Moda", icon: Grid3X3 },
  { href: "/#catalogo", label: "Beleza e Saude", icon: Grid3X3 },
  { href: "/#catalogo", label: "Esporte e Lazer", icon: Grid3X3 },
  { href: "/#catalogo", label: "Inovacao", icon: Grid3X3 },
];

const authNavItems: NavItem[] = [
  { href: "/profile", label: "Perfil", icon: User },
];

const adminNavItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
];

function NavLink({ item }: { item: NavItem }) {
  const Icon = item.icon;
  const badgeLabel =
    typeof item.badgeCount === "number" && item.badgeCount > 0
      ? item.badgeCount > 99
        ? "99+"
        : String(item.badgeCount)
      : null;

  return (
    <Link
      href={item.href}
      className="relative inline-flex min-h-10 shrink-0 items-center gap-2 border-l border-border px-3 text-xs font-black text-foreground transition first:border-l-0 hover:text-primary"
    >
      <Icon className="hidden h-4 w-4" aria-hidden="true" />
      <span>{item.label}</span>
      {badgeLabel && (
        <span
          aria-label={`${badgeLabel} nova venda${
            badgeLabel === "1" ? "" : "s"
          }`}
          className="ml-0.5 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1.5 text-[11px] font-bold leading-none text-foreground shadow-sm ring-2 ring-surface"
        >
          {badgeLabel}
        </span>
      )}
    </Link>
  );
}

export const Navbar = async () => {
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === "ADMIN";
  const [cart, pendingAdminSales] = await Promise.all([
    getCart(session?.user?.id ?? null),
    isAdmin
      ? prisma.cart.count({
          where: {
            paymentStatus: PaymentStatus.PAID,
            status: {
              in: [
                CartStatus.CHECKED_OUT,
                CartStatus.AWAITING_SHIPMENT,
                CartStatus.AWAITING_PICKUP,
              ],
            },
          },
        })
      : Promise.resolve(0),
  ]);
  const cartSummary = cart ? getCartSummary(cart) : { quantity: 0 };

  const navItems = session
    ? [
        ...publicNavItems,
        ...authNavItems,
        ...(isAdmin
          ? adminNavItems.map((item) => ({
              ...item,
              badgeCount: pendingAdminSales,
            }))
          : []),
      ]
    : publicNavItems;

  return (
    <nav className="contents text-sm font-bold">
      <div className="hidden items-center justify-end gap-2 lg:flex">
        {session ? (
          <div className="flex min-w-0 items-center gap-2">
            <span className="hidden max-w-44 truncate text-xs leading-tight text-muted xl:inline">
              Ola, {session.user?.name || session.user?.email}
            </span>
            <Link
              href="/profile"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-2 text-foreground transition hover:text-primary"
            >
              <User className="h-5 w-5" aria-hidden="true" />
              <span className="hidden leading-tight xl:inline">
                Ola!
                <span className="block">Minha conta</span>
              </span>
            </Link>
            <CartModal itemCount={cartSummary.quantity}>
              <CartModalContent
                cart={cart}
                isAuthenticated={Boolean(session)}
              />
            </CartModal>
            <Link
              href="/api/auth/signout"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border px-2 text-sm text-foreground transition hover:border-primary hover:text-primary"
            >
              Sair
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-2 text-foreground transition hover:text-primary"
            >
              <Lock className="h-5 w-5" aria-hidden="true" />
              <span className="hidden leading-tight xl:inline">
                Ola!
                <span className="block">Minha conta</span>
              </span>
            </Link>
            <CartModal itemCount={cartSummary.quantity}>
              <CartModalContent
                cart={cart}
                isAuthenticated={Boolean(session)}
              />
            </CartModal>
          </div>
        )}
      </div>

      <div className="col-span-3 -mx-4 hidden items-center justify-between gap-2 bg-[#f1f4f6] px-2 py-0 lg:flex sm:-mx-2 sm:px-2 lg:-mx-2 lg:px-2">
        <Link
          href="/#catalogo"
          className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-r-2xl bg-primary px-3 text-sm font-black text-primary-foreground transition hover:bg-primary/90"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
          categorias
        </Link>
        <div className="flex min-w-0 flex-1 items-center overflow-x-auto">
          {navItems.map((item) => (
            <NavLink key={`${item.href}-${item.label}`} item={item} />
          ))}
        </div>
        <span className="hidden shrink-0 items-center gap-2 text-xs font-black text-foreground xl:inline-flex">
          <MapPin className="h-7 w-7 text-primary" aria-hidden="true" />
          Entregamos em todo o Brasil
        </span>
      </div>

      <div className="flex items-center justify-end gap-2 lg:hidden">
        <CartModal itemCount={cartSummary.quantity}>
          <CartModalContent cart={cart} isAuthenticated={Boolean(session)} />
        </CartModal>
        <details className="group relative">
          <summary
            aria-label="Menu de navegacao"
            className="flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center gap-2 rounded-xl bg-primary px-2 text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
            <span className="hidden sm:inline">Menu</span>
          </summary>

          <div className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-[min(19rem,calc(100vw-2rem))] rounded-2xl border border-border bg-surface p-2 text-foreground shadow-lg">
            {session && (
              <p className="mb-2 truncate border-b border-border px-2 pb-3 text-xs font-medium text-muted">
                Ola, {session.user?.name || session.user?.email}
              </p>
            )}

            <div className="grid gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={`${item.href}-${item.label}`}
                    href={item.href}
                    className="flex min-h-10 items-center gap-3 rounded-xl px-2 transition hover:bg-background hover:text-primary"
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                    <span>{item.label}</span>
                    {typeof item.badgeCount === "number" &&
                      item.badgeCount > 0 && (
                        <span
                          aria-label={`${item.badgeCount} nova venda${
                            item.badgeCount === 1 ? "" : "s"
                          }`}
                          className="ml-auto inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1.5 text-[11px] font-bold leading-none text-foreground"
                        >
                          {item.badgeCount > 99 ? "99+" : item.badgeCount}
                        </span>
                      )}
                  </Link>
                );
              })}
            </div>
            <div className="mt-2 flex items-center gap-2 border-t border-border pt-2">
              <Link
                href={session ? "/api/auth/signout" : "/login"}
                className="flex min-h-10 items-center gap-2 rounded-xl px-3 transition hover:bg-background hover:text-primary"
              >
                <Lock className="h-5 w-5" aria-hidden="true" />
                <span>{session ? "Sair" : "Login"}</span>
              </Link>
            </div>
          </div>
        </details>
      </div>
    </nav>
  );
};
