# Piano requisiti 18-33

Checklist dei lavori che mancano per il livello 18-33 del progetto (PDF del
corso 2025/26), con i criteri per dire finito ogni punto. Guida una direttiva
`/goal`: il file sopravvive alle compattazioni del contesto e si aggiorna punto
per punto. Bozza discussa: <https://claude.ai/artifact/PB41CcTaZFytdGChZQeAVY>.

Stati: `[ ]` da fare, `[x]` fatto e verificato, `[!]` bloccato (motivo scritto
sotto il punto).

## Perimetro confermato dal PDF

Fonte: **25 Progetto 2526 (1).pdf**, fornito dal maintainer. `18-33` indica
il livello di valutazione: comprende navigator base (18-24), prima estensione
(18-27) e seconda estensione (18-33), non soltanto le pagine 18–33.
I numeri di pagina qui sotto sono quelli fisici del PDF, a partire da 1.
Il marketplace è escluso da questo lavoro e affidato a un altro componente
del gruppo; le sue funzionalità non vanno segnate come verificate da noi.

| Area                  | Requisiti nel nostro perimetro                                                                                                                                                                                       | PDF       |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| Navigator base        | Selezione/esecuzione visita; mappa delle opere; testo e sintesi vocale; comandi controllati e pulsanti accessibili equivalenti                                                                                       | 27        |
| Comandi               | Prossimo/precedente, cos'è questo, più/meno dettagli, più semplice/approfondito, autore/stile, uscita/toilette/bar/shop/ostacoli                                                                                     | 27        |
| Visite di gruppo      | Ingresso con nome mnemonico; elenco partecipanti; contenuti avviati dalla guida; ospiti liberi di approfondire/cambiare linguaggio ma non tappa; monitoraggio richieste; quiz finale e voti                          | 28        |
| Localizzazione        | Individuazione dell'opera e indicazioni per raggiungere opere e servizi, considerando ostacoli; scansione QR; nella versione avanzata posizione e orientamento del device, scelta tra miniature in caso d'incertezza | 29        |
| Generazione           | Item mancanti, alternativi o di livello/linguaggio non disponibili                                                                                                                                                   | 30        |
| Linguaggio naturale   | Comandi vocali liberi ricondotti ai comandi disponibili                                                                                                                                                              | 30        |
| Lingue                | Traduzione dei contenuti e dei comandi; ascolto nella lingua del visitatore                                                                                                                                          | 30        |
| Visite personalizzate | Creazione da vincoli del visitatore: tempo, visite precedenti, composizione/età del gruppo, interessi                                                                                                                | 30        |
| Interazione           | Form e interazioni dirette; nessun prompt LLM esposto; provenienza umana/AI distinguibile solo nei metadati                                                                                                          | 30        |
| Modello condiviso     | Visite con logistica separata dagli item; item con durata, linguaggio, autore, licenza; contenuti anche su artisti, stili ed eventi                                                                                  | 22        |
| Generalità            | Navigator per smartphone e utilizzabile da PC; musei intercambiabili tramite configurazione, titoli e immagini                                                                                                       | 31        |
| Dimostrazione         | Museo reale popolato; visite disponibili; almeno una visita sincronizzata con quiz; QR stampabili; teletrasporto vicino a ogni opera della visita                                                                    | 32–33     |
| Consegna              | Backend Node.js, MongoDB e codice sui server del dipartimento, due container Docker; README.txt e sorgenti per la consegna                                                                                           | 31, 37–40 |

Account e visite di esempio sono dati condivisi con il marketplace: conservarli
e usarli per provare il navigator non significa intervenire sull'interfaccia
marketplace. Restano fuori da questa attività catalogo commerciale, acquisti,
vendite, adozioni e relativa UI di authoring/editor del compagno. Il collegamento
dal navigator al marketplace va preservato (p. 27).

