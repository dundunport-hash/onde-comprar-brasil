import Image from "next/image";
import Link from "next/link";
import {
  CreditCard,
  FileText,
  Headphones,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { SITE_NAME } from "@/lib/store-contact";

const legalItems = ["CNPJ: 24.928.572/0001-01"];

const footerLinks = [
  { href: "/about", label: "Sobre nos" },
  { href: "/terms", label: "Como comprar" },
  { href: "/terms", label: "Formas de pagamento" },
  { href: "/privacy", label: "Politica de privacidade" },
  { href: "/contato", label: "Fale conosco" },
];

const benefits = [
  {
    icon: Truck,
    title: "Entrega para todo o Brasil",
    text: "Com rapidez e seguranca",
  },
  { icon: ShieldCheck, title: "Compra segura", text: "Seus dados protegidos" },
  {
    icon: CreditCard,
    title: "Parcele sua compra",
    text: "Nos principais cartoes",
  },
  {
    icon: Headphones,
    title: "Atendimento ao cliente",
    text: "Sempre com voce",
  },
];

export const Footer = () => {
  return (
    <footer className="mt-8 border-t border-border bg-surface text-foreground">
      <section className="border-b border-border bg-surface">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-6 sm:px-6 lg:grid-cols-[1.2fr_2fr_1.4fr] lg:items-center lg:px-8">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt=""
              width={1254}
              height={1254}
              className="h-16 w-16 shrink-0 rounded-full object-contain"
            />
            <div>
              <p className="text-lg font-bold text-foreground">{SITE_NAME}</p>
              <p className="text-sm text-muted">
                Mais que um e-commerce, um Brasil de oportunidades.
              </p>
            </div>
          </div>

          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex flex-col items-center gap-2">
                <div>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <p className="text-sm font-bold">{title}</p>
                  <p className="text-xs text-muted">{text}</p>
                </div>
              </li>
            ))}
          </ul>

          <form className="grid gap-2" aria-label="Receber ofertas">
            <label htmlFor="footer-newsletter" className="text-sm font-bold">
              Receba nossas ofertas
            </label>
            <div className="flex rounded-2xl border border-border bg-background p-1">
              <div className="flex min-h-11 min-w-11 items-center justify-center text-muted">
                <Mail className="h-5 w-5" aria-hidden="true" />
              </div>
              <input
                id="footer-newsletter"
                type="email"
                placeholder="Seu melhor e-mail"
                className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none"
              />
              <button
                type="submit"
                className="rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition hover:bg-primary/90"
              >
                Quero receber
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="bg-institutional text-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-4 lg:grid-cols-[1.1fr_1fr] lg:px-6">
          <div className="grid gap-2">
            <h2 className="text-2xl font-bold tracking-tight">
              Tudo o que voce procura, mais perto de voce.
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-white/80">
              Atendimento de segunda a sabado, das 08h as 19h30, exceto
              feriados. Compre pelo site, retire na loja ou receba em casa.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                <div className="flex items-start gap-3">
                  <MapPin
                    className="mt-0.5 h-5 w-5 shrink-0 text-secondary"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-sm font-bold">Endereco</p>
                    <p className="mt-1 text-sm leading-6 text-white/80">
                      R. Francisco Gomes de Souza, 08, Jardim Monte Cristo,
                      Campinas - SP, 13049-133
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                <div className="flex items-start gap-3">
                  <Phone
                    className="mt-0.5 h-5 w-5 shrink-0 text-secondary"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-sm font-bold">Atendimento</p>
                    <p className="mt-1 text-sm leading-6 text-white/80">
                      (19) 98188-0619
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid content-start gap-5 lg:justify-items-end">
            <div className="w-full rounded-2xl border border-white/15 bg-white/10 p-4 lg:max-w-xl">
              <div className="flex items-center gap-2 text-sm font-bold">
                <ShieldCheck
                  className="h-5 w-5 text-secondary"
                  aria-hidden="true"
                />
                Dados legais
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {legalItems.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/80"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <nav
              aria-label="Links institucionais"
              className="flex w-full flex-wrap gap-2 lg:max-w-xl"
            >
              {footerLinks.map((link) => (
                <Link
                  key={`${link.href}-${link.label}`}
                  href={link.href}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 text-sm font-medium text-white transition hover:bg-white hover:text-institutional"
                >
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        <div className="border-t border-white/15">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 pb-20 pt-5 text-xs leading-5 text-white/70 sm:px-6 sm:py-5 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <p>
              As informacoes, promocoes e ofertas exibidas neste site podem ser
              alteradas sem aviso previo.
            </p>
            <p className="font-medium text-white">
              &copy; 2026 {SITE_NAME}. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </section>
    </footer>
  );
};
