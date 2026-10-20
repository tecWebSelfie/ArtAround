# Ricerca: cosa è cambiato dopo l'integrazione di `login`

Report per chi ha scritto la ricerca su `login` (`169df1f`, plugin
`@payloadcms/plugin-search`). Descrive le modifiche fatte sul branch
`ccr-7db41b59-eyc7kz` e come funziona adesso. Il riferimento tecnico resta
[`docs/search.md`](search.md).

Commit coinvolti:

| Commit    | Cosa                                                                   |
| --------- | ---------------------------------------------------------------------- |
| `52de090` | Merge di `169df1f` e adattamento al modello dati del branch            |
| `26f6092` | Sicurezza: indice leggibile e scrivibile solo dal server               |
| `293efbd` | Navigazione libera (tocca la ricerca solo nella Spotlight della mappa) |

`bcda40f` (il tuo commit successivo, "exclude descriptions") **non è ancora
integrato**: vedi in fondo.

## 1. Adattamenti al modello dati

Su questo branch alcuni modelli sono diversi da `login`. L'indice ora segue
quelli.

### Prezzi

Il gruppo `pricing` (`priceCents`, `currency`, `stripePriceID`) di `login` non
esiste più: c'è un solo prezzo.

- **Contenuto:** `contents.price`, in centesimi di euro (vuoto o 0 = gratis).
- **Tour:** non ha un prezzo salvato. Il suo prezzo di listino è la **somma dei
  prezzi dei suoi contenuti**. Chi ne possiede già alcuni paga meno: lo calcola
  il checkout (`src/lib/checkout-quote.ts`), non l'indice.
- **Valuta:** sempre EUR (`PRICE_CURRENCY` in `src/lib/price.ts`).

Dove:

- `buildSearchDoc()` (`src/lib/search-index.ts`): `priceCents` del contenuto =
  `content.price`; quello del tour = `tourListPrice()`, che somma i prezzi dei
  contenuti con una query.
- `src/lib/marketplace.ts`: le card leggono gli stessi valori (`mapTour`,
  `mapContent`), quindi i filtri "Gratis/A pagamento" e il prezzo mostrato
  coincidono.

### Museo di un tour e di un oggetto

- **Tour → museo:** qui è il tour a puntare al museo (`tours.museum`,
  relazione); `museums.tours` è solo una join inversa. `museumForRelation()`
  per i tour ora legge `tour.museum` invece di cercare in `museums.tours`.
- **Oggetto → museo:** `museums.objects` resta una relazione, ma è **derivata
  dalla mappa**: un oggetto appartiene a un museo se è posizionato sulla sua
  mappa Pascal (`syncMuseumObjects`). La ricerca inversa
  `museums.objects contains id` funziona come prima.

### Aggiornamento delle righe dipendenti

- **Museo modificato** (`Museums`, hook `refreshSearchAfterChange` /
  `refreshSearchAfterDelete`): aggiorna le righe dei suoi tour (cercati con
  `tours.museum = id`) e dei suoi oggetti (`museums.objects`, valori vecchi e
  nuovi, così un oggetto tolto dalla mappa perde la città).
- **Prezzo di un contenuto cambiato** (`Contents`, hook `refreshTourPrices`,
  nuovo): aggiorna le righe dei tour che lo includono, perché il loro
  `priceCents` dipende da quel prezzo.

Entrambi passano `req` (stessa transazione) e non fanno fallire il salvataggio
se l'aggiornamento dell'indice va in errore.

## 2. Sicurezza dell'indice (`26f6092`)

Il plugin crea la collection `search` con `read: () => true` e lascia `update`
e `delete` al default di Payload, cioè "qualsiasi utente autenticato". Due
problemi, verificati in locale:

1. **Lettura pubblica:** un `GET /api/search` anonimo restituiva l'`excerpt`,
   che per i contenuti a pagamento era il testo del corpo.
2. **Scrittura da utenti normali:** con un utente qualunque, un
   `PATCH /api/search/:id` cambiava `title` e `priority` di una riga, e con
   `priority: 999` un documento finiva in cima alla ricerca della home.

**Correzione** in `src/payload.config.ts`, `searchOverrides.access`:
`read`, `update` e `delete` riservati ai super admin (`superAdminOnly`).
Non cambia nulla per l'app:

- tutte le letture passano dal server con `overrideAccess: true`
  (`querySearchIndex()`, `buildSearchDoc()`);
- il plugin sincronizza tramite Local API, che ignora questi permessi;
- il bottone **Reindex** dell'admin controlla `update` + `delete`, quindi
  funziona ancora per i super admin; lo script `pnpm search:reindex` è invariato.

Verifiche (tutte passate): `GET /api/search` anonimo e da utente → 403;
`PATCH`/`DELETE` da utente → 403; `POST /api/search/reindex` anonimo → 401,
da super admin → 200; navigator e marketplace funzionano come prima.

