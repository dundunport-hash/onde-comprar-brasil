import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Database,
  FileText,
  LockKeyhole,
  Scale,
  ShieldCheck,
  Store,
  Truck,
  UserCheck,
} from "lucide-react";
import { SITE_NAME } from "@/lib/store-contact";

export const metadata: Metadata = {
  title: `Termos de uso | ${SITE_NAME}`,
  description: `Termos de uso, condicoes comerciais, regras de entrega e politica de privacidade da ${SITE_NAME}.`,
};

const summaryCards = [
  {
    title: "Uso do site",
    description:
      "Ao navegar e utilizar a plataforma digital, o cliente concorda com os termos, condicoes e politicas da loja.",
    icon: FileText,
  },
  {
    title: "Compras e pagamentos",
    description:
      "Pedidos, precos, estoque, frete e formas de pagamento seguem as regras comerciais da loja.",
    icon: ClipboardList,
  },
  {
    title: "Dados e privacidade",
    description:
      "Dados pessoais e de pedido sao tratados conforme a LGPD e demais normas aplicaveis.",
    icon: ShieldCheck,
  },
];

const notices = [
  "Precos, promocoes e disponibilidade podem variar entre o site e a loja fisica.",
  "As imagens dos produtos sao ilustrativas e as especificacoes podem variar conforme o fabricante.",
  "O prazo de entrega e estimado e depende da transportadora e da regiao de destino.",
];

const termsSections = [
  {
    eyebrow: "Termo 01",
    title: "Funcionalidade da plataforma digital",
    icon: Store,
    lines: [
      `O site funciona como canal de comercio eletronico da ${SITE_NAME}, voltado a exibicao de catalogo, ofertas e venda de produtos de tecnologia e eletronicos.`,
      "A disponibilidade de estoque, precos e promocoes e valida prioritariamente para o ambiente digital e pode variar em relacao a loja fisica.",
      `${SITE_NAME} pode modificar, suspender ou descontinuar aspectos ou funcionalidades do site a qualquer momento, sem aviso previo.`,
    ],
  },
  {
    eyebrow: "Termo 02",
    title: "Cadastro e fornecimento de dados pessoais",
    icon: UserCheck,
    lines: [
      "Para efetivar uma compra, o usuario deve realizar cadastro previo com dados pessoais verdadeiros e atualizados, como nome completo, CPF, e-mail, telefone e endereco.",
      "Esses dados sao necessarios para viabilizar a transacao comercial, emitir notas fiscais, processar pagamentos e garantir a logistica de entrega ou retirada.",
      `${SITE_NAME} adota medidas tecnicas de seguranca para proteger a privacidade dos usuarios e prevenir acessos nao autorizados ou vazamentos.`,
    ],
  },
  {
    eyebrow: "Termo 03",
    title: "Precos, estoque e disponibilidade",
    icon: ClipboardList,
    lines: [
      "Os precos e as promocoes exibidos sao exclusivos para compras pelo site e podem ser alterados sem aviso previo.",
      "A disponibilidade e confirmada no fechamento do pedido; em caso de ruptura de estoque, o pedido pode ser cancelado com estorno integral.",
      "As imagens e descricoes dos produtos sao ilustrativas; especificacoes e conteudo da embalagem podem variar conforme o fabricante.",
    ],
  },
  {
    eyebrow: "Termo 04",
    title: "Entrega, retirada e cancelamento",
    icon: Truck,
    lines: [
      "O pedido pode ser entregue no endereco informado no checkout ou retirado na loja fisica, conforme a opcao escolhida.",
      "O prazo de entrega e estimado e comeca a contar a partir da confirmacao do pagamento.",
      "Pedidos podem ser cancelados antes do despacho; apos o envio, valem as regras de devolucao e troca previstas na legislacao.",
    ],
    details: [
      {
        label: "Retirada na loja",
        description:
          "A retirada exige documento do titular e o comprovante do pedido no endereco da loja.",
      },
      {
        label: "Rastreamento",
        description:
          "O codigo de rastreio fica disponivel na area de pedidos assim que a transportadora registra o envio.",
      },
    ],
  },
];