La presenza di test di regole pure non certifica l'intero flusso utente:
in particolare `tour-plan.int.spec.ts` prova vincoli, prompt e budget, non la
sincronizzazione di contenuti diversi per età o l'intero flusso nel browser.
Gli stati storici sotto riportano le verifiche delle sessioni precedenti;
non sono una nuova esecuzione di tutte le suite in questa sessione.

## Decisioni

| Decisione                 | Scelta                                                                                    |
| ------------------------- | ----------------------------------------------------------------------------------------- |
| Branch di lavoro attuale  | `db-populate`, richiesto dal maintainer; supera il vecchio branch del handoff             |
| Dichiarazione dei diritti | Casella a ogni nuovo contenuto, salvata in `rightsDeclaredAt`                             |
| Autori, stili, eventi     | Collection separata `subjects`                                                            |
| "Plan my visit"           | Nel perimetro navigator 18-33 (PDF p. 30); flusso verificato con gruppo e profili per età |

Già decise:

- Identificativo universale: `wikidataId` su opere e soggetti; nessun `externalIds`.
- Titolare dei diritti: l'autore, oppure un museo dove l'autore è almeno curatore
  (`rightsMuseum`); testi di terzi non ammessi.
- Campo `copyright` rimosso.
- "Dimmi di più" prosegue il discorso, non passa a un altro item.
- Contenuti privati per gli ospiti di gruppo: cookie firmato con il segreto
  LiveKit, non `saveToJWT`.
- Editor e marketplace in React, app unica, configurazione del museo come ora.

## Checklist

- [x] **1. Seed conforme al PDF**
  - Account `autore1`, `autore2`, `visitatore1`, `visitatore2`, password `12345678`.
  - Museo reale: Pinacoteca Nazionale di Bologna, con opere che hanno un Q-id
    Wikidata e immagini a licenza libera.
  - 3 visite di almeno 10 opere ciascuna; una visita sincronizzata con quiz.
  - Foglio QR stampabile e una posizione di teletrasporto vicino a ogni opera.
  - Prova: test di integrazione sul seed (conteggi di account, opere e tappe).
  - Fatto: `pnpm seed:demo` (`scripts/seed-demo-museum.ts` + `demo-museum-data.ts`)
    semina la Pinacoteca (Wikidata Q1103550) con 16 opere vere (Q-id, inventario,
    foto Commons come miniatura), 19 contenuti di `autore1`/`autore2`, 3 visite da
    12, 10 e 10 opere; la prima ha 4 domande di quiz. Account in
    `src/seed-accounts.ts`, creati anche dal seed base. Foglio QR (`/api/qr-sheet`)
    e teletrasporto ("imposta come tua posizione" da ogni opera) esistevano già.
    Test: `tests/int/demo-museum-seed.int.spec.ts`.
- [x] **2. Licenza e titolare dei diritti**
  - Campo `license`: CC0, CC BY, CC BY-SA, CC BY-NC, CC BY-NC-SA, tutti i diritti
    riservati (niente ND).
  - Campo `rightsMuseum`, scelto da un `Select`; il server rifiuta se l'utente
    non è almeno curatore del museo.
  - Rimozione di `copyright` da collection, form, seed, mock e pagina; riga
    "© titolare anno, licenza" calcolata.
  - Casella "dichiaro di essere l'autore o di avere i diritti" a ogni nuovo
    contenuto, verificata dal server, che salva `rightsDeclaredAt` (non richiesta
    per varianti AI e seed).
  - Regole: prezzo > 0 impone "tutti i diritti riservati"; un contenuto NC non
    entra in un tour a pagamento.
  - Prova: test sugli hook (titolare non autorizzato, dichiarazione mancante,
    contenuto a pagamento, NC in tour a pagamento).
  - Fatto: regole in `src/lib/content-rights.ts`; hook `guardRights` (contents) e
    `guardNonCommercialContents` (tours); form con "Titolare dei diritti",
    "Licenza" e casella di dichiarazione; riga crediti calcolata nella pagina del
    contenuto. Test: `tests/int/content-rights.int.spec.ts`, storia
    `ContentDetails` (Minimal).