Nello stesso commit i contenuti a pagamento venivano indicizzati senza corpo.
Il tuo `bcda40f` va oltre (nessun corpo o descrizione per nessuno), quindi
quella parte verrà sostituita dalla tua al merge.

## 3. Navigator e Typesense (merge `52de090`)

- **Home del navigator:** il tuo commit riportava la pagina alla versione
  precedente (bottone del microfono, niente "Plan my visit" né form dei gruppi).
  Ho tenuto la pagina attuale e sostituito **solo** il blocco di ricerca con il
  tuo `NavigatorSearch`. La selezione di un risultato usa il router di Next
  (`onNavigate`), così la navigazione resta client-side.
- **Typesense rimosso del tutto:** oltre a quanto fatto nel tuo commit, ho tolto
  il server MCP di Typesense da `.mcp.json` e da `.claude/settings.json`, e la
  pagina `src/app/typesense-test`.

## 4. Bug intorno alla ricerca, emersi nei test

I risultati della ricerca portano a pagine di museo, oggetto e `/search/*`, che
andavano in errore (500 su `/search/contents` e `/search/objects`). Cause,
tutte preesistenti:

- server component che passavano `component={Link}` a un `Button` client
  (`ObjectsCarousel`, `ObjectsSearchResults`) → ora usano `LinkButton`;
- membri composti `Grid.Col`, `Card.Section`, `List.Item` usati da server
  component (in RSC risultano `undefined`) → ora `GridCol`, `CardSection`,
  `ListItem` (`SearchResultCard`, `ObjectDetailsModal`).

## 5. Come funziona adesso, in breve

```
documento salvato (tour / content / user / museum / object)
  └─ plugin search → beforeSync → buildSearchDoc()   (indice solo EN, localize: false)
       riga `search`: title, excerpt, kind, city, priceCents, sourceCreatedAt, priority
  └─ hook nostri: museo → righe di tour e oggetti; prezzo contenuto → righe dei tour

lettura (solo server, overrideAccess)
  ├─ marketplace: querySearchIndex(kinds tour/content/user, filtro prezzo, -sourceCreatedAt)
  │                → idratazione nella lingua del visitatore → MarketplaceCard
  └─ navigator:   /api/navigator-search → querySearchIndex(museum/object/tour/user, -priority)
                   → riordino per corrispondenza su città/titolo → idratazione → dropdown
```

- La ricerca è testuale: `like` (sottostringa, senza maiuscole/minuscole) su
  `title`, `excerpt` e `city`. Niente fuzzy né semantica (decisione presa).
- Ricostruire l'indice dopo modifiche a `buildSearchDoc()`: `pnpm search:reindex`.

## 6. Il tuo `bcda40f`: come si integra

Merge di prova fatto in un worktree separato:

- **Un solo conflitto**, in `search-index.ts` sull'`excerpt` dei contenuti: si
  risolve prendendo la tua versione (estratto vuoto). Il resto del file si fonde
  da solo e mantiene gli adattamenti della sezione 1.
- **`opencode.json`:** la tua correzione (`mcp.{…}` invece di `mcp.servers.{…}`)
  entra senza conflitti.
- **Effetto da sapere:** dopo il merge la ricerca trova solo titoli e metadati
  (città, regione, artista, museo). Un tema o un nome che compare solo nel
  testo (per esempio "Tintoretto", oppure "Florence" nella descrizione del
  Museo Galileo) non dà più risultati. Se servisse una via di mezzo, si può
  indicizzare un campo pubblico breve (categorie, fonti, un riassunto) invece
  del corpo.

## 7. Ancora aperto

Dall'audit della barra della home e dal controllo del plugin:

- **Ambito della home:** deve cercare **tour, contenuti e musei**. Oggi cerca
  musei, oggetti, tour e utenti, e scarta i contenuti (`NAVIGATOR_SEARCH_KINDS`
  e il `continue` su `content` nella route).
- **Troncamento prima del ranking:** la route prende 8 righe per priorità e poi
  le riordina; una corrispondenza esatta può restare fuori dalle 8.
- **Modalità museo:** `/api/navigator-search` non legge `museumScope()`.
- **Destinazione dei risultati:** i contenuti aprono la pagina di dettaglio
  (deciso); da lì "Trovalo sulla mappa" porta alla navigazione libera.
- **Funzioni del plugin non ancora usate:**
  - `skipSync` per saltare le lingue diverse da `en` (oggi ogni traduzione
    automatica rifà la sync di una riga che resta comunque in inglese);
  - `defaultPriorities` come funzione, per esempio per far salire i tour dei
    musei con una mappa;
  - campi di dettaglio nella riga (`searchOverrides.fields` + `beforeSync`),
    per mostrare nel dropdown durata, tappe, museo, difficoltà e tempo di
    lettura senza idratazioni in più.
