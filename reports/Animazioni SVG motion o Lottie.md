# Resta sul CSS, ma riscrivilo meglio

**No: né Motion né Lottie (né Rive) renderebbero `MapLoading` più leggero da capire o da mantenere; il guadagno reale sta nel riscrivere lo stesso CSS in modo più esplicito.** L'animazione attuale è un loop fisso di `transform`/`opacity` su cinque path SVG, che deve partire dall'HTML del server e continuare mentre il main thread costruisce la scena WebGPU. È esattamente il caso per cui CSS è lo strumento consigliato da Chrome, Tailwind e dalla stessa Motion. Motion 13.4.0, già installato, offre una timeline leggibile (`useAnimate` + `stagger` + `repeat: Infinity`), ma nella versione installata le trasformazioni indipendenti (`scaleY`, `y`) **non vengono passate a WAAPI**: girano nel frame loop JS e si bloccherebbero proprio durante i long task della scena 3D. In più l'animazione partirebbe solo dopo l'idratazione. Lottie e Rive aggiungono da circa 46 kB a oltre 600 kB di runtime, un asset opaco in git, una sincronizzazione imperativa del colore al posto di `currentColor` e un rendering lato client con fallback. Il debito vero del codice attuale è più piccolo: tre regole `:nth-of-type(3|4|5)` che dipendono dalla posizione dei path nel markup (il primo path è la base, quindi le colonne partono da 2) e keyframes lontani dal componente. Un indice esplicito `--i`, un token `@theme inline` per l'animazione e `motion-safe:` risolvono entrambi i problemi senza nuove dipendenze. Resta un'incognita: Safari quasi certamente non compone sul compositor le trasformazioni dei figli SVG, quindi su Safari il loader può scattare **con qualunque API**. Va misurato, non dato per scontato.

## Il costo cognitivo attuale sta in tre selettori, non nella tecnologia

Il loader oggi è un componente TSX da 1,8 KB (`src/components/pascal/MapLoading.tsx`) più circa 65 righe in `src/app/[lng]/(frontend)/globals.css`. Le righe CSS comprendono due `@keyframes` (`map-loading-rise`, `map-loading-settle`), una regola comune con `transform-box: fill-box` e la durata di 2,4 s, tre regole `nth-of-type` per i ritardi 0,12/0,24/0,36 s e un blocco `prefers-reduced-motion`. Chi legge deve tenere a mente un accoppiamento implicito: `.map-loading-column:nth-of-type(3)` è la _seconda_ colonna perché `nth-of-type` conta tutti i `<path>` fratelli, base compresa. Se qualcuno riordina i path o ne aggiunge uno, lo stagger si rompe senza errori. Il secondo attrito è la distanza: il comportamento sta in un file globale di centinaia di righe, mentre la struttura sta nel componente.

