# Performance

Aplicar apenas quando útil:

- Server Components e fetch server-side;
- cache/revalidate conforme dado;
- `next/image` com dimensões/sizes corretos;
- lazy/dynamic apenas para módulos pesados/interativos;
- paginação em catálogo grande;
- evitar requests duplicadas e N+1;
- enviar ao client apenas dados necessários.

Não adicionar memoização, Suspense ou abstrações sem benefício mensurável/estrutural.
