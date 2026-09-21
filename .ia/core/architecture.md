# Arquitetura

Preserve a arquitetura detectada no código. Não reorganize pastas só para aproximar o projeto deste documento.

Padrão preferido quando já existir:

- `app/`: rotas e composição
- `components/`: UI reutilizável
- `services/`: regra/orquestração
- `repositories/`: persistência
- `schemas/`: validação
- `hooks/`: estado/comportamento client
- `types/`: contratos
- `config/` / `data/`: configuração e conteúdo

Regra: UI não acessa Prisma diretamente. Integrações externas devem ficar atrás de service/adapter compatível com o padrão real do projeto.
