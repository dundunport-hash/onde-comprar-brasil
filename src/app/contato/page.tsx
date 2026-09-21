import type { Metadata } from "next";
import {
  BriefcaseBusiness,
  Handshake,
  Mail,
  MessageCircle,
  PackageSearch,
  Users,
} from "lucide-react";
import { SITE_NAME } from "@/lib/store-contact";

const supplierWhatsappUrl =
  "https://wa.me/5519981880619?text=Ol%C3%A1%2C%20Visitei%20seu%20site%20te%20apresentar%20meus%20produtos";
const customerWhatsappUrl =
  "https://api.whatsapp.com/send/?phone=5519981880619&text=Ol%C3%A1%2C+estou+no+seu+site+e+quero+saber+mais..&type=phone_number&app_absent=0";
const contactEmail = "drogamegapopular@hotmail.com";

const contactCards = [
  {
    title: "Fornecedores",
    description:
      "Apresente produtos, condicoes comerciais e oportunidades para nossa equipe.",
    href: supplierWhatsappUrl,
    action: "Falar pelo WhatsApp",
    icon: PackageSearch,
    external: true,
  },
  {
    title: "Clientes",
    description:
      "Tire duvidas sobre produtos, pedidos, retirada na loja e atendimento.",
    href: customerWhatsappUrl,
    action: "Atendimento ao cliente",
    icon: Users,
    external: true,
  },
  {
    title: "E-mail",
    description:
      "Envie uma mensagem formal para nosso canal administrativo e comercial.",
    href: `mailto:${contactEmail}`,
    action: contactEmail,
    icon: Mail,
    external: false,
  },
  {
    title: "Trabalhe conosco",
    description:
      "Envie seu curriculo e conte em qual area gostaria de atuar conosco.",
    href: `mailto:${contactEmail}?subject=Trabalhe%20conosco`,
    action: "Enviar curriculo",
    icon: BriefcaseBusiness,
    external: false,
  },
  {
    title: "Parcerias",
    description:
      "Converse sobre acoes locais, campanhas, beneficios e iniciativas conjuntas.",
    href: `mailto:${contactEmail}?subject=Parcerias`,
    action: "Propor parceria",
    icon: Handshake,
    external: false,
  },
];

export const metadata: Metadata = {
  title: `Contato | ${SITE_NAME}`,
  description: `Canais de contato da ${SITE_NAME} para clientes, fornecedores, parcerias e trabalhe conosco.`,
};

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-12 sm:px-8 lg:py-16">
      <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div className="lg:sticky lg:top-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold uppercase text-primary">
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            Canais oficiais
          </span>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
            Fale com a {SITE_NAME}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted">
            Escolha o canal mais adequado para que sua mensagem chegue direto ao
            time certo. Atendimento claro, organizado e com retorno pelo canal
            indicado.
          </p>

          <div className="mt-6 rounded-lg border border-border bg-surface p-4 shadow-sm">
            <p className="text-sm font-semibold">Contato principal</p>
            <a
              href={`mailto:${contactEmail}`}
              className="mt-2 inline-flex break-all text-sm font-medium text-primary transition hover:underline"
            >
              {contactEmail}
            </a>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {contactCards.map((card, index) => {
            const Icon = card.icon;
            const isFeatured = index < 2;

            return (
              <a
                key={card.title}
                href={card.href}
                target={card.external ? "_blank" : undefined}
                rel={card.external ? "noopener noreferrer" : undefined}
                className={`group grid min-h-56 gap-5 rounded-lg border p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/10 hover:shadow-md ${
                  isFeatured
                    ? "border-primary/20 bg-primary text-primary-foreground sm:col-span-1"
                    : "border-border bg-surface"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <span
                    className={`inline-flex h-11 w-11 items-center justify-center rounded-lg ${
                      isFeatured
                        ? "bg-background/15 text-primary-foreground"
                        : "bg-background text-primary"
                    }`}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span
                    className={`text-xs font-semibold uppercase ${
                      isFeatured ? "text-primary-foreground/80" : "text-muted"
                    }`}
                  >
                    {card.external ? "WhatsApp" : "E-mail"}
                  </span>
                </div>

                <div>
                  <h2 className="text-xl font-semibold tracking-tight">
                    {card.title}
                  </h2>
                  <p
                    className={`mt-2 text-sm leading-6 ${
                      isFeatured ? "text-primary-foreground/85" : "text-muted"
                    }`}
                  >
                    {card.description}
                  </p>
                </div>

                <span
                  className={`mt-auto inline-flex w-fit items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    isFeatured
                      ? "bg-background text-primary group-hover:bg-secondary"
                      : "border border-border text-foreground group-hover:border-primary/10 group-hover:text-primary"
                  }`}
                >
                  {card.action}
                </span>
              </a>
            );
          })}
        </div>
      </section>
    </main>
  );
}
