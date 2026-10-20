# Avviare ArtAround su un server

Guida passo passo per mettere in piedi l'app su un server Docker che raggiunge
un container Mongo chiamato `mongo`, dietro l'endpoint HTTPS che ci è stato
assegnato (qui `https://IL-NOSTRO-DOMINIO`).

## 0. Cosa serve

- Docker sul server, e la rete Docker a cui è collegato `mongo`
  (`docker inspect mongo --format '{{json .NetworkSettings.Networks}}'` la mostra;
  qui la chiamiamo `RETE`).
- Il proxy HTTPS dell'endpoint che inoltra a `http://<container-app>:3000`
  (o alla porta 3000 dell'host). L'app parla HTTP: il TLS lo fa il proxy.
- Le chiavi esterne che vogliamo attivare (Groq, Fish Audio, LiveKit, Mint,
  Stripe sandbox). Senza, l'app parte lo stesso e quelle funzioni danno errore.

## 1. Codice

```bash
git clone https://github.com/tecWebSelfie/ArtAround.git
cd ArtAround
git checkout develop
```

## 2. File `.env`

Nella radice del progetto (è in `.gitignore`, non va mai committato):

```bash
cp .env.example .env
```

Compilalo così (le altre voci di `.env.example` restano vuote se non servono):

```dotenv
NODE_ENV=production
PAYLOAD_SECRET=<openssl rand -hex 32>        # generalo una volta e non cambiarlo più
DATABASE_URL=mongodb://mongo:27017/artaround
# con autenticazione su Mongo:
# DATABASE_URL=mongodb://UTENTE:PASSWORD@mongo:27017/artaround?authSource=admin

NEXT_PUBLIC_APP_URL=https://IL-NOSTRO-DOMINIO
NEXT_PUBLIC_PAYLOAD_URL=https://IL-NOSTRO-DOMINIO
NEXT_PUBLIC_API_MOCKING=
NEXT_PUBLIC_GPS_SIMULATOR=false
PAYLOAD_MCP_KEY=<openssl rand -hex 24>

GROQ_API_KEY=
FISH_API_KEY=
LIVEKIT_URL=wss://…          # LiveKit Cloud
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
MINT_API_KEY=
STRIPE_SECRET_KEY=sk_test_…
STRIPE_WEBHOOKS_ENDPOINT_SECRET=whsec_…
```

Due regole:

- Le variabili `NEXT_PUBLIC_*` vengono scritte nel codice **durante la build**:
  se le cambi, devi rifare la build (passo 4).
- `PAYLOAD_SECRET` firma sessioni e token: cambiarlo disconnette tutti.

## 3. Container dell'app

La build ha bisogno del database: alcune pagine (`museum/[id]`) generano i
percorsi statici leggendo i musei. Per questo build e avvio si fanno in un
container collegato alla stessa rete di `mongo`:

```bash
docker run -d --name artaround \
  --network RETE \
  --env-file .env \
  -v "$PWD":/app -w /app \
  -p 3000:3000 \
  --restart unless-stopped \
  node:22 sleep infinity
```

Il codice è montato da questa cartella: anche i file caricati (immagini di
musei, oggetti, contenuti, tour, utenti) finiscono qui, nelle cartelle create
da Payload, e sopravvivono al riavvio del container. Facci il backup insieme a
Mongo.

## 4. Dipendenze e build

```bash
docker exec -it artaround sh -c 'corepack enable && pnpm install --frozen-lockfile'
docker exec -it artaround sh -c 'pnpm build'
```

La build usa fino a 8 GB di memoria (`--max-old-space-size=8000` in
`package.json`); su un server più piccolo aggiungi swap.

## 5. Dati iniziali (solo la prima volta)

Su un database vuoto:

```bash
docker exec -it artaround sh -c 'pnpm payload seed'
docker exec -it artaround sh -c 'pnpm search:reindex'
```

Il seed salta ciò che esiste già. Crea il super admin `dev@payloadcms.com`
(password `test`) e utenti demo con password `test-password`: **cambia subito
quelle password** da `/admin`, o elimina gli utenti demo.

`search:reindex` ricostruisce l'indice della ricerca (docs/search.md); va
rilanciato anche dopo un aggiornamento che cambia `src/lib/search-index.ts`.

## 6. Avvio

```bash
docker exec -d artaround sh -c 'pnpm start > /app/app.log 2>&1'
```

Controlla:

```bash
curl -I http://localhost:3000/it/navigator     # 200
tail -f app.log
```

All'avvio è normale l'avviso `No email adapter provided`: le email sono state
tolte dal progetto.

## 7. Endpoint HTTPS

Punta il proxy dell'endpoint a `http://<host>:3000`, inoltrando gli header
`Host` e `X-Forwarded-Proto`. Poi da browser:

- `https://IL-NOSTRO-DOMINIO/it/navigator`: la home;
- `https://IL-NOSTRO-DOMINIO/admin`: il pannello Payload.

HTTPS serve davvero: fotocamera (scanner QR), microfono e posizione funzionano
solo in un contesto sicuro.

## 8. Servizi esterni

- **Stripe (sandbox):** in Dashboard → Developers → Webhooks crea un endpoint
  `https://IL-NOSTRO-DOMINIO/api/stripe/webhooks` e copia il signing secret in
  `STRIPE_WEBHOOKS_ENDPOINT_SECRET`. Senza webhook i pagamenti non sbloccano
  i contenuti.
- **LiveKit (tour di gruppo):** progetto su LiveKit Cloud, URL `wss://` e chiavi
  in `.env` (docs/group-tours.md). L'agente vocale in `my-agent/` è un servizio
  a parte.
- Dopo ogni modifica a `.env`: riavvia (passo 6); se hai toccato una
  `NEXT_PUBLIC_*`, rifai anche la build (passo 4).

## 9. Aggiornare

```bash
git pull
docker exec -it artaround sh -c 'pnpm install --frozen-lockfile && pnpm build'
docker exec artaround sh -c 'pkill -f "next start"; true'
docker exec -d artaround sh -c 'pnpm start > /app/app.log 2>&1'
```

## Nota sul `Dockerfile` del repo

Il `Dockerfile` (build standalone) per ora non funziona così com'è, ed è per
questo che la guida usa il container `node:22`:

- copia solo `package.json` e il lockfile prima di `pnpm i`, ma
  `pnpm.patchedDependencies` richiede anche la cartella `patches/`
  (serve `COPY patches ./patches`);
- `next build` deve raggiungere Mongo (passo 3), cosa che un `docker build`
  normale su una rete con nome non permette;
- l'immagine finale non ha un volume per i file caricati.