- [x] **3. Durata in secondi**
  - `durationSeconds` al posto di `readingTimeMins`, stimata dal testo; mostrata
    come "15 s" o "1 min 30 s".
  - Le versioni generate accettano durate in secondi.
  - Prova: test sulla stima e sulla formattazione.
  - Fatto: `contents.durationSeconds` (e `contentVariants.durationSeconds`) al
    posto di `readingTimeMins`, stimata a 150 parole al minuto (lettura ad alta
    voce) in `src/lib/duration.ts`; etichetta compatta `15"`, `1'30"`, `12'` in
    `DurationBadge` e nelle schede; le versioni generate si chiedono in secondi
    (`?seconds=`); tour e planner convertono in minuti. Test:
    `tests/int/duration.int.spec.ts`; storie ContentsCarousel e
    ContentsSearchResults aggiornate al nuovo formato.
- [x] **4. Sintesi vocale del contenuto base**
  - Collection upload `contentAudio`: `content`, `locale`, `variant`?,
    `textHash`, `durationSec`, `model`, `voice`; indice univoco.
  - L'hook `afterChange` mette in coda un job sulla coda `speech` (intervallo
    breve) solo per la lingua originale.
  - Altre lingue alla prima richiesta di ascolto, quando la traduzione è pronta;
    stato "in preparazione" aggiornato a intervalli.
  - Lettura dell'audio con la stessa regola del testo a pagamento; pulsante
    "Ascolta" nel modale del contenuto.
  - La durata reale dell'audio aggiorna `durationSeconds`.
  - Prova: test su job, `textHash` e accesso; storia del pulsante.
  - Fatto: collection `contentAudio` (`src/collections/ContentAudio.ts`), task
    `generateContentAudio` (coda `speech`, ogni 5 s), hook `queueContentAudio`,
    route `/api/content-audio/[id]` (legge il testo come il visitatore, supporta
    Range), pulsante `ContentAudioButton` in tutte le viste del contenuto.
    Versioni per bambini, età esatta, livello e durata supportate: “Ascolta”
    usa la variante mostrata, con file e cache separati dal testo base.
    Test: `tests/int/content-audio.int.spec.ts` (Fish Audio simulato), storia
    `ContentAudioButton`. Limite: la chiamata reale a Fish Audio non è
    verificata qui, perché nell'ambiente cloud manca `FISH_API_KEY`.
- [x] **5. Soggetti e Wikidata**
  - Collection `subjects` (persona, movimento, evento) con `wikidataId`;
    `wikidataId` e `inventoryNumber` sulle opere.
  - Ricerca Wikidata nel form; job di import di autore (P170), movimento (P135)
    ed eventi, su un solo livello.
  - Nomi e descrizioni in più lingue presi da Wikidata; Q-id finale salvato anche
    se il codice cercato era un rinvio.
  - Join dei contenuti verso `objects` e `subjects`.
  - Prova: test dell'import con risposte Wikidata registrate.
  - Fatto: vedi `docs/subjects-and-wikidata.md`. Collection `subjects`, campi
    `wikidataId`/`inventoryNumber`/`creators`/`movements`/`events` sulle opere, job
    `importWikidataSubjects`, ricerca Wikidata nel form, pagina `/subject/[id]`,
    autore e stile linkati nei dettagli dell'opera. Il seed importa 17 soggetti
    (16 autori/movimenti con nomi nelle lingue di Wikidata) e due contenuti su
    Raffaello e Reni. Test: `tests/int/wikidata-subjects.int.spec.ts`, storia
    `ObjectDetailsModal` → With Subjects.
