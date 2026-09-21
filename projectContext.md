# Project Context - Drogaria Mega Popular

## Visão geral do projeto

- Nome: Drogaria Mega Popular
- Tipo: Aplicação de e-commerce de farmácia
- Framework: Next.js 16 com React 19
- Objetivo: catálogo, carrinho, checkout, dashboard administrativo e integrações externas
- Infraestrutura: suporte a Docker, deploy staging, health checks em `/api/health`
- Base de dados: Prisma 6 + PostgreSQL
- Testes: Vitest, Playwright, Testing Library
- Acessibilidade: relatórios Axe/Lighthouse presentes no repositório

## Estrutura principal do repositório

- `.dockerignore`, `Dockerfile`, `docker-compose.yml`, `docker-compose.staging.yml`
- `.env`, `.env.example`, `.env.staging`, `.env.staging.example`
- `package.json`, `pnpm-lock.yaml`, `package-lock.json`
- `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `eslint.config.mjs`, `vitest.config.ts`, `playwright.config.ts`
- `README.md` com comandos de desenvolvimento, produção e staging
- `scripts/` com automações de deploy e monitoramento
- `prisma/` com `schema.prisma`
- `public/` com ativos estáticos
- `src/` com código da aplicação:
  - `app/` rotas e páginas
  - `components/` componentes reutilizáveis
  - `db/` dados de apoio
  - `hooks/` hooks personalizados
  - `lib/` utilitários, serviços e testes unitários
  - `test/` setup de testes
  - `types/` definições de tipos
- `tests/e2e/` testes end-to-end

## Pasta `.ia`

A pasta `.ia` funciona como base de conhecimento para padrões, papéis e orientação de projeto. Ela é ideal para reutilizar em futuros projetos como uma camada de governança e orientação de desenvolvimento.

### Estrutura de `.ia`

- `agents/` - papéis de agentes e especialidades
- `checklists/` - listas de verificação para PR e qualidade
- `core/` - normas e princípios centrais do projeto
- `domains/` - domínio funcional e regras por área do sistema
- `hooks/` - espaço reservado para hooks de automação/integração (atualmente vazio)
- `prompts/` - prompts básicos para geração de features, bugs, refatoração, revisão e testes
- `standards/` - padrões e diretrizes do projeto

### Papéis dentro de `.ia/agents`

- `architect.md`
  - papel: Software Architect
  - foco: arquitetura, escalabilidade, boundaries, clean architecture
- `backend.md`
  - papel: Especialista Prisma 6 e PostgreSQL
  - foco: segurança, validação, performance, transações
- `frontend.md`
  - papel: Especialista React 19 e Next.js 16
  - foco: Server Components, acessibilidade, responsividade, SEO
- `qa.md`
  - papel: Especialista em testes
  - foco: Vitest, Playwright, Testing Library, acessibilidade
- `reviewer.md`
  - papel: revisor de código (arquivo presente, mas vazio no momento)
- `security.md`
  - papel: Security Auditor
  - foco: CSRF, XSS, SQL Injection, rate limit, auth security
  - regras: nunca expor dados sensíveis, validar permissões, sanitizar inputs

### Domínios dentro de `.ia/domains`

- `auth.md`
  - domínio de autenticação
  - funcionalidades: login, registro, logout, recuperação de senha, sessão, roles
  - roles definidas: ADMIN, CUSTOMER
  - segurança: bcrypt, validação de sessão, rotas protegidas, middleware, cookies seguros

### Checklists e boas práticas

- `checklists/pr-checklist.md`
  - sem `any`
  - tipagem forte
  - validação Zod
  - tratamento de erros
  - testes criados
  - lint passando
  - build funcionando
  - acessibilidade validada
  - sem duplicação
  - performance validada

### Núcleo de padrões em `.ia/core`

- `accessibility.md`
- `architecture.md`
- `performance.md`
- `rules.md`
- `security.md`
- `stack.md`
- `testing.md`

Esses arquivos devem armazenar orientações centrais do projeto, tornando `.ia` um guia reutilizável para novos projetos.

## Como usar este contexto como base para futuros projetos

1. Reutilizar a pasta `.ia` inteira em novos repositórios como diretório de governança.
2. Adaptar `agents/` aos papéis do time ou do projeto.
3. Expandir `domains/` com novos domínios funcionais do escopo do produto.
4. Atualizar `checklists/` com políticas de qualidade específicas do projeto.
5. Documentar padrões em `core/` e `standards/` para consistência entre projetos.
6. Usar `prompts/` como modelo para gerar tarefas de implementação, revisão e testes.

## Observações adicionais

- O projeto combina front-end moderno com Next.js e práticas de backend seguras.
- A presença de relatórios de acessibilidade sugere foco em conformidade e usabilidade.
- A pasta `.ia` já contém uma base inicial para governança, com agentes e domínios, e deve ser usada como referência em futuros projetos.
