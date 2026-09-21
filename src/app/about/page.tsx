import type { Metadata } from "next";
import Link from "next/link";
import {
  Clock3,
  Cpu,
  Eye,
  HeartHandshake,
  ListChecks,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Store,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  getSitePageContent,
  splitSiteContentParagraphs,
} from "@/lib/site-content";
import { SITE_NAME } from "@/lib/store-contact";

export const metadata: Metadata = {
  title: `Sobre | ${SITE_NAME}`,
  description: `Conheca a ${SITE_NAME}, sua estrutura, atendimento e compromisso com tecnologia, orientacao e preco justo.`,
};

const highlights = [
  {
    title: "Atendimento proximo",
    description:
      "Equipe preparada para orientar clientes no balcao, no televendas e nos canais digitais.",
    icon: Users,
  },
  {
    title: "Operacao responsavel",
    description:
      "Catalogo com especificacoes visiveis, dados legais publicados e processos internos organizados.",
    icon: ShieldCheck,
  },
  {
    title: "Loja local",
    description:
      "Presenca fisica em Campinas para retirada, suporte e atendimento direto a comunidade.",
    icon: Store,
  },
];

const serviceItems = [
  {
    title: "Horario",
    description: "Segunda a sabado, das 08h as 19h30, exceto feriados.",
    icon: Clock3,
  },
  {
    title: "Endereco",
    description:
      "R. Francisco Gomes de Souza, 08, Jardim Monte Cristo, Campinas - SP.",
    icon: MapPin,
  },
  {
    title: "Televendas",
    description: "(19) 98188-0619",
    icon: MessageCircle,
  },
];

type InstitutionalSection = {
  title: string;
  body: string;
  icon: LucideIcon;
};

type ValueItem = {
  label: string;
  description: string;
};

