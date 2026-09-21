# Etapa 01 — Inventário mínimo (registrado em 2026-09-17)

Escopo: identificar o que é realmente usado (páginas, componentes, serviços, schema, integrações) e registrar **somente divergências relevantes**. Base: leitura direta do código em `src/`, `prisma/`, `package.json`, `public/`, `scripts/`.

## 1. Stack confirmada no código

- Next.js 16.2.6 (App Router, Server Components + Server Actions), React 19.2.4, TypeScript 5, Tailwind CSS v4 (`@tailwindcss/postcss`), ESLint 9, Prettier.
- Prisma 6 + PostgreSQL; NextAuth v4 (credentials + Prisma adapter manual), Zod 4, bcryptjs.
- Ícones `lucide-react`; imagens `cloudinary` + `next-cloudinary`; e-mail `resend`; pagamentos `stripe` + Mercado Pago (API REST própria); frete Melhor Envio + Correios.
- Testes: Vitest (unit, arquivos `*.test.ts(x)` ao lado do código) + Playwright (`tests/e2e/homepage.spec.ts`).
- Nome do pacote ainda é `drogaria-mega-popular` (`package.json`).

## 2. Páginas (rotas) realmente usadas

Loja:

- `/` — home = catálogo completo (busca/filtros/ordenação/paginação) + `BannerCarousel`. `src/app/page.tsx`.
- `/product/[slug]` — PDP (galeria local `ProductImageGallery`, preço, cupom, add ao carrinho).
- `/about`, `/contato`, `/terms`, `/privacy` (conteúdo majoritariamente estático no próprio arquivo ou via `lib/site-content.ts`).
- `/login`, `/register`, `/forgot-password`, `/reset-password`, `/profile`.
- `/checkout/endereco`, `/checkout/pagamento`, `/checkout/pix/[paymentId]`, `/checkout/sucesso`, `/checkout/cancelado`.
- `not-found.tsx`, `loading.tsx`, `global-error.tsx`.

Admin (`(auth)/dashboard`): `page`, `produtos` (+`novo`, `[id]/editar`), `estoque`, `pedidos` (+ rota `[orderId]/receita`), `cupons`, `promocoes`, `banners`, `conteudo`, `usuarios`, `metricas`, `auditoria`, `observabilidade`.

API: `api/auth/[...nextauth]`, `api/auth/forgot-password|reset-password|verify-reset-token`, `api/register`, `api/upload`, `api/health`, `api/lgpd/request`, `api/observability`, `api/checkout/pix/[paymentId]`, `api/mercado-pago/webhook`, `api/stripe/webhook`, `api/melhor-envio/authorize|callback`.

Divergências de rota:

- **Não existe página `/carrinho`**: o carrinho é modal (`Navbar` → `CartModal` → `CartModalContent`). `src/app/carrinho/loading.tsx` é órfão (sem `page.tsx`).
- Não existe rota `/catalogo`: o catálogo vive na home (`/`), sem página dedicada.

## 3. Componentes

Em uso (`src/components/index.ts` é o barrel; `app/layout.tsx` monta os globais):

- Globais: `Navbar`, `Footer`, `ToastProvider`, `CookieConsentBanner` (via `LazyCookieConsentBanner`), `WhatsAppFloatingButton`.
- Loja: `BannerCarousel` (home importa direto), `CatalogSearchInput`, `CatalogFilterDropdown`, `CartActionForm`, `CartModal` + `CartModalContent` (via `Navbar`), `StatusPage`, `CloudinaryUpload`, `LgpdRequestForm` (privacy).
- Base: `Button`, `Input`, `Card`, `Badge`, `Modal`, `Skeleton`, `Loading`.

Órfãos / dead code (não referenciados em nenhum arquivo):

- `src/components/product-list.tsx` e `src/components/category-filter.tsx` (legado farmacêutico, contêm termos clínicos).
- `LazyBannerCarousel` (exportado e nunca usado; a home usa `BannerCarousel` direto).
- `src/lib/design/{index,theme,tokens,typography}.ts` — nenhum import em `src/` (relevante para a etapa 03).

## 4. Serviços / camada de dados (`src/lib`, `src/app/**/actions.ts`)