- [x] **6. "Dimmi di più" progressivo e "dimmi di meno"**
  - Il modello riceve anche gli approfondimenti già letti; ogni passo è salvato
    a sé.
  - Wikidata letta per Q-id quando c'è.
  - "Dimmi di meno" = versione più breve dello stesso contenuto.
  - Prova: test sul prompt e sulla chiave della variante salvata.
  - Fatto: `?step=` e pulsante "Dimmi ancora di più" (`ContentExpansion`); il
    prompt riceve i passi precedenti (`alreadyRead`); `contentVariants.step` e
    chiavi in `src/lib/expansion-variants.ts`; il comando vocale ripetuto avanza
    di un passo; Wikidata letta per Q-id (`externalSources(…, wikidataId)`).
    "Dimmi di meno" = "Più breve" (versione in secondi, punto 3). Test:
    `tests/int/expansion.int.spec.ts`; storie NavigationSpotlight e StepModal.
- [x] **7. Comandi a vocabolario controllato mancanti**
  - Precedente, dimmi di meno, chi è l'autore, qual è lo stile, ci sono
    ostacoli, non ho capito.
  - Ognuno con il pulsante equivalente; autore e stile seguono i collegamenti
    del punto 5.
  - Prova: test sulla lista dei comandi; storie aggiornate.
  - Fatto: vocabolario controllato in `src/lib/voice-vocabulary.ts` (frasi
    italiane e inglesi, provate prima della LLM in `/api/assistant`); comandi
    nuovi `previous-stop`, `what-is-this`, `author`, `style`, `version:harder`
    con i loro pulsanti (pillole dello Spotlight, "Più approfondito" tra le
    opzioni di lettura); "ci sono ostacoli" attiva il percorso senza barriere e
    l'accessibilità del museo entra nel contesto dell'assistente. Test:
    `tests/int/voice-vocabulary.int.spec.ts`; storie NavigationSpotlight
    (Voice Command Pills), TourNavigation, StepModal.
- [x] **8. Contenuti privati e pubblici**
  - Campo `visibility` su contenuti e tour; accesso "pubblico, oppure autore,
    oppure tour del cookie di gruppo".
  - Privati esclusi da ricerca, marketplace, liste degli oggetti, "Plan my
    visit" e prezzi dei tour.
  - Regole: privato non vendibile; tour pubblico senza contenuti privati altrui;
    niente ritorno a privato se comprato o adottato.
  - Cookie di gruppo con `tourId`, firmato con il segreto LiveKit, durata breve.
  - Prova: test di accesso (anonimo, autore, ospite con cookie, cookie scaduto).
  - Fatto: `src/lib/visibility.ts` (accesso `readContents`/`readTours`, cookie
    `aa-group-tour` firmato con `jose` e il segreto LiveKit, impostato da
    `/api/rooms/token`), campi `visibility`, hook `guardVisibility`,
    `guardPrivateContents`, `hideFromSearch`, `skipSync` della ricerca,
    `VisibilityInput` nei form e badge "Privato". Più severo del piano: un tour
    pubblico non può contenere nessun contenuto privato, nemmeno dell'autore
    stesso, perché i suoi visitatori non lo leggerebbero. Corretto anche
    `/api/rooms`: ora legge il tour come l'host, quindi nessuno apre una stanza
    (e ottiene il cookie) per un tour privato altrui. Test:
    `tests/int/visibility.int.spec.ts`; storie VisibilityInput e
    ContentDetails → Private.
- [x] **9. "Chi ha chiesto cosa"**
  - Ogni ospite pubblica un attributo `requests` (tappa, tipo, ora).
  - Il docente vede un contatore per partecipante e un pannello "Richieste" per
    studente e per tappa.
  - L'ospite è avvisato che il docente vede le sue richieste.
  - Prova: test sul formato dell'attributo; storia del pannello.
  - Fatto: `src/lib/group-requests.ts`; `GroupSync` pubblica le richieste
    dell'ospite lette dall'URL della modale; `GroupRequests` nel pannello del
    gruppo dell'host; avviso per gli ospiti. Test:
    `tests/int/group-requests.int.spec.ts`; storia `GroupRequestList`.
