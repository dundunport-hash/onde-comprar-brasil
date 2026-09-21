# Produtos — eletrônicos

Remover dependência conceitual de campos farmacêuticos.

Modelo de apresentação desejado, conforme dados disponíveis:

- id/slug/SKU;
- título e marca;
- categoria;
- preço + desconto;
- estoque/disponibilidade;
- thumbnail/imagens;
- descrição curta;
- rating/reviews;
- especificações;
- garantia/entrega.

## API fake padrão

Preferir DummyJSON para protótipo: REST, sem auth e baixo custo de integração.
Categorias úteis: `smartphones`, `laptops`, `tablets`, `mobile-accessories`.

Crie um adapter (ex.: `mapExternalProduct`) para converter DTO externo no `Product` interno. Não espalhe campos da API pelos componentes.

Não migrar banco por causa da API fake. Se o projeto já possui catálogo local/DB, deixe a origem de dados substituível.