- Catálogo (única fonte de verdade): `lib/catalog-cache.ts` (`unstable_cache` + Prisma) → `getCachedCatalogCategories`, `getCachedCatalogProductCount`, `getCachedCatalogProducts`, `getCachedProductBySlug`, `getCachedProductMetadataBySlug`, `getCachedActiveProductOptions`.
- Banners: `lib/hero-banners.ts` (Prisma `SitePageContent` + fallback de imagens em `src/db/images.ts`).
- Filtros/paginação compartilhados: `lib/products-query.ts` (`PRODUCTS_PER_PAGE = 15`), `lib/cache-tags.ts`.
- Carrinho: `lib/cart.ts` (+ `app/carrinho/actions.ts`, `PrescriptionUploadCard`, `ShippingCalculatorCard`/`LazyShippingCalculatorCard`), `lib/stock-validation.ts`, `lib/coupons.ts`.
- Checkout/pedido: `lib/checkout-fulfillment.ts`, `app/checkout/**/actions.ts`, `lib/pricing.ts`, `lib/address.ts`, `lib/rate-limit.ts`, `lib/sanitize.ts`.
- Pagamentos: `lib/stripe.ts` (Checkout Session + webhook), `lib/mercado-pago.ts` + `lib/mercado-pago-checkout.ts` (PIX + webhook).
- Frete: `lib/shipping.ts` orquestra `lib/melhor-envio.ts` e `lib/correios.ts` (opções, pré-postagem, etiqueta/rastreio).
- Upload/imagem: `lib/cloudinary.ts`, `lib/cloudinary-utils.ts`, `hooks/useCloudinaryUpload.ts`, `api/upload`.
- Auth/segurança: `lib/auth.ts`, `lib/auth-session.ts`, `lib/admin.ts`, `lib/audit.ts`, `lib/user-image.ts`, `src/proxy.ts`.
- Observabilidade: `lib/observability.ts`, `lib/prisma-analytics.ts`.
- Conteúdo/contato: `lib/site-content.ts`, `lib/store-contact.ts`, `lib/currencyFormatter.ts`, `lib/utils.ts`.

## 5. Schema (`prisma/schema.prisma`) — o que existe hoje

Models: `User`, `Category`, `Product`, `ProductPrice`, `Promotion`, `Coupon`, `CouponProduct`, `Cart`, `CartItem`, `CheckoutAddress`, `StripeWebhookEvent`, `MercadoPagoWebhookEvent`, `Stock`, `StockMovement`, `SitePageContent`, `AuditLog`. Enums: `CartStatus`, `PaymentStatus`, `StockMovementType`.

- `Product` não tem campo farmacêutico estruturado — só `description` + `technicalData` (texto livre) + `ean` (BigInt) + 3 imagens (`imageUrl`, `imageUrl2`, `imageUrl3`) + dimensões/peso. Não há marca, variante, garantia, specs estruturadas, avaliações ou "vendidos".
- Sem tabela de pedido própria: o pedido é o `Cart` com `PaymentStatus`/`CartStatus`.

## 6. Integrações realmente usadas

| Integração                                           | Onde                                                                                        | Estado                                                                                         |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ----- |
| PostgreSQL + Prisma                                  | `lib/prisma.ts`, todo o domínio                                                             | ativo                                                                                          |
| NextAuth (credentials) + Resend (só e-mail de reset) | `api/auth/**`, `lib/auth.ts`                                                                | ativo                                                                                          |
| Stripe (Checkout Session + webhook)                  | `checkout/pagamento/actions.ts`, `api/stripe/webhook`                                       | ativo                                                                                          |
| Mercado Pago (PIX + webhook)                         | `lib/mercado-pago*.ts`, `api/checkout/pix/[paymentId]`, `api/mercado-pago/webhook`          | ativo                                                                                          |
| Melhor Envio                                         | `lib/melhor-envio.ts`, `lib/shipping.ts`, `api/melhor-envio/authorize                       | callback`                                                                                      | ativo |
| Correios                                             | `lib/correios.ts` (opções + pré-postagem/etiqueta), admin `pedidos`                         | ativo                                                                                          |
| Cloudinary                                           | `api/upload`, `components/CloudinaryUpload`, `hooks/useCloudinaryUpload`, `lib/cloudinary*` | ativo                                                                                          |
| DummyJSON / API fake externa                         | **nenhum uso em `src/`**                                                                    | não integrado (só citado em `.ia/references/fake-products-api.md` e `.ia/domains/products.md`) |

