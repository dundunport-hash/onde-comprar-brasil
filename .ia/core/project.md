# Escopo da migração

Origem: e-commerce de farmácia.
Destino: e-commerce de eletrônicos.

Preservar quando já existir: autenticação, carrinho, checkout, pedidos, admin, persistência, integrações e arquitetura.

Remover/substituir apenas quando tocado pela etapa:

- textos legais/avisos de medicamentos;
- ANVISA, princípio ativo, receita e campos farmacêuticos;
- validade/lote quando forem exclusivamente farmacêuticos;
- categorias e conteúdo de farmácia.

Produto eletrônico deve priorizar: id, slug, SKU, título, marca, categoria, preço, desconto, estoque, imagens, descrição curta, especificações, garantia, avaliação e entrega quando disponíveis.

Não alterar schema/banco só para encaixar API fake. Prefira adapter/mapeamento para o tipo interno existente.
