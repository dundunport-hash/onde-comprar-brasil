# Política de testes — prioridade máxima

TESTES E COMANDOS DE VALIDAÇÃO SÃO PROIBIDOS AUTOMATICAMENTE.

Não executar por iniciativa própria:

- testes unitários/integração/E2E;
- lint;
- build;
- typecheck;
- coverage;
- Prisma generate/migrate;
- scripts de validação similares.

Mesmo se a alteração for sensível, explique o risco e entregue o menor comando apropriado para o usuário executar manualmente.

Somente execute qualquer validação quando o usuário pedir explicitamente naquela tarefa.