- [x] **10. Verifiche**
  - L'ingresso al gruppo mostra il titolo del tour e il nome del docente.
  - Nessun badge "AI" visibile nell'interfaccia: i contenuti generati si
    riconoscono solo dai metadati.
  - Prova: ricerca nel codice e storie interessate.
  - Fatto: la pagina `/room/[code]` mostra già titolo del tour e "{{name}} ti ha
    invitato" prima del nome (nuova storia `GroupRoomPage` → Join Shows Tour And
    Host). Ricerca nei testi inglesi dell'interfaccia: nessuna etichetta "AI",
    "generated", "LLM" sui contenuti; `contentVariants.generation` e
    `contentAudio.model/voice` restano solo metadati. Le sole menzioni sono
    nell'editor della mappa ("Generated object preview"), uno strumento dello
    staff per il modello 3D, non per gli item. Test: `tests/int/no-ai-labels.int.spec.ts`
    (nessun testo inglese rivolto ai visitatori nomina AI, generazione o LLM).

- [x] **11. Correzioni dopo la revisione della PR (escluso il marketplace)**
  - Ospiti di gruppo: le regole di accesso leggono il cookie del gruppo dalla
    richiesta Next quando una lettura Local API non ha header
    (`groupCookie` in `src/lib/visibility.ts`).
  - Navigazione del museo: i tour si leggono come il visitatore, i tour privati
    restano nascosti.
  - Un contenuto non diventa privato se un tour pubblico del suo autore lo usa.
  - Comandi vocali: "dov'è la toilette", "dov'è lo shop"; le parole di cortesia
    si tolgono solo ai bordi della frase; "Cos'è questo" ripiega sull'opera
    guardata o sulla tappa corrente; gli ospiti di gruppo possono chiedere
    cos'è, l'autore e lo stile.
  - "Ascolta" smette di attendere l'audio quando la finestra si chiude.
  - Indicazioni logistiche: `tours.logistics` (informazioni pratiche) e
    `tours.directions` (come raggiungere ogni tappa), in editor, pagina del
    tour e navigazione (`src/lib/tour-logistics.ts`).
  - Seed: 4 tour diversi per livello (generale con quiz, per esperti, Seicento,
    famiglie), più item per la stessa opera, indicazioni logistiche.
  - Item su artisti, stili ed eventi: `/content/new?subject=`, campo virtuale
    `attachToSubject`, pulsante sulla pagina del soggetto.
  - Prova: `tests/int/visibility`, `voice-vocabulary`, `tour-logistics`,
    `demo-museum-seed`; `pnpm seed:demo`; pagine verificate nel browser.

## Fuori dal piano

- [x] **Suite d'integrazione completa: 10 test rossi preesistenti**
  - Erano rossi anche sul commit di partenza `40f127f`. Aggiornati su richiesta
    degli autori, allineandoli al codice attuale senza disattivare nulla:
    - `api.int.spec.ts` avvia Payload vero: ora gira nell'ambiente `node`
      invece di jsdom;
    - `objectsAccess.int.spec.ts` verificava il vecchio controllo RBAC: ora
      verifica i ruoli per museo (crea lo staff, modifica il proprietario con una
      query su `createdBy`, cancella solo il super admin);
    - `objectModelEndpoints.int.spec.ts`: il mock ora fornisce
      `docAccessOperation`, che l'endpoint usa per riconoscere il proprietario.
  - `pnpm test:int` completo: 71 file, 342 test passati.

- [x] **Test dei requisiti del navigator 18-33 ancora scoperti (marketplace escluso)**
  - Seam concordati e provati con la skill TDD: comandi in linguaggio naturale
    (`assistant-natural-language`), comandi dell'ospite di gruppo
    (`group-guest-commands`, regola spostata in `guestCommands` di
    `src/lib/group.ts`), traduzione dei contenuti (`content-translation`),
    visita dai vincoli dell'utente (`tour-plan`), QR stampati
    (`printed-qr`), metadati dell'item (`item-metadata`), teletrasporto
    (`teleport`), opera davanti all'utente (`work-in-front`).
  - Nuova regola pura `src/lib/work-in-front.ts`: posizione + bussola →
    opera sicura, candidate da scegliere (massimo 4) o nessuna.

