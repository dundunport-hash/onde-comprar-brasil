# Regras essenciais

- TypeScript forte; evitar `any`.
- Mudança mínima e localizada.
- Não duplicar lógica.
- Reutilizar padrões existentes antes de criar abstrações.
- Server Components por padrão; Client Component só quando necessário.
- Validar entrada no limite do sistema; não adicionar Zod onde o projeto não usa/precisa.
- `next/link` e `next/image` quando aplicável e já compatível com o projeto.
- Sem hardcode duplicado/mágico; conteúdo estático pode seguir o padrão atual de config/data/content.
- Estados loading/empty/error somente quando o fluxo realmente os exige.
- Nunca alterar API pública, schema, auth, checkout ou persistência por conveniência visual.
- Não executar validações automatizadas; apenas sugerir comandos manuais ao final.
