# Etapa 13 - Validacao manual

Este roteiro continua sendo a lista de validacao final para o responsavel executar antes de publicacao. Apos a correcao solicitada em 17/09/2026, alguns comandos automaticos foram executados pelo agente e registrados em `.ia/revisao-etapa-12.md`; isso nao substitui a validacao manual abaixo.

## Preparacao

Use dependencias ja instaladas e variaveis locais configuradas para banco e provedores de TESTE. Nao compartilhe arquivos `.env`, tokens, dados de clientes ou relatorios com dados sensiveis. Pagamentos, uploads e alteracoes administrativas devem usar contas e dados de teste.

Atencao: nao execute `npm run db:push` para validar. O script atual contem `prisma db push --force-reset` e pode apagar dados. Este roteiro nao requer migracao, reset nem deploy.

## 1. Testes e compilacao

Execute um comando por vez, confira `$LASTEXITCODE` imediatamente apos cada execucao e pare se for diferente de zero.

```powershell
Set-Location 'c:\Users\ATLANTICA\Documents\Saas\eletronicos'
npx vitest run src/components/Modal.test.tsx src/components/CartModal.test.tsx src/components/CartModalContent.test.tsx src/app/checkout/pagamento/page.test.tsx src/app/product/[slug]/page.test.tsx src/lib/catalog-cache.test.ts
npm run test:run
npm run lint
npm run build
npx tsc --noEmit
```

O build aciona `prebuild` (`prisma generate`) e pode precisar de variaveis e servicos configurados. Ele nao executa migracoes. Testes unitarios nao comprovam transacoes reais.

## 2. Servidor e smoke HTTP

Apos build aprovado, no primeiro terminal:

```powershell
Set-Location 'c:\Users\ATLANTICA\Documents\Saas\eletronicos'
npm run start -- --hostname 127.0.0.1 --port 3000
```

No segundo terminal:

```powershell
Set-Location 'c:\Users\ATLANTICA\Documents\Saas\eletronicos'
(Invoke-WebRequest -Uri 'http://127.0.0.1:3000/' -UseBasicParsing).StatusCode
```

Esperado: HTTP 200. Inspecione tambem console/logs; HTTP 200 sozinho nao comprova renderizacao correta. Encerre o servidor com Ctrl+C quando terminar. Para desenvolvimento, como alternativa ao start: `npm run dev -- --hostname 127.0.0.1 --port 3000`.

## 3. Playwright

Com o servidor ja respondendo na porta 3000, em terminal local sem variavel `CI` definida:

```powershell
Set-Location 'c:\Users\ATLANTICA\Documents\Saas\eletronicos'
npx playwright install chromium
npm run test:e2e -- tests/e2e/homepage.spec.ts --project=chromium --trace=on
npx playwright show-report
```

A instalacao do navegador so e necessaria se ele nao estiver disponivel. O teste existente da home nao cobre checkout, pagamento real nem aprovacao visual completa.

## 4. Roteiro no navegador

- Mobile/desktop: larguras 320, 375, 768 e 1280 px; zoom 200%; nomes/precos longos; ausencia de rolagem horizontal; sticky header, WhatsApp e cookies sem cobrir CTAs.
- Home/catalogo: categorias, ofertas reais, destaques, filtros, ordenacao pelo preco cadastrado, paginacao e busca vazia.
- Produto: galeria, miniaturas, video quando cadastrado, midia ausente/com erro, decimais das specs, preco/cupom e botao bloqueado quando indisponivel.
- Carrinho/modal: adicionar, aumentar/diminuir, remover/limpar, cupom, totais, frete, Tab/Shift+Tab/Escape, entrada/contencao/restauracao de foco.
- Checkout: visitante/autenticado, entrega/retirada, endereco e erros, Pix/cartao, sucesso/cancelamento e retorno.
- Pagamento/pedido: somente sandbox com provedores, banco e webhooks de teste. Confirme pedido, total e baixa de estoque pelo servidor; tela de sucesso sozinha nao comprova pagamento.
- Admin: com usuario de teste autorizado, cadastrar/editar produto, EAN, especificacoes, imagens/video, banners e dimensoes de envio.
- SEO: titulo/descricao por pagina, canonical, Open Graph, `robots.txt`, `sitemap.xml`, idioma e hierarquia de headings.
- Imagens/rede: DevTools Network, midia quebrada, bytes, `sizes`, carregamento por viewport, LCP e CLS.
- Legado: conferir textos/categorias/banners/midias do banco; bloqueios farmaceuticos condicionais nao devem ser removidos isoladamente.

## 5. Registrar resultados

Para cada verificacao registre comando, exit code, ambiente, rota, viewport, resultado esperado/observado e evidencia sem segredos. Em falha, registre erro e reproducao antes de alterar codigo.