## Localizzazione avanzata — implementazione Codex

- [x] Collegamento posizione stimata + bussola + opere sulla mappa, sul branch
      `db-populate`, secondo il brief confermato nella sessione vocale.
      `compass-source.ts` legge heading iOS e alpha assoluto, con autorizzazione
      da un tap; il simulatore ruota anche la direzione con le frecce.
- [x] Avviso non bloccante distinto per destinazione successiva e scoperta
      facoltativa fuori tour. Miniature e nomi per massimo quattro opere; apertura
      e conferma della posizione sono azioni separate. Nessun aggiornamento
      automatico di `at`, né cambio locale della posizione per gli ospiti di gruppo.
- [x] Comparsa a 3 m / 30°, permanenza fino a 4,5 m / 45°, scomparsa quando
      ci si allontana o il GPS non è utilizzabile; chiusura persistente finché le
      candidate restano in portata. Nessuna notifica della stanza sovrapposta
      all'avviso GPS; lo storico dei suggerimenti resta nella ricerca.
- [x] Stima GPS anche in visita libera senza destinazione; nuova calibrazione
      cambiando posizione confermata o sorgente GPS. Tradotte tutte le 16 nuove
      chiavi nelle 24 lingue. Il controllo i18n globale segnala ancora lacune
      estranee alle nuove chiavi: non è una certificazione di tutte le traduzioni.
- [x] Test mirati delle regole e dei sensori simulati; storie interattive
      `Nearby Works`, `Live Proximity`, `Compass Settings`, con accessibilità.
      Ultimo controllo mirato: 6 file, 35 test passati (incluse le regole esistenti
      di guida e pianificazione); 9 storie verificate fra i componenti coinvolti.
      Rendering ispezionato a 390×844 e 1280×800, tema chiaro/scuro; nessun test
      di regressione visiva eseguito. Controllo TypeScript e lint eseguiti;
      lint conserva warning su file preesistenti fuori da queste modifiche.
      Provato anche il collegamento nella mappa completa: tre movimenti a est
      nel simulatore della storia `SimulatedGps` mostrano l'avviso per Gallery exhibit.
- [ ] Prova fisica su iOS/Android e dentro il museo: permessi e precisione
      reali non sono certificati dai sensori sintetici. Il piano usa l'ipotesi
      già presente di mappa orientata a nord e coordinate in metri.

### Ripristino del motore Impeccable

- [x] Launcher `.agents` e `.claude` verificati con il motore Linux 0.1.16:
      bootstrap nella cache ignorata del progetto, senza richiedere scritture
      nella home del sandbox. Override, TLS e checksum restano invariati.
- [x] Verificati i parser degli hook con fixture Claude Edit e Codex apply_patch;
      documentate le differenze dei client in `docs/impeccable-runtime.md`.
- [x] Ripetuti i controlli del motore su sorgenti e rendering mobile/desktop/
      scuro. Corretto il salto h3→h2 nell'avviso; i tre rendering non presentano
      segnalazioni. Revisore indipendente Impeccable: `ship` sul perimetro fornito.
      Il brief è ora registrato dal motore con i suoi effettivi file sorgenti.

### Navigation audit follow-up — adapt, harden, polish (2026-11-06)

- [x] Corrected navigation action/duration contrast with museum-primary shade 8.
- [x] Bounded overlays between measured bars; essential commands stay in a
      wrapping dock, services use a separate popover, and secondary actions scroll.
- [x] Enlarged navigation touch targets to at least 44px and allowed long
      labels/footer directions to wrap.