Observação: o catálogo é 100% Prisma/banco. Nenhum adapter de API fake existe hoje (é exatamente o escopo da etapa 04).

## 7. Divergências relevantes (legado farmacêutico dentro do código)

Contagem por arquivo (`receit|prescri|medicament|farmac|anvisa|tarja|controlad`, em `src/`):
`terms` (25), `dashboard/pedidos/[orderId]/receita/route.ts` (18), `carrinho/PrescriptionUploadCard.tsx` (16), `carrinho/actions.test.ts` (15), `api/upload/route.ts` (12), `dashboard/pedidos/page.tsx` (12), `carrinho/actions.ts` (7), `lib/cart.ts` (6), `components/CartModalContent.tsx` (7), `checkout/pagamento/page.tsx` (6), `dashboard/metricas/page.tsx` (5), `components/product-list.tsx` (3), `components/Footer.tsx` (3), `app/page.tsx` (3), `product/[slug]/page.tsx` (3), `about` (2), `checkout/pagamento/actions.ts` (1), `dashboard/page.tsx` (1), `privacy` (1) — além de `lib/cart.test.ts` e de arquivos de teste correlatos.

1. **Regra de "medicamentos controlados" acoplada ao catálogo e ao fluxo de compra**
   - `lib/cart.ts`: `isControlledMedicationCategory()` compara `slug === "medicamentos-controlados"` / `name === "medicamentos controlados"`; `cartHasControlledMedication()`.
   - Replicada em `app/page.tsx` e `app/product/[slug]/page.tsx` (função local duplicada) e usada em `app/checkout/pagamento/actions.ts`.
   - `app/carrinho/actions.ts`: `enforceControlledMedicationPickup()` força frete pickup, `saveControlledMedicationPrescription()` grava `prescriptionImageUrl`, e o checkout é bloqueado com erro `"Medicamentos controlados exigem receita e retirada obrigatoria na loja."`.
   - `components/CartModalContent.tsx`: `missingPrescription` bloqueia `canCheckout` e troca o cálculo de frete por upload de receita.
2. **Schema com campos farmacêuticos**: `Cart.prescriptionImageUrl` / `Cart.prescriptionUploadedAt`; `Stock.batch` + `Stock.expirationDate` + `StockMovement.expirationDate` (validade/lote); `CartStatus.AWAITING_PICKUP`.
3. **Upload**: `api/upload/route.ts` mantém a pasta `"receitas"` com PDF liberado e limites próprios; `ALLOWED_FOLDERS` inclui `"drogaria-mega-popular"`/`"usuarios"`/`"banners"`.
4. **Admin**: rota `dashboard/pedidos/[orderId]/receita/route.ts` (download de receita) + colunas/estado de receita em `dashboard/pedidos/page.tsx`.
5. **Identidade visível (texto/SEO/logo)**: `app/layout.tsx` (title/description/alt/logo `/1.png`), `Footer.tsx` (ícone `HeartPulse` + aviso de automedicação/remédios), `about`, `terms` (Portaria 344/98, retirada em loja, conselho/ANVISA), `privacy`, `contato`, `not-found.tsx` ("Falar com a drogaria"), `global-error.tsx`, `BannerCarousel` (alt "da Drogaria Mega Popular"), metadados de todas as páginas do dashboard, e-mail de reset (`noreply@drogariamegapopular.com`).
6. **Identificadores internos**: cookie `dmp_cart` (`lib/cart.ts`), chave `drogaria-lgpd-consent-v1` (`CookieConsentBanner`), pastas Cloudinary `drogaria-mega-popular` (default em `lib/cloudinary-utils.ts`, `hooks/useCloudinaryUpload.ts`, `CloudinaryUpload.tsx`, `ProductForm.tsx`, `sanitize.ts`), `DEFAULT_ORIGIN_NAME` em `lib/correios.ts` e `lib/melhor-envio.ts`, plataforma `"Drogaria Mega Popular"` no payload do Melhor Envio, `lib/store-contact.ts`, `lib/site-content.ts`.
7. **Assets e seeds**: `public/` contém dezenas de imagens farmacêuticas (`amoxicilina-*.jpg`, `Amoxilina.jpg`, `modelo conta gotas/pomada/nazal/sache/tara preta`, banners duplicados); `scripts/produtos_farmacia.json` (~ dezenas de produtos de farmácia) e `produtos-salvos.json` na raiz; `package.json` name `drogaria-mega-popular`.
8. **Home sem estrutura de e-commerce de eletrônicos**: a home é o catálogo completo (filtros + grid + paginação); não existem seções de categorias, ofertas, destaques ou benefícios (escopo das etapas 05/06).
9. **Sem domínio de produto rico**: para eletrônicos faltam marca, variantes/SKU, garantia, especificações estruturadas e galeria múltipla tratada (só 3 colunas de imagem); `technicalData` é texto livre e a PDP quebra por frases (`product/[slug]/page.tsx`).
10. **Assets/`public` sem otimização**: imagens de banner duplicadas com o mesmo nome e `logo.png` não usado; `favicon.ico` presente.
11. Minor (não bloqueia): `lib/cart-security.test.ts` e `lib/security-config.test.ts` testam `lib/cart.ts`, `next.config.ts` e `lib/auth.ts` (nome do arquivo não corresponde a um módulo existente).

