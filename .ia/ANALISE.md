# Análise da pasta recebida

Principais problemas encontrados:

1. Testes eram obrigatórios em `qa.md`, `rules.md`, `testing.md`, `create-feature.md`, `feature-prompt.md` e checklist, contrariando o fluxo desejado e consumindo chamadas/tokens.
2. `architecture.md` declarava MongoDB enquanto `stack.md` declarava PostgreSQL: risco de o agente alterar provider/arquitetura incorretamente.
3. Regras repetidas em vários arquivos: tipagem, validação, testes, performance e arquitetura eram recarregadas sem necessidade.
4. `feature-prompt.md` mandava ler "arquivos necessários da pasta .ai" sem limite, incentivando varredura ampla.
5. Domínio de produtos ainda continha `anvisaCode`, `activeIngredient` e `requiresPrescription`; estoque ainda pressupunha validade/lote.
6. Prompts de bugfix/refactor e reviewer estavam vazios ou incompletos.
7. Regras de performance eram absolutas (Streaming, Suspense, memo etc.), o que pode gerar overengineering.

Correção aplicada:

- roteamento de contexto por tarefa;
- política de 3–6 arquivos iniciais do projeto;
- testes/build/lint/typecheck proibidos automaticamente;
- stack real como fonte da verdade;
- domínio adaptado a eletrônicos;
- API externa isolada por adapter;
- prompts curtos e específicos;
- roadmap incremental para evitar tarefas gigantes;
- referências atuais de API, visual e arquitetura.

A pasta total pode ser maior por conter documentação de referência, mas o contexto lido por tarefa é menor. O ganho vem de leitura seletiva, não de apagar conhecimento útil.