Le note di ricerca concordano che la parte "coreografica" non si semplifica cambiando strumento. Un ciclo di 2,4 s con fasi (le colonne crescono, il frontone si posa, si stacca, le colonne svaniscono) si scrive in modo naturale con le percentuali dei keyframe, e né WAAPI né Motion rendono un singolo loop fisso più leggibile di così. Josh Comeau descrive proprio la combinazione di keyframe e variabili CSS come ciò che ha "sbloccato del tutto" le animazioni a keyframe ([Josh Comeau](https://joshwcomeau.com/animation/keyframe-animations)). La domanda giusta è quindi come esprimere meglio lo stagger e dove collocare la definizione, più che quale libreria usare.

## Motion offre la timeline più leggibile, ma perde il compositor

Con `useAnimate`, Motion permette di scrivere la sequenza dall'alto in basso: colonne con `delay: stagger(0.12)`, frontone `at: 0.5`, uscita intorno a 1,8 s, e un solo `{ repeat: Infinity }` a livello di sequenza. Le note lo verificano sul sorgente installato (`framer-motion/dist/es/animation/sequence/create.mjs`): il `repeat` della sequenza viene propagato a ogni animazione generata, con i keyframe normalizzati sulla durata totale. Un `repeat: Infinity` sul singolo segmento invece viene **ignorato con un warning** (`MAX_REPEAT = 20`). La via delle _variants_ aiuta meno: `delayChildren: stagger(0.12)` sfasa solo la prima iterazione, quindi la fase sui 2,4 s andrebbe di nuovo codificata nei `times` di ogni figlio, come fa il CSS oggi ([Motion: Transitions](https://motion.dev/docs/react-transitions)).

Il problema decisivo riguarda le prestazioni. La documentazione afferma che le trasformazioni indipendenti come `x` e `scale` sono accelerate via WAAPI ([Motion: Performance](https://motion.dev/docs/performance); [Motion tier list](https://motion.dev/magazine/web-animation-performance-tier-list)). **Il sorgente installato (motion-dom 13.3.0) lo contraddice**: `acceleratedValues` contiene solo `opacity`, `clipPath`, `filter`, `transform` e `backgroundColor`, e `supportsBrowserAnimation()` scarta subito qualsiasi valore chiamato `scaleY` o `y` (`motion-dom/dist/es/animation/waapi/supports/waapi.mjs`). La versione leggibile (`scaleY: [0, 1]`) gira quindi su `requestAnimationFrame`, e la stessa Motion avverte che le animazioni guidate da rAF vanno in jank quando il main thread è bloccato. Per restare su WAAPI bisognerebbe animare la stringa grezza `transform: ['scaleY(0)', 'scaleY(1)']`, senza `repeatDelay` né `repeatType: 'mirror'`. Così però si perdono sia la leggibilità sia il `fill-box` automatico, e si finisce a scrivere keyframe CSS dentro JavaScript. Non è chiaro se la documentazione descriva una release più recente della 13.4.0: dopo ogni aggiornamento conviene ricontrollare `accelerated-values`.

Due costi secondari completano il quadro. Il primo è il momento di avvio. Un componente con `useAnimate` resta fermo sul frame iniziale finché React non idrata e l'effetto parte, e l'idratazione può essere ritardata dallo stesso lavoro pesante. Un'animazione CSS invece parte dal primo byte di HTML. Il secondo è la riduzione del movimento. `MotionConfig reducedMotion="user"` azzera le trasformazioni ma **lascia animare l'opacità** ([Motion: Accessibility](https://motion.dev/docs/react-accessibility)), quindi il fade infinito di colonne e frontone continuerebbe a lampeggiare. Servirebbe `useReducedMotion()` con un ramo statico esplicito, dove oggi basta una media query. Sul bundle il costo è modesto ma non nullo: `useAnimate` ibrido pesa circa 23 kB gzip, la versione mini 3,3 kB ma senza sequenze ([Motion: Reduce bundle size](https://motion.dev/docs/react-reduce-bundle-size)). Motion ha senso attorno al loader: un `AnimatePresence` per la dissolvenza in uscita dell'overlay, o un'animazione che deve reagire allo stato (finire su un fotogramma completo quando la scena è pronta).

## Lottie e Rive risolvono un problema che questo loader non ha

Lottie nasce per il motion design prodotto in un tool (After Effects + Bodymovin, oppure Lottie Creator) ed esportato come JSON o `.lottie` zippato ([airbnb/lottie-web](https://github.com/airbnb/lottie-web)). Le misure sui tarball npm del 25/11/2026 danno l'ordine di grandezza. **`lottie-web` 5.13.0 light (solo SVG, senza `eval`) pesa 46,4 kB gzip**, e la release precedente risale a due anni prima ([npm lottie-web](https://www.npmjs.com/package/lottie-web)). **`@lottiefiles/dotlottie-web` 0.83.2 pesa 31 kB gzip di JS più un WASM da 1,2 MB (~490 kB gzip)**, è ancora in 0.x e ha release quasi quotidiane ([npm dotlottie-web](https://www.npmjs.com/package/@lottiefiles/dotlottie-web)). LottieFiles conferma che nulla viene disegnato finché il motore WASM non è scaricato e compilato ([LottieFiles: How the web player works](https://docs.lottiefiles.com/en/runtimes/distributions/js/v0.x/core-concepts.md)). Per un loader che deve comparire _prima_ di una scena pesante è una regressione. In più il WASM andrebbe self-hostato nello standalone, che ha una quota disco limitata.

Il colore è il punto più scomodo. Il canvas di dotLottie non legge `currentColor` né le variabili CSS. Il colore per museo (generato a runtime da Leonardo) andrebbe letto con `getComputedStyle`, convertito in RGBA 0–1 e passato a `setColorSlot` a ogni cambio di museo o di schema colore, dopo aver predisposto gli slot nel file ([LottieFiles: Theming and slots](https://docs.lottiefiles.com/en/runtimes/distributions/native/v0.x/theming-and-slots)). `lottie-web` non ha nemmeno un'API colore. Si aggiungono il rendering solo client (`next/dynamic` con `ssr: false`, con l'SVG attuale che sopravvive come placeholder: Lottie aggiunge uno strato invece di toglierne uno), l'assenza di un supporto nativo a `prefers-reduced-motion` e diff git illeggibili. Il diff di un `.lottie` è binario, quello del JSON è un array annidato di vertici. Inoltre la geometria del `Landmark` verrebbe duplicata fuori da lucide e divergerebbe al primo ridisegno dell'icona.

Rive ha file più piccoli e macchine a stati: in un caso di studio lo stesso asset pesa circa 2 kB contro 24 kB in Lottie ([Callstack](https://callstack.com/blog/lottie-vs-rive-optimizing-mobile-app-animation)). Ma il runtime web va **da 222 kB (canvas-lite) a 648 kB (webgl2) brotli** ([Rive: runtime sizes](https://rive.app/docs/runtimes/runtime-sizes.md)). Le macchine a stati sono il suo punto di forza, e un loop a stato unico non le usa. Entrambi i player disegnano dal main thread. L'unica eccezione è `DotLottieWorker`, che sposta il rendering in un Web Worker con `OffscreenCanvas` ([LottieFiles: Web worker](https://docs.lottiefiles.com/en/runtimes/distributions/js/v0.x/advanced/web-worker.md)). È il solo vantaggio concreto che Lottie avrebbe qui, e conta solo se una traccia dimostra che il CSS si blocca davvero. Anche in quel caso il worker e il WASM vanno avviati durante lo stesso periodo di carico.

| Criterio                     | CSS attuale           | CSS rifattorizzato (`--i` + `@theme` + `motion-safe`) | Motion `useAnimate`           | Lottie / Rive                         |
| ---------------------------- | --------------------- | ----------------------------------------------------- | ----------------------------- | ------------------------------------- |
| Runtime aggiunto             | 0                     | 0                                                     | ~23 kB gzip (ibrido)          | 46–520 kB (Lottie), 222–648 kB (Rive) |
| Anima prima dell'idratazione | sì                    | sì                                                    | no                            | no                                    |
| Compositor (Chrome/Firefox)  | idoneo                | idoneo                                                | no per `scaleY`/`y` in 13.4.0 | no (main thread, salvo worker)        |
| `currentColor` per museo     | automatico            | automatico                                            | automatico                    | sync imperativo / assente             |
| Reduced motion               | media query           | `motion-safe:`                                        | `useReducedMotion` + ramo     | hook manuale                          |
| Stagger leggibile            | `nth-of-type` fragile | indice esplicito                                      | `stagger(0.12)`               | nel tool                              |
| Diff in revisione            | leggibile             | leggibile                                             | leggibile                     | binario/opaco                         |

## Safari è il vero limite, qualunque API si scelga

La scelta dell'API di authoring non cambia l'idoneità al compositor: CSS, Tailwind, WAAPI e Motion-con-`transform` producono tutti la stessa animazione di `transform`/`opacity`. Cambia invece il motore. **Chromium accelera le animazioni SVG dalla versione 89** ([Chrome for Developers](https://developer.chrome.com/blog/hardware-accelerated-animations)). Firefox esegue "la maggior parte" delle trasformazioni SVG sul compositor, tranne sotto un `viewBox` annidato ([Mozilla bug 779599](https://bugzilla.mozilla.org/show_bug.cgi?id=779599)). WebKit invece usa ancora il motore SVG legacy, che non ha ricevuto l'accelerazione dei transform data all'HTML. Il nuovo motore LBSE, che la abiliterebbe, a luglio 2026 "non è ancora il default" ([Igalia: LBSE](https://blogs.igalia.com/nzimmermann/posts/2026-07-14-lbse-conditional-layers/); [WebKit bug 258122](https://bugs.webkit.org/show_bug.cgi?id=258122)). Le note lo deducono: manca una dichiarazione esplicita di WebKit. Ne segue che su Safari le colonne con ogni probabilità animano sul main thread e possono scattare durante la build WebGPU, sia in CSS sia in Motion. Resta incerto anche se per Firefox la radice `<svg viewBox>` inline conti come "parent con viewBox".

La verifica costa poco: una traccia Performance di DevTools con un long task iniettato (per esempio un busy loop in una story Storybook), guardando l'insight sulle "non-composited animations". Se Safari stuttera in modo evidente, la soluzione strutturale è animare elementi HTML. Ogni colonna diventerebbe un proprio `<svg>` o `<div>` posizionato con `scaleY`, perché i transform HTML vanno sul compositor in tutti i motori. Si rinuncia però al singolo SVG lucide. Nessuna libreria risolve questo problema al posto tuo.

## La riscrittura consigliata: indice esplicito, token Tailwind, `motion-safe`

La raccomandazione è restare sul CSS e cambiarne tre cose. La prima: lo stagger diventa un dato visibile nel JSX (`--i` per colonna) invece di una posizione implicita nel markup. `animation-delay: calc(var(--i) * 120ms)` funziona ovunque oggi, e un `--i` statico non viene animato, quindi l'avvertimento sulle prestazioni delle variabili CSS animate non si applica ([Motion tier list](https://motion.dev/magazine/web-animation-performance-tier-list)). `sibling-index()` è ormai in tutti i motori (Chrome/Edge 138, Safari 26.2, Firefox 154, circa 86% di utilizzo globale) ma non è ancora Baseline ([caniuse](https://caniuse.com/wf-sibling-count)). Inoltre conta _tutti_ i fratelli, quindi richiederebbe di raggruppare le colonne in un `<g>`. La ricetta ufficiale di Chrome prevede proprio un fallback basato su una variabile ([Chrome: Creating a stagger animation](https://developer.chrome.com/docs/modern-web-guidance/guides/ui-behaviors/dynamic-sibling-animations)). Oggi quindi conviene `--i` da solo, e `sibling-index()` più avanti. La seconda: l'animazione diventa un token `--animate-*` in un blocco `@theme`, con i `@keyframes` annidati, così il nome dell'animazione compare sull'elemento ([Tailwind: animation](https://tailwindcss.com/docs/animation)). La terza: `motion-safe:` sostituisce il blocco `prefers-reduced-motion`, e senza animazione l'icona resta statica e completa, come oggi.

C'è un dettaglio che vale la pena capire. Il token va dichiarato in `@theme inline`, non in `@theme`. Con `@theme` Tailwind emette `:root { --animate-map-rise: … }` e l'utility usa `animation: var(--animate-map-rise)`. Una `var(--i)` dentro il valore verrebbe risolta su `:root`, dove `--i` non esiste, e tutte le colonne avrebbero ritardo 0. Con `inline` il valore viene copiato nell'utility, e `var(--i)` si risolve sul `<path>`. Questo ragionamento deriva dalle regole di sostituzione delle custom property e non dalle note: va verificato in Storybook. Il fallback sicuro è una regola scoped di una riga per il delay. Si evita invece l'arbitrary class `[animation-delay:calc(var(--i)*120ms)]`, perché AGENTS.md sconsiglia i `calc()` lunghi in Tailwind. Tailwind non ha un'utility `animation-delay`.

```css
/* globals.css: the museum map loader's motion (MapLoading.tsx). Each column
   reads its stagger from --i, set in JSX, so the order lives in data, not in
   :nth-of-type positions; `inline` resolves var(--i) on the element itself. */
@theme inline {
  --animate-map-rise: map-loading-rise 2.4s cubic-bezier(0.16, 1, 0.3, 1) calc(var(--i, 0) * 120ms)
    infinite backwards;
  --animate-map-settle: map-loading-settle 2.4s cubic-bezier(0.16, 1, 0.3, 1) 0.5s infinite
    backwards;

  @keyframes map-loading-rise {
    from {
      transform: scaleY(0);
    }
    30%,
    80% {
      transform: scaleY(1);
      opacity: 1;
    }
    to {
      opacity: 0;
    }
  }
  /* The pediment lifts off before the columns fade, so it is gone when the
     first column rises again. */
  @keyframes map-loading-settle {
    from,
    80%,
    to {
      transform: translateY(-3px);
      opacity: 0;
    }
    30%,
    60% {
      transform: translateY(0);
      opacity: 1;
    }
  }
}
```

```tsx
// MapLoading.tsx: lucide's Landmark split into parts; columns rise in --i order.
import type { CSSProperties } from 'react'

const COLUMNS = ['M6 18v-7', 'M10 18v-7', 'M14 18v-7', 'M18 18v-7']

// …inside the <svg>, unchanged attributes and currentColor:
<path d="M3 22h18" />
{COLUMNS.map((d, i) => (
  <path
    key={d}
    d={d}
    style={{ '--i': i } as CSSProperties}
    className="origin-bottom [transform-box:fill-box] motion-safe:animate-map-rise"
  />
))}
<path
  d="M11.119 2.205a2 2 0 0 1 1.762 0l7.84 3.846A.5.5 0 0 1 20.5 7h-17a.5.5 0 0 1-.22-.949z"
  className="[transform-box:fill-box] motion-safe:animate-map-settle"
/>
```

Il risultato elimina le tre regole `nth-of-type`, le classi `.map-loading-*` e il blocco reduced-motion. Restano due keyframe e due token, con l'ordine dello stagger visibile nel `map`. Il fill mode `backwards` resta necessario, perché tiene le colonne a `scaleY(0)` durante il ritardo ([LogRocket](https://blog.logrocket.com/css-staggered-animations/)). Con AGENTS.md vanno messi in conto gli Impeccable sui cambi UI e un controllo `run-story-tests` della story del loader, sia con reduced motion sia senza.

## Conclusione

La lezione generale è che "più astrazione" non significa meno carico cognitivo quando l'astrazione è costruita per un altro problema. Motion serve per animazioni interrompibili, guidate dallo stato, con spring o layout. Lottie e Rive servono per asset prodotti da un designer e per macchine a stati. Un loop fisso di cinque path è dichiarativo per natura, e la sua forma più chiara è quella dichiarativa, purché i dati (l'indice dello stagger) siano espliciti invece di codificati in selettori posizionali. Il confronto ha anche messo in luce un rischio più concreto della scelta di libreria: la documentazione di Motion promette un'accelerazione che il codice installato non fornisce. È un buon motivo per verificare il comportamento sul sorgente e con una traccia, invece di fidarsi della documentazione.

Il prossimo passo utile ha poco a che fare con l'API: serve una traccia Performance su Safari con il main thread occupato. Se il loader regge, la riscrittura qui sopra chiude la questione. Se scatta, la risposta è separare le colonne in elementi HTML, perché né Motion né Lottie risolverebbero il problema senza riscrivere anche la struttura. Il giorno in cui il loader dovrà chiudersi con eleganza quando la scena è pronta, `useAnimate` mini (3,3 kB, solo WAAPI) o un `AnimatePresence` sull'overlay diventeranno lo strumento giusto, sopra al CSS e non al suo posto.
