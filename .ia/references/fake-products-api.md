# APIs fake — validado em 2026-09-17

## 1) DummyJSON — PADRÃO RECOMENDADO

Docs: https://dummyjson.com/docs/products
Base: https://dummyjson.com/products

Vantagens: REST, sem chave, busca, paginação, categorias e dados ricos.
Categorias úteis:

- https://dummyjson.com/products/category/smartphones
- https://dummyjson.com/products/category/laptops
- https://dummyjson.com/products/category/tablets
- https://dummyjson.com/products/category/mobile-accessories

Use `limit`, `skip` e `select` para reduzir payload. Escritas são simuladas, não persistidas.

## 2) Shopify mock.shop — referência realista

Docs: https://shopify.dev/docs/storefronts/headless/mock-shop
Diretório: https://mock.shop/llms.txt

Público, gratuito, sem token, com Storefront API/GraphQL, catálogos fictícios e carrinho. Mais realista, porém gera mais código/contexto que DummyJSON. Use se o objetivo for aproximar de Shopify.

## 3) Platzi Fake Store API — alternativa REST

Docs: https://fakeapi.platzi.com/
Base: https://api.escuelajs.co/api/v1
Tem categoria Electronics, CRUD e paginação. Boa alternativa, mas dados públicos podem variar mais.

## 4) FakeStoreAPI — alternativa simples

Docs/repo: https://github.com/keikaavousi/fake-store-api
Base: https://fakestoreapi.com
Possui categoria electronics, mas catálogo e schema são menores que DummyJSON.

Regra do projeto: integrar por adapter/service e não acoplar componentes ao formato de uma API fake.