- [x] Passed 38 focused integration tests, 10 interaction/a11y stories and the
      full TypeScript check. Repeated seven-state axe scan: no violations or
      horizontal overflow. Evidence and limitations: `tour-navigation-audit.md`.
- [x] Synthetic Chromium swipes recovered Open/Confirm/Next/Resume in landscape
      and with 200% text, while essential dock controls remained hittable.
- [x] Independent finish review: `ship` for the scored A3 active-footer fix;
      no regression identified in that correction. DESIGN.md and its sidecar
      reconciled with the navigation rules. This is not whole-application certification.

### Planned visits and synchronized family reading (2026-11-06)

- [x] Verified the public planner with time, returning visit, interests, adults
      and children aged 5/8. Added group start to the preview and a personal reader
      choice to preview/join; adults no longer receive children's text by default.
- [x] Exact-age variants and further explanations use distinct prompts/cache
      keys. Age persists across shared stops and reload without being broadcast
      by the host. Saved MongoDB variants for 5 and 8 were inspected independently.
- [x] Fixed the overlong-first-stop budget exception, duplicate works, private
      candidate exclusion and stale cached-plan validation. Two-second captions
      now request the API's valid minimum version length rather than failing.
- [x] 32 focused integration tests and both new public-flow e2e tests passed:
      real Next/Payload/MongoDB/LiveKit, three independent browser contexts, AI SDK
      mocks only at the language-model boundary. No claim about real provider prose.
- [x] Translated the five new planner strings across all 24 locales. Applied
      readable action/gradient shades, dark secondary text and validation colors.
- [x] Independent Impeccable finish review: `ship` for this scoped planner/reader
      extension. Eight interaction/a11y stories, final TypeScript, scoped lint and
      i18next extraction checks passed; DESIGN.md and its sidecar reconciled.

Detailed behavior, test boundaries and evidence: `docs/planned-visits.md`.

### Museum geographic location (2026-11-07)

- [x] Public Info map/pin and director inline address autocomplete implemented
      with Map Place hooks, native Mantine UI and standalone `MapPlaceMap`.
      Save commits postal text and the existing native Payload point together;
      changing address/city/coordinates requires a new explicit confirmation.
- [x] Simplified the normal form to one full address; city is derived from the
      suggestion and editable only in the manual fallback. Legacy addresses display
      without duplicated city. Nine integration tests and 12 affected interaction/a11y
      stories passed for this refinement, with no reported accessibility violations.
- [x] Eight focused integration tests and 14 initial scoped interaction/a11y stories
      passed; TypeScript, scoped lint and i18next extraction `--ci` passed.
- [x] Independent final visual verdict: `ship` for this scoped extension, with
      all five contract sections and six valid final captures; no material fixes
      remain. Public Info placement was source-verified, without a separate public-page
      capture. Live providers, street tiles and physical GPS were not tested.

Behavior, configuration and evidence: [Museum location](../museum-location.md).
Historical library comparison: [shape and library audit](museum-location-shape-and-library-audit.md).
This is a geographic address extension; indoor Pascal navigation and outdoor
routing are outside its implementation scope.

## Rimandati

- `README.txt` e cartella `sources`: li preparano gli autori del progetto.
- Test visivi (`pnpm test:visual`): solo con approvazione esplicita, per ogni
  esecuzione.

## Vincoli di lavoro

- Commenti d'intento su ogni modifica; chiavi i18n tradotte in tutte le 24 lingue.
- Mantine prima di Tailwind; niente valori calibrati su uno schermo.
- Test mirati per ogni punto; `pnpm typecheck` una sola volta alla fine.
- `/simplify` sul diff; `/impeccable extract` e `document` se la UI è cambiata.
- Niente test visivi, niente PR, niente merge; test esistenti mai modificati solo
  per farli passare.
- Un punto bloccato da una chiave API o da una decisione degli autori diventa
  `[!]` con il motivo, e si passa al successivo.