## 8. Conclusão da etapa

- Nada foi alterado em `src/`, `prisma/` ou `public/`: esta etapa foi somente inventário.
- Ordem segura para as próximas etapas: **02** neutralizar identidade (itens 5 e 7) → **03** tokens (reaproveitar/decidir sobre `lib/design/*`) → **04** adapter de produto + DummyJSON (sem tocar `catalog-cache.ts` de imediato) → **05/06/07/08** UI → **09/10** carrinho/checkout (remover dependência do gate de controlados) → **11** admin (receita/upload) → **12** revisão.
- Pontos que exigem decisão humana antes de 09/10/11: manter ou remover `Cart.prescriptionImageUrl`, `Stock.batch/expirationDate`, `CartStatus.AWAITING_PICKUP` e a pasta `"receitas"` (envolvem migração de dados e fluxo de retirada em loja).

## 9. Etapa 02 — identidade farmacêutica neutralizada (registro)

- Nome de exibição único: `SITE_NAME = "Loja de Eletrônicos"` em `src/lib/store-contact.ts` (placeholder declarado no próprio arquivo; troca em 1 linha quando a etapa 03 fechar a marca). `STORE_CONTACT.name` passou a usar `SITE_NAME`.
- Textos/SEO/avisos visíveis neutralizados: `app/layout.tsx`, `components/Footer.tsx` (removidas licenças farmacêuticas CRF/Autorização-MS/CEVS e a Portaria 344; ícone `HeartPulse` -> `Cpu`; aviso de automedicação -> aviso comercial padrão), `about`, `terms` (Termo 03 e 04 reescritos para preço/estoque/entrega/retirada; seções de dados de saúde removidas), `privacy`, `contato`, `not-found`, `global-error`, `profile`, checkout (`endereco`, `pagamento`, `sucesso`, `pix/[paymentId]`, `cancelado`), metadados de todo o dashboard, `BannerCarousel`/`StatusPage` (alt), `lib/site-content.ts`, `lib/correios.ts` e `lib/melhor-envio.ts` (nome de origem/plataforma), e-mail de reset e descrição do PIX.
- Vitrine: o aviso "vendido com receita / retirada na loja" saiu da home e da PDP, junto com as duas cópias locais de `isControlledMedicationCategory`. A regra de backend (`lib/cart.ts`, `carrinho/actions.ts`, `checkout/pagamento`) ficou intacta para as etapas 09/10 — hoje ela nunca dispara porque não existe categoria de medicamentos.
- Testes ajustados apenas onde o texto mudou: `src/app/checkout/sucesso/page.test.tsx` (usa `SITE_NAME`) e `tests/e2e/homepage.spec.ts` (título).
- Mantido de propósito (infra/identificador interno, sem efeito visível): cookie `dmp_cart`, chave `drogaria-lgpd-consent-v1`, pastas Cloudinary `drogaria-mega-popular` e `receitas`, e-mails `@drogariamegapopular.com`, `ProductForm`/`CloudinaryUpload`/`useCloudinaryUpload`/`cloudinary-utils`/`sanitize` (folder), `api/upload`.
- Pendências para as próximas etapas: imagens/logo (`/1.png`, `logo.png`, banners e `public/`), textos de receita no carrinho/checkout/admin, seeds `scripts/produtos_farmacia.json` e `produtos-salvos.json`, `package.json` name e domínio de e-mail.

