# Piano requisiti 18-33

Checklist dei lavori che mancano per il livello 18-33 del progetto (PDF del
corso 2025/26), con i criteri per dire finito ogni punto. Guida una direttiva
`/goal`: il file sopravvive alle compattazioni del contesto e si aggiorna punto
per punto. Bozza discussa: <https://claude.ai/artifact/PB41CcTaZFytdGChZQeAVY>.

Stati: `[ ]` da fare, `[x]` fatto e verificato, `[!]` bloccato (motivo scritto
sotto il punto).

## Decisioni

| Decisione                     | Scelta                                                                   |
| ----------------------------- | ------------------------------------------------------------------------ |
| Commit e push durante il goal | Commit + push sul branch `ccr-05ce6c3f-yjnqrl` per ogni punto completato |
| Dichiarazione dei diritti     | Casella a ogni nuovo contenuto, salvata in `rightsDeclaredAt`            |
| Autori, stili, eventi         | Collection separata `subjects`                                           |
| "Plan my visit"               | Fuori da questo goal                                                     |

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
    Variante per le versioni (bambini, semplice) non fatta: legge il testo base.
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
    staff per il modello 3D, non per gli item.

## Rimandati

- Indicazioni logistiche della visita (ingresso, biglietti, orari, note per
  tappa): prossima iterazione.
- Orientamento del dispositivo e scelta tra opere candidate: prossima iterazione.
- "Plan my visit" e il suo campo libero "interessi": prossima iterazione.
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
