## Drogaria Mega Popular

Aplicacao Next.js para e-commerce de farmacia, com catalogo, carrinho, checkout, dashboard administrativo e integracoes externas.

## Desenvolvimento

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Producao

Configure as variaveis de ambiente a partir de `.env.example` e rode a verificacao completa:

```bash
npm run prod:check
```

Para subir com Docker Compose:

```bash
docker compose up --build -d
```

Para subir staging local/containerizado:

```bash
copy .env.staging.example .env.staging
npm run deploy:staging
```

Para acompanhar o staging continuamente em outro terminal:

```bash
npm run monitor:staging
```

O monitor consulta `/api/health` a cada 60 segundos, registra amostras em
`.monitoring/staging-health.ndjson` e encerra com erro apos 3 falhas
consecutivas. Para uma checagem unica:

```bash
powershell -ExecutionPolicy Bypass -File scripts/monitor-staging.ps1 -Once
```

O container usa `output: "standalone"` do Next.js e inicia com `node server.js`. O endpoint `/api/health` fica disponivel para health checks.

Em deploys com multiplas replicas ou rolling deploys, use a mesma imagem entre replicas. Para builds independentes por ambiente, defina `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` durante o build.