function getNormalizedSectionTitle(title: string) {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getInstitutionalIcon(title: string) {
  const normalizedTitle = getNormalizedSectionTitle(title);

  if (normalizedTitle.includes("missao")) {
    return Target;
  }

  if (normalizedTitle.includes("visao")) {
    return Eye;
  }

  if (normalizedTitle.includes("valor")) {
    return ListChecks;
  }

  return HeartHandshake;
}

function formatSectionTitle(title: string) {
  const normalizedTitle = getNormalizedSectionTitle(title);

  if (normalizedTitle.includes("missao")) {
    return "Missao";
  }

  if (normalizedTitle.includes("visao")) {
    return "Visao";
  }

  if (normalizedTitle.includes("valor")) {
    return "Valores";
  }

  if (normalizedTitle.includes("proposito")) {
    return "Proposito";
  }

  return title.trim();
}

function isValuesSection(title: string) {
  return getNormalizedSectionTitle(title).includes("valor");
}

function splitValueItems(body: string) {
  const valuePattern = /(?:^|[\n;,]\s*)([^:;\n]{3,80}):\s*/g;
  const matches = Array.from(body.matchAll(valuePattern));

  if (matches.length === 0) {
    return [] as ValueItem[];
  }

  return matches
    .map((match, index) => {
      const label = match[1].trim().replace(/^[\s\-•]+/, "");
      const descriptionStart = (match.index ?? 0) + match[0].length;
      const descriptionEnd = matches[index + 1]?.index ?? body.length;
      const description = body
        .slice(descriptionStart, descriptionEnd)
        .trim()
        .replace(/^[,;\s]+|[,;\s]+$/g, "");

      return {
        label,
        description,
      };
    })
    .filter((item) => item.label.length > 0 && item.description.length > 0);
}

function splitInstitutionalContent(content: string) {
  const sectionPattern =
    /(?:^|\s)(?:[\u2600-\u27bf]|\p{Extended_Pictographic})?\s*(Miss(?:a|\u00e3)o|Vis(?:a|\u00e3)o|Valores?|Prop(?:o|\u00f3)sito)\s*[:\-–—]?/giu;
  const matches = Array.from(content.matchAll(sectionPattern));

  if (matches.length === 0) {
    return {
      introParagraphs: splitSiteContentParagraphs(content),
      sections: [] as InstitutionalSection[],
    };
  }

  const introParagraphs = splitSiteContentParagraphs(
    content.slice(0, matches[0].index).trim(),
  ).filter((paragraph) => !/^\d+$/.test(paragraph));

  const sections = matches
    .map((match, index) => {
      const title = formatSectionTitle(match[1]);
      const bodyStart = (match.index ?? 0) + match[0].length;
      const bodyEnd = matches[index + 1]?.index ?? content.length;
      const body = content.slice(bodyStart, bodyEnd).trim();

      return {
        title,
        body,
        icon: getInstitutionalIcon(title),
      };
    })
    .filter((section) => section.body.length > 0);

  return {
    introParagraphs,
    sections,
  };
}

export default async function AboutPage() {
  const page = await getSitePageContent("about");
  const { introParagraphs, sections } = splitInstitutionalContent(page.content);
  const hasStructuredSections = sections.length > 0;

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 sm:px-8 lg:py-14">
      <section className="grid gap-8 border-b border-border pb-10 lg:grid-cols-[1fr_0.9fr] lg:items-center">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold uppercase text-primary">
            <Cpu className="h-4 w-4" aria-hidden="true" />
            {SITE_NAME}
          </span>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
            {page.title}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-muted">
            Tecnologia, variedade e preco justo em uma experiencia de compra
            simples, segura e conectada ao atendimento da loja fisica.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/contato"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-background transition hover:bg-primary/90"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              Falar com a loja
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-3 text-sm font-semibold transition hover:border-primary/10 hover:text-primary"
            >
              <Store className="h-4 w-4" aria-hidden="true" />
              Ver produtos
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="rounded-lg bg-background p-2 text-primary">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                Loja local com atendimento proximo
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                Atendimento online integrado a loja fisica, com canais claros
                para duvidas, retirada e orientacoes sobre produtos.
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-3">
            {serviceItems.map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.title} className="rounded-lg bg-background p-4">
                  <div className="flex items-start gap-3">
                    <Icon
                      className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    <div>
                      <p className="text-sm font-semibold">{item.title}</p>
                      <p className="mt-1 text-sm leading-6 text-muted">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-3">
        {highlights.map((item) => {
          const Icon = item.icon;

          return (
            <article
              key={item.title}
              className="rounded-lg border border-border bg-surface p-5 shadow-sm"
            >
              <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 className="mt-3 text-lg font-semibold tracking-tight">
                {item.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                {item.description}
              </p>
            </article>
          );
        })}
      </section>

      <section className="mt-10 grid gap-6">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            Institucional
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            Nossa historia e estrutura
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            Cuidando de sua saude com carinho.
          </p>
        </div>

        <div
          className={`grid gap-4 ${
            hasStructuredSections ? "lg:grid-cols-2" : ""
          }`}
        >
          {introParagraphs.map((paragraph) => (
            <article
              key={paragraph}
              className="rounded-lg border border-border bg-surface p-5 shadow-sm lg:col-span-full"
            >
              <p className="text-base leading-7 text-muted">{paragraph}</p>
            </article>
          ))}

          {hasStructuredSections
            ? sections.map((section) => {
                const Icon = section.icon;
                const valueItems = isValuesSection(section.title)
                  ? splitValueItems(section.body)
                  : [];

                return (
                  <article
                    key={section.title}
                    className={`group overflow-hidden rounded-lg border border-border bg-surface shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md ${
                      isValuesSection(section.title) ? "lg:col-span-2" : ""
                    }`}
                  >
                    <div className="flex items-start gap-4 border-b border-border bg-background/70 p-5">
                      <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                        <Icon className="h-6 w-6" aria-hidden="true" />
                      </span>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                          Institucional
                        </p>
                        <h3 className="mt-1 text-xl font-semibold tracking-tight">
                          {section.title}
                        </h3>
                      </div>
                    </div>
                    <div className="p-5">
                      {valueItems.length > 0 ? (
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                          {valueItems.map((item, index) => (
                            <div
                              key={item.label}
                              className="rounded-lg border border-border bg-background p-4"
                            >
                              <div className="flex items-start gap-3">
                                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                                  {String(index + 1).padStart(2, "0")}
                                </span>
                                <div>
                                  <h4 className="text-base font-semibold tracking-tight">
                                    {item.label}
                                  </h4>
                                  <p className="mt-2 text-sm leading-6 text-muted">
                                    {item.description}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-base leading-8 text-muted">
                          {section.body}
                        </p>
                      )}
                    </div>
                  </article>
                );
              })
            : splitSiteContentParagraphs(page.content).map(
                (paragraph, index) => (
                  <article
                    key={paragraph}
                    className="rounded-lg border border-border bg-surface p-5 shadow-sm"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                      {String(index + 1).padStart(2, "0")}
                    </p>
                    <p className="mt-3 text-base leading-7 text-muted">
                      {paragraph}
                    </p>
                  </article>
                ),
              )}
        </div>
      </section>
    </main>
  );
}
