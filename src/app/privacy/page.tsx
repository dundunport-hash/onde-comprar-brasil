import type { Metadata } from "next";
import {
  CheckCircle2,
  ClipboardCheck,
  Cookie,
  Database,
  FileText,
  LockKeyhole,
  Mail,
  RefreshCcw,
  Scale,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { LazyLgpdRequestForm } from "@/components/LazyClientComponents";
import { SITE_NAME } from "@/lib/store-contact";

export const metadata: Metadata = {
  title: `LGPD e Privacidade | ${SITE_NAME}`,
  description:
    "Central visual de privacidade, cookies e direitos do titular de dados.",
};

const dataLifecycle = [
  {
    title: "Cadastro e conta",
    description:
      "Nome, e-mail, senha protegida por hash e foto opcional sao usados para criar acesso e identificar o usuario.",
    basis: "Execucao de contrato e seguranca da conta",
    icon: UserCheck,
  },
  {
    title: "Carrinho e checkout",
    description:
      "Produtos escolhidos, endereco, frete e status de pagamento viabilizam compra, entrega e suporte.",
    basis: "Execucao de contrato e cumprimento de obrigacoes legais",
    icon: ClipboardCheck,
  },
  {
    title: "Estoque e pedidos",
    description:
      "Administradores registram movimentacoes, pedidos e pagamentos para operacao e rastreabilidade.",
    basis: "Legitimo interesse, prevencao a fraude e obrigacao legal",
    icon: Database,
  },
  {
    title: "Recuperacao de senha",
    description:
      "Tokens temporarios permitem redefinir a senha sem expor credenciais ou confirmar publicamente a existencia da conta.",
    basis: "Seguranca e autenticacao",
    icon: LockKeyhole,
  },
];

const rights = [
  "Confirmar se tratamos seus dados pessoais.",
  "Acessar os dados mantidos pela loja.",
  "Corrigir dados incompletos, inexatos ou desatualizados.",
  "Solicitar anonimizacao, bloqueio ou eliminacao quando aplicavel.",
  "Pedir portabilidade, observada regulamentacao aplicavel.",
  "Revogar consentimento e revisar escolhas de cookies.",
  "Obter informacoes sobre compartilhamento e uso.",
  "Solicitar revisao de decisoes automatizadas, quando existirem.",
];

const safeguards = [
  "Senhas armazenadas somente em formato hash.",
  "Cookies de sessao HTTPOnly e SameSite para autenticacao.",
  "Rate limit em login, cadastro, upload e recuperacao de senha.",
  "Sanitizacao de entradas vindas de formularios, JSON e URL.",
  "Auditoria de eventos sensiveis sem expor segredos em metadados.",
  "CSP e cabecalhos de seguranca configurados no Next.",
];

const cookieCategories = [
  {
    title: "Essenciais",
    status: "Sempre ativos",
    description:
      "Mantem login, carrinho, sessao e protecoes basicas. Nao podem ser desativados sem quebrar a loja.",
  },
  {
    title: "Analiticos",
    status: "Opcional",
    description:
      "Ajudam a medir paginas visitadas, gargalos e estabilidade. Desativados por padrao ate sua escolha.",
  },
  {
    title: "Personalizacao",
    status: "Opcional",
    description:
      "Guardam preferencias de experiencia, quando houver. Podem ser alterados no botao Privacidade.",
  },
  {
    title: "Marketing",
    status: "Opcional",
    description:
      "Apoiam campanhas promocionais. So devem ser usados apos consentimento especifico.",
  },
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-10 sm:px-8">
      <section className="grid gap-8 border-b border-border pb-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            LGPD e privacidade
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Transparencia sobre seus dados pessoais
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-muted">
            Esta central mostra quais dados sao usados, por que eles sao
            necessarios, como exercer direitos previstos na LGPD e como alterar
            preferencias de cookies opcionais.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="#direitos"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-background transition hover:bg-primary/90"
            >
              <Scale className="h-4 w-4" aria-hidden="true" />
              Ver direitos
            </a>
            <a
              href="#solicitacao"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-3 text-sm font-semibold transition hover:border-primary/10 hover:text-primary"
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              Fazer solicitacao
            </a>
          </div>
        </div>

        <div className="grid gap-3 rounded-lg border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-green-100 p-2 text-green-800">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-semibold">Compromissos visiveis</h2>
              <p className="text-sm text-muted">
                Consentimento revogavel, acesso facilitado, seguranca e
                registros de auditoria.
              </p>
            </div>
          </div>
          <div className="grid gap-2 text-sm">
            <p className="rounded-lg bg-background p-3">
              Controlador: {SITE_NAME}.
            </p>
            <p className="rounded-lg bg-background p-3">
              Canal de privacidade: formulario LGPD nesta pagina.
            </p>
            <p className="rounded-lg bg-background p-3">
              Prazo operacional sugerido: triagem e retorno em ate 15 dias.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 className="text-2xl font-semibold tracking-tight">
            Ciclo de dados
          </h2>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {dataLifecycle.map((item) => {
            const Icon = item.icon;

            return (
              <article
                key={item.title}
                className="rounded-lg border border-border bg-surface p-5 shadow-sm"
              >
                <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                <h3 className="mt-3 font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {item.description}
                </p>
                <p className="mt-4 rounded-lg bg-background p-3 text-xs font-medium text-foreground">
                  {item.basis}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section
        id="direitos"
        className="mt-10 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]"
      >
        <div>
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="text-2xl font-semibold tracking-tight">
              Direitos do titular
            </h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted">
            A LGPD assegura mecanismos para que a pessoa titular tenha controle
            e transparencia sobre o tratamento de seus dados pessoais.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {rights.map((right) => (
            <div
              key={right}
              className="flex gap-3 rounded-lg border border-border bg-surface p-4"
            >
              <CheckCircle2
                className="mt-0.5 h-4 w-4 shrink-0 text-green-700"
                aria-hidden="true"
              />
              <p className="text-sm text-muted">{right}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <div className="flex items-center gap-2">
          <Cookie className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 className="text-2xl font-semibold tracking-tight">
            Cookies e preferencias
          </h2>
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
          Cookies opcionais ficam desativados por padrao e podem ser aceitos,
          recusados ou personalizados pelo botao fixo Privacidade.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {cookieCategories.map((category) => (
            <article
              key={category.title}
              className="rounded-lg border border-border bg-surface p-5 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold">{category.title}</h3>
                <span className="rounded-full bg-background px-2.5 py-1 text-xs font-semibold text-primary">
                  {category.status}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted">
                {category.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <LockKeyhole className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="text-2xl font-semibold tracking-tight">
              Medidas de seguranca
            </h2>
          </div>
          <div className="mt-5 grid gap-3">
            {safeguards.map((item) => (
              <div key={item} className="flex gap-3 text-sm text-muted">
                <ShieldCheck
                  className="mt-0.5 h-4 w-4 shrink-0 text-green-700"
                  aria-hidden="true"
                />
                <p>{item}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <RefreshCcw className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="text-2xl font-semibold tracking-tight">
              Retencao e compartilhamento
            </h2>
          </div>
          <div className="mt-5 grid gap-3 text-sm leading-6 text-muted">
            <p>
              Dados de pedidos, pagamentos e enderecos podem ser mantidos pelo
              periodo necessario para cumprimento de obrigacoes legais,
              prevencao a fraude, suporte e exercicio regular de direitos.
            </p>
            <p>
              Compartilhamentos operacionais podem ocorrer com provedores de
              pagamento, envio de e-mail, hospedagem, banco de dados,
              armazenamento de imagem e servicos necessarios ao e-commerce.
            </p>
            <p>
              Quando um pedido de eliminacao nao puder ser atendido
              integralmente, a resposta deve indicar a base legal de retencao
              aplicavel.
            </p>
          </div>
        </div>
      </section>

      <section
        id="solicitacao"
        className="mt-10 rounded-lg border border-border bg-surface p-5 shadow-sm"
      >
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 className="text-2xl font-semibold tracking-tight">
                Solicitacao LGPD
              </h2>
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
              Use este formulario para exercer direitos do titular. A
              solicitacao gera um protocolo e fica registrada na auditoria
              administrativa.
            </p>
          </div>
        </div>
        <LazyLgpdRequestForm />
      </section>
    </main>
  );
}
