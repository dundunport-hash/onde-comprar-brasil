import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  BarChart3,
  Boxes,
  ClipboardList,
  FileText,
  Home,
  ImagePlus,
  PackageCheck,
  Percent,
  ReceiptText,
  ShieldCheck,
  Tag,
  UserCog,
} from "lucide-react";
import { SITE_NAME } from "@/lib/store-contact";

const dashboardLinks = [
  { href: "/dashboard", label: "Visao geral", icon: Home },
  { href: "/dashboard/produtos", label: "Produtos", icon: PackageCheck },
  { href: "/dashboard/estoque", label: "Estoque", icon: Boxes },
  { href: "/dashboard/pedidos", label: "Pedidos", icon: ReceiptText },
  { href: "/dashboard/promocoes", label: "Promocoes", icon: Percent },
  { href: "/dashboard/cupons", label: "Cupons", icon: Tag },
  { href: "/dashboard/usuarios", label: "Usuarios", icon: UserCog },
  { href: "/dashboard/banners", label: "Banners", icon: ImagePlus },
  { href: "/dashboard/conteudo", label: "Conteudo", icon: FileText },
  { href: "/dashboard/metricas", label: "Metricas", icon: BarChart3 },
  { href: "/dashboard/auditoria", label: "Auditoria", icon: ShieldCheck },
  {
    href: "/dashboard/observabilidade",
    label: "Observabilidade",
    icon: Activity,
  },
  { href: "/", label: "Voltar para loja", icon: ClipboardList },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      data-dashboard-shell
      className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-5 sm:px-6 lg:grid-cols-[17rem_minmax(0,1fr)] lg:py-8"
    >
      <aside className="lg:sticky lg:top-36 lg:self-start">
        <div className="overflow-hidden rounded-[1.25rem] border border-border bg-surface shadow-sm">
          <div className="border-b border-border p-4">
            <Link href="/dashboard" className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt=""
                width={1254}
                height={1254}
                className="h-12 w-12 rounded-full object-contain"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-foreground">
                  {SITE_NAME}
                </p>
                <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                  Admin
                </p>
              </div>
            </Link>
          </div>
          <nav
            aria-label="Navegacao do dashboard"
            className="grid max-h-[calc(100vh-15rem)] gap-1 overflow-y-auto p-2"
          >
            {dashboardLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-foreground transition hover:bg-primary/10 hover:text-primary"
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span className="truncate">{label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </aside>

      <section className="min-w-0 overflow-hidden rounded-[1.25rem] border border-border bg-white/72 shadow-sm backdrop-blur">
        <div className="border-b border-border bg-surface px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
            Painel administrativo
          </p>
          <p className="mt-1 text-sm text-muted">
            Gestao comercial com a mesma identidade da loja.
          </p>
        </div>
        <div className="admin-surface min-w-0">{children}</div>
      </section>
    </div>
  );
}