const generalTerms = [
  "Este termo e regido pelas leis da Republica Federativa do Brasil.",
  "Fica eleito o foro da comarca de Campinas/SP para dirimir duvidas ou litigios decorrentes do uso desta plataforma.",
];

const privacySections = [
  {
    title: "Quais dados coletamos e por que?",
    icon: Database,
    intro:
      "Para realizar compras na plataforma, coletamos apenas os dados necessarios para identificar o comprador, processar pedidos e cumprir obrigacoes legais.",
    details: [
      {
        label: "Dados cadastrais",
        description:
          "Nome completo, CPF, e-mail, telefone celular e endereco de entrega para emissao fiscal e despacho correto do pedido.",
      },
      {
        label: "Dados de pedido",
        description:
          "Itens comprados, valores, status de pagamento, entrega e historico de atendimento para suporte e emissao fiscal.",
      },
    ],
  },
  {
    title: "Compartilhamento de dados com terceiros",
    icon: Truck,
    intro: `${SITE_NAME} nao vende, nao aluga e nao compartilha dados pessoais para fins publicitarios de terceiros.`,
    details: [
      {
        label: "Operacoes de pagamento",
        description:
          "Envio de dados financeiros criptografados para operadoras de cartao ou gateways de pagamento.",
      },
      {
        label: "Logistica",
        description:
          "Compartilhamento do endereco com empresas de entrega responsaveis pelo envio do pedido.",
      },
      {
        label: "Obrigacoes legais",
        description:
          "Envio de dados fiscais e de pedido aos sistemas exigidos pela legislacao brasileira.",
      },
    ],
  },
  {
    title: "Armazenamento seguro dos dados",
    icon: LockKeyhole,
    intro:
      "Dados pessoais e de pedido recebem protecao especifica conforme a LGPD.",
    details: [
      {
        label: "Acesso restrito",
        description:
          "Os dados sao armazenados em servidores protegidos e com acesso limitado a equipe autorizada.",
      },
      {
        label: "Tempo de retencao",
        description:
          "Dados cadastrais, historico de compras e registros fiscais seguem os prazos legais e regulatorios aplicaveis.",
      },
    ],
  },
  {
    title: "Direitos do usuario",
    icon: Scale,
    intro:
      "O cliente pode exercer direitos previstos na LGPD pelos canais de atendimento da loja.",
    details: [
      {
        label: "Confirmacao",
        description: "Confirmar se realizamos tratamento de seus dados.",
      },
      {
        label: "Correcao",
        description:
          "Solicitar correcao de dados incompletos, inexatos ou desatualizados.",
      },
      {
        label: "Exclusao",
        description:
          "Solicitar exclusao de dados desnecessarios, quando a manutencao nao for obrigatoria por lei fiscal ou regulatoria.",
      },
    ],
  },
];

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-10 sm:px-8 lg:py-14">
      <section className="grid gap-8 border-b border-border pb-10 lg:grid-cols-[1fr_0.9fr] lg:items-center">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold uppercase text-primary">
            <Scale className="h-4 w-4" aria-hidden="true" />
            Termos de uso
          </span>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
            Termos de uso e politica de privacidade
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-muted">
            Seja bem-vindo ao site da {SITE_NAME}. Ao navegar e usar a
            plataforma digital, voce concorda com os termos, condicoes e
            politicas descritos nesta pagina.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="#termos"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-background transition hover:bg-primary/90"
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              Ler termos
            </a>
            <a
              href="#privacidade"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-3 text-sm font-semibold transition hover:border-primary/10 hover:text-primary"
            >
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Ver privacidade
            </a>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="rounded-lg bg-background p-2 text-primary">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                Antes de continuar
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                Caso nao concorde com alguma disposicao, orientamos que nao
                prossiga com a utilizacao do site ou finalizacao de compras.
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-3">
            {notices.map((notice) => (
              <div
                key={notice}
                className="flex gap-3 rounded-lg bg-background p-4 text-sm leading-6 text-muted"
              >
                <AlertTriangle
                  className="mt-0.5 h-4 w-4 shrink-0 text-warning"
                  aria-hidden="true"
                />
                <p>{notice}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-3">
        {summaryCards.map((item) => {
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

      <section id="termos" className="mt-10 grid gap-6">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            Condicoes comerciais
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            Regras de uso da plataforma
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            As regras abaixo organizam cadastro, compra, pagamento, entrega e
            retirada de produtos.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {termsSections.map((section) => {
            const Icon = section.icon;

            return (
              <article
                key={section.title}
                className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm"
              >
                <div className="flex items-start gap-4 border-b border-border bg-background/70 p-5">
                  <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                      {section.eyebrow}
                    </p>
                    <h3 className="mt-1 text-xl font-semibold tracking-tight">
                      {section.title}
                    </h3>
                  </div>
                </div>

                <div className="grid gap-4 p-5">
                  <div className="grid gap-3">
                    {section.lines.map((line) => (
                      <div key={line} className="flex gap-3">
                        <CheckCircle2
                          className="mt-1 h-4 w-4 shrink-0 text-primary"
                          aria-hidden="true"
                        />
                        <p className="text-sm leading-6 text-muted">{line}</p>
                      </div>
                    ))}
                  </div>

                  {"details" in section && section.details && (
                    <div className="grid gap-3 md:grid-cols-2">
                      {section.details.map((detail) => (
                        <div
                          key={detail.label}
                          className="rounded-lg border border-border bg-background p-4"
                        >
                          <h4 className="text-sm font-semibold tracking-tight">
                            {detail.label}
                          </h4>
                          <p className="mt-2 text-sm leading-6 text-muted">
                            {detail.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-10 rounded-lg border border-border bg-surface p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="rounded-lg bg-background p-2 text-primary">
            <Scale className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              Disposicoes gerais
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Legislacao e foro
            </h2>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {generalTerms.map((item) => (
            <div key={item} className="rounded-lg bg-background p-4">
              <p className="text-sm leading-6 text-muted">{item}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="privacidade" className="mt-10 grid gap-6">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            LGPD
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            Politica de privacidade e protecao de dados
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            A {SITE_NAME} protege a privacidade e a seguranca dos dados pessoais
            de seus clientes em conformidade com a Lei Geral de Protecao de
            Dados, Lei no 13.709/2018.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {privacySections.map((section) => {
            const Icon = section.icon;

            return (
              <article
                key={section.title}
                className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm"
              >
                <div className="flex items-start gap-4 border-b border-border bg-background/70 p-5">
                  <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                      Privacidade
                    </p>
                    <h3 className="mt-1 text-xl font-semibold tracking-tight">
                      {section.title}
                    </h3>
                  </div>
                </div>
                <div className="grid gap-4 p-5">
                  <p className="text-sm leading-6 text-muted">
                    {section.intro}
                  </p>
                  <div className="grid gap-3">
                    {section.details.map((detail) => (
                      <div
                        key={detail.label}
                        className="rounded-lg border border-border bg-background p-4"
                      >
                        <h4 className="text-sm font-semibold tracking-tight">
                          {detail.label}
                        </h4>
                        <p className="mt-2 text-sm leading-6 text-muted">
                          {detail.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="rounded-lg bg-background p-2 text-primary">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h3 className="text-lg font-semibold tracking-tight">
                Alteracoes nesta politica
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted">
                A {SITE_NAME} pode atualizar esta politica sempre que necessario
                para refletir mudancas na legislacao ou melhorias de seguranca
                digital.
              </p>
              <Link
                href="/privacy"
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold transition hover:border-primary/10 hover:text-primary"
              >
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                Central LGPD
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