## 10. Etapa 03 — tokens/identidade visual de eletrônicos (registro)

Fonte de runtime: `src/app/globals.css` (`:root` + `@media (prefers-color-scheme: dark)`), exposta ao Tailwind v4 pelo `@theme inline`. **Nenhum token foi renomeado** (`background, foreground, surface, border, primary, primary-foreground, secondary, muted, success, warning, danger, accent`), então todas as classes existentes (`bg-primary`, `text-muted`, `border-border`, `bg-surface`, `text-primary-foreground`, `border-t-accent`, ...) continuam válidas — só mudaram os valores.

Paleta clara (neutros frios + azul comercial + ciano de apoio):

| Token              | Antes (farmácia) | Agora (eletrônicos) |
| ------------------ | ---------------- | ------------------- |
| background         | `#fffdf8`        | `#f4f7fb`           |
| foreground         | `#2c1815`        | `#0f172a`           |
| surface            | `#fff8ed`        | `#ffffff`           |
| border             | `#eadbd0`        | `#dbe3ee`           |
| primary            | `#b90000`        | `#1d4ed8`           |
| primary-foreground | `#fff7ef`        | `#f8fafc`           |
| secondary          | `#f4dc18`        | `#22d3ee`           |
| muted              | `#735f59`        | `#556077`           |
| success            | `#16a34a`        | `#16a34a`           |
| warning            | `#b7791f`        | `#b45309`           |
| danger             | `#a41313`        | `#dc2626`           |
| accent             | `#c49a00`        | `#7c3aed`           |

Paleta escura (mesmos tokens): `background #0b1120`, `foreground #e6edf8`, `surface #131c31`, `border #2a3852`, `muted #a7b4cb`, `primary #5b8cff`, `primary-foreground #0b1120`, `secondary #22d3ee`, `accent #a78bfa` (success/warning/danger seguem sem override, como antes).

- Contraste (aprox., tema claro): `primary`+`primary-foreground` ≈ 6.3:1; `muted` sobre `background` ≈ 5.8:1; `foreground` ≈ 16:1. `warning`/`danger` foram corrigidos para passar AA em texto pequeno (antes ≈4.0:1 e ≈3.4:1).
- Espelho tipado: `src/lib/design/tokens.ts` (`colorTokens` atualizado + novo `darkColorTokens`), com aviso de sincronia com o CSS. `lib/design` era órfão no inventário (§3) e **passou a ser consumido** por `api/melhor-envio/callback` e `api/auth/forgot-password`.
- Cores fixas removidas: paleta antiga hardcoded na página HTML do callback do Melhor Envio (`#fffdf8/#2c1815/#eadbd0/#fff8ed/#735f59/#b90000`) agora usa `colorTokens`; botão/título do e-mail de redefinição de senha (`#dc2626` + `white`) agora usam `primary`/`primary-foreground`. Mantido apenas o verde de marca do WhatsApp (`#25D366`).
- Nenhum componente precisou mudar: `Button`, `Card`, `Input`, `Modal`, `Navbar`, `Footer`, `StatusPage` já usavam classes de token.
- Papéis definidos para as etapas 05-08: `primary` = CTA/preço/destaque de marca; `secondary` (ciano) = apoio e hover sobre o header; `accent` (violeta) = estados terciários/empty state; `success` = disponibilidade/benefícios; `warning` = aviso de estoque; `danger` = indisponível/erro. Nenhum token novo foi criado para não introduzir contrato sem uso.
- Pendências (fora do escopo de tokens): logo `public/1.png` e `public/logo.png` continuam do legado (etapa 12), `favicon.ico`, banners/modelos farmacêuticos em `public/`; `components/Badge.tsx` e `lib/design/{theme,typography}.ts` seguem sem consumidor (usar em 05-08 ou remover em 12).
- Sugestão manual (não criada agora): teste de sincronia entre `globals.css` e `colorTokens`/`darkColorTokens`.
- Ressalva para 05-08/12: em tema escuro, `--secondary` continua um ciano claro, então pares `bg-secondary` + `text-foreground` (ex.: `Button` variant `secondary` e o hover do card de contato) ficam com contraste baixo — mesmo problema já existia com o amarelo anterior, e o ajuste correto é decidir o par de texto por componente na etapa de UI (ou usar `accent`/`primary-foreground`). Também seguem hardcoded fora de token (etapa 12): `bg-yellow-50`/`bg-green-100`/`bg-red-100` etc. em badges de status do carrinho/checkout/admin.

