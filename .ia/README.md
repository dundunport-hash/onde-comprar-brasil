# .IA — E-commerce de Eletrônicos

Pasta otimizada para Cline/modelos free. O objetivo não é fazer o agente ler tudo: é rotear contexto.

## Entrada obrigatória para o agente

Leia primeiro e sempre somente: `.ia/core/context.md`.
Depois abra no máximo 1 arquivo específico indicado pela tarefa. NÃO faça leitura recursiva de `.ia`.

## Roteamento

- UI/design -> `core/ui.md`
- produto/API fake -> `domains/products.md`
- carrinho -> `domains/cart.md`
- checkout -> `domains/checkout.md`
- auth -> `domains/auth.md`
- admin -> `domains/admin.md`
- banco/Prisma -> `standards/prisma-patterns.md`
- bug -> `prompts/bugfix-prompt.md`
- refactor -> `prompts/refactor-prompt.md`
- migração farmácia -> eletrônicos -> `prompts/migrate-electronics.md` + etapa do `roadmap.md`

`references/` e `ANALISE.md` são documentação humana/consulta eventual; o Cline não deve lê-los por padrão.
