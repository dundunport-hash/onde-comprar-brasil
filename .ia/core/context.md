# Contexto obrigatório do Cline

- Código/config real > `.ia`; preserve arquitetura, stack, nomes e contratos existentes.
- Leia inicialmente só 3–6 arquivos do projeto ligados ao pedido; expanda apenas se bloqueado.
- Para contexto extra, carregue no máximo 1 arquivo `domains/` ou `core/` indicado pela tarefa.
- Faça diff mínimo; reuse componentes/tipos/utils antes de criar novos. Sem dependência nova salvo necessidade real.
- Migração: farmácia -> eletrônicos; remova legado farmacêutico apenas no escopo tocado.
- PROIBIDO executar testes, lint, build, typecheck, coverage ou Prisma generate/migrate automaticamente.
- Final: resumo curto + arquivos alterados + comandos manuais opcionais. Não executar esses comandos.