### Closing pending implementation and regression work (2026-11-07)

- [x] Filled all 15 museum-location strings in all 24 supported UI languages;
      i18next extraction `--ci` reports no file updates.
- [x] Added Listen for the displayed saved version, including exact age, with
      source entitlement checks, separate recordings/cache/jobs, Range/ETag and
      cancellation on reader changes. Existing base recordings are retained by
      a targeted startup index upgrade.
- [x] Final full integration run: 43 files, 276 tests passed, including Android
      absolute event/cleanup, insecure context/Safari permission exceptions,
      personalized audio and failed group-end recovery. No skipped tests.
- [x] Four scoped audio interaction/a11y stories passed without reported
      violations. Mobile, desktop and mobile-dark renders were inspected without
      horizontal overflow. Production build and its TypeScript check passed.
- [ ] Physical iOS/Android/museum acceptance requires actual devices and an
      indoor trial. Automated sensors cover permissions, event formats, stale
      measurements and cleanup; they do not certify hardware accuracy.
- [!] Live CARTO/Photon verification is blocked by the current enforced cloud
  network policy (fresh CONNECT 403 probes). The allowlist draft is saved;
  review/save and environment publication are needed to apply it. No
  environment publication or deployment was performed.

- [x] Removed the editor's blocked external Draco decoder request: matching
      Three.js decoder assets are copied locally at postinstall and configured
      before GLTF preload. Both map-editor E2E cases now pass without suppressing
      their runtime-error assertions; no dependency was added.
- [x] Rechecked real QR decoding for canonical object/content links, voice-command
      execution, personalized family audio and GPS proximity confirmation. The
      navigation test now targets the implemented proximity notice, replacing
      its obsolete room-carousel expectation.
- [x] Group token/connection startup retries preserve membership on temporary
      failures. Failed DELETE no longer abandons the host locally or redirects
      home; the host can retry. The retry message is translated in all 24 locales.

- [x] Closed all 21 distinct E2E scenarios through the full run and focused
      reruns after demonstrated fixes. The initial 21-case run passed 11 and
      exposed 10 failures; the affected 12-case rerun passed 10, leaving two
      group-end failures. After correcting false deletion success, all three
      group scenarios passed, including injected token/DELETE 503 recovery,
      exact room deletion (HTTP 204 then 404), group switching and ended codes.
      Logs: `/tmp/artaround-full-e2e.log`, `/tmp/artaround-e2e-recheck.log`,
      `/tmp/artaround-e2e-group-final.log`. No visual-regression suite was run.

No local implementation or regression failure remains from this closing pass.
The open items above are external acceptance boundaries: actual phone/museum
sensors and live cartographic providers after activation of the saved network
configuration draft. Fresh final CARTO light/dark and Photon probes still return
proxy CONNECT 403 (`/tmp/artaround-live-map-probes.json`).

### Keyless basemap follow-up (2026-11-07)

- [x] Replaced the current CARTO basemap with OpenFreeMap Bright/Dark, keeping
      Map Place rendering, Mantine controls, saved marker and attribution.
      OpenFreeMap's public instance requires no key or registration; Photon
      autocomplete and persisted address/Point are unchanged.
- [x] Updated deterministic provider fixtures and added dark-map coverage:
      nine museum-location integration tests and 16 scoped interaction/a11y
      stories passed. The default E2E listing still contains 21 cases.
- [x] Prepared the separate opt-in `pnpm test:live:location` suite: three
      read-only browser checks for Photon/CORS and real light/dark vector tiles
      plus the saved pin. No writes, provider mocks or hidden skips.
- [!] Real-provider execution remains pending until the maintainer enables
  `tiles.openfreemap.org`, `assets.openfreemap.com`, `photon.komoot.io`.
  These supersede the older CARTO domain plan above. Network settings were
  not changed and no environment was published in this follow-up.
- [ ] Physical GPS/compass/museum-floor checks remain with the maintainer.