## 11. Etapa 04 — adapter de produto eletrônico + DummyJSON (registro)

Objetivo: deixar o catálogo externo atrás de um adapter, sem acoplar UI (ou o tipo interno do Prisma) ao DTO do DummyJSON. **`catalog-cache.ts`, `page.tsx`, PDP e `prisma/` não foram tocados** — a vitrine continua 100% Prisma até as etapas 05-08.

Três camadas, seguindo o padrão já existente de cliente externo + service (`correios.ts`/`shipping.ts`, `mercado-pago.ts`/`mercado-pago-checkout.ts`):

- `src/lib/dummyjson.ts` — contrato externo (DTO) tipado e validado com Zod no limite do sistema + `fetch` com `next: { revalidate: 300 }`. Expõe `fetchDummyJsonProducts` (lista, busca `?q=` e categoria), `fetchDummyJsonProduct` (404 → `null`) e `DummyJsonRequestError` (503 rede, status HTTP real, 502 JSON/schema inválido) sem vazar internals. `reviews` fica como `unknown[]`, só para contagem: e-mail/nome do avaliador (PII) não é propagado.
- `src/lib/product-adapter.ts` — tipo de domínio `ElectronicProduct` + `mapExternalProduct`/`mapExternalProducts`. Nenhum campo do DTO externo atravessa (`discountPercentage`, `availabilityStatus`, `warrantyInformation`, `thumbnail` etc.). Mapeia: preço/desconto (reusa `roundMoney` de `lib/pricing`); disponibilidade `in-stock|low-stock|out-of-stock` (com `stock` como fonte da verdade para esgotado); imagens apenas `http/https` e sem duplicatas (reusa `sanitizeHttpUrl`); specs (marca, SKU, código de barras, pedido mínimo, garantia, envio, devolução); rating/reviews; tags normalizadas; `source: "dummyjson"`. Todo texto vindo da API passa por `lib/sanitize`.
- `src/lib/electronic-products.ts` — service e único ponto de entrada da UI: `getElectronicProducts(query)` (sanitiza `query`/`category`, delega ao cliente e devolve `ElectronicProduct[]` + paginação) e `getElectronicProductById(id)`.
- Categorias prontas para 05-08: `ELECTRONIC_PRODUCT_CATEGORIES` (smartphones, laptops, tablets, mobile-accessories com label PT-BR) e `getElectronicProductCategoryName`.

Config/infra:

- `DUMMYJSON_API_URL` opcional em `env.ts` + `.env.example`/`.env.staging.example` (default `https://dummyjson.com`), no mesmo padrão de `CORREIOS_API_URL`/`MELHOR_ENVIO_API_URL`.
- `next.config.ts`: `cdn.dummyjson.com` liberado no `img-src` (CSP) e em `images.remotePatterns`, para as imagens do adapter poderem ser renderizadas com `next/image` nas etapas 05-08. O `fetch` é server-side, então `connect-src` não precisou mudar.

Testes unitários ao lado do código (não executados nesta etapa, conforme `.ia/core/testing.md`):

- `src/lib/product-adapter.test.ts` — mapeamento completo, não vazamento de DTO/PII, clamps de desconto/rating/estoque, sanitização de texto/imagem e fallbacks (slug, SKU, specs vazias).
- `src/lib/electronic-products.test.ts` — mock do cliente: sanitização de entrada, paginação e `null` para id inválido/inexistente.
- `src/lib/dummyjson.test.ts` — mock do `fetch`: URL/limites, busca/categoria, validação de payload, erros 4xx/5xx/rede/JSON inválido.

Pendências/ressalvas registradas:

- O adapter é isolado de propósito: nenhuma página consome o catálogo externo ainda (escopo de 05-08).
- `slug` é derivado do título (`slugifyProductTitle`); `id` segue como chave estável. A API externa não garante unicidade de título.
- Sem `AbortSignal` no `fetch` para não desativar a memoização documentada pelo Next; sem timeout explícito (endurecer se o caminho virar produção).
- Peso/dimensões do DummyJSON não foram mapeados (unidades não confirmadas); cálculo de frete continua usando o produto do banco.
