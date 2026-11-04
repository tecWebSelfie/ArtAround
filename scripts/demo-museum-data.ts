/**
 * Editorial data for `seed-demo-museum.ts`: the project's demo museum, a real
 * one as the course specification asks — the Pinacoteca Nazionale di Bologna —
 * laid out on the realistic 11-room map (`createRealisticMuseumMap`). The
 * floor plan is the generic demo map, not the gallery's real one; the works,
 * their Wikidata ids, inventory numbers and Commons images are real
 * (Wikidata, collection Q1103550, read on 2026-11-04).
 *
 * The data is dense enough to try every visitor feature: three tours of at
 * least ten works each (one with a quiz, for the synchronised class visit),
 * side contents for nearby suggestions, a paid content and children's texts.
 * Contents are written by the two author accounts the specification names
 * (`PROJECT_ACCOUNTS` in `src/seed-accounts.ts`).
 *
 * Positions are [x, z] in metres on that map (entrance at [15, 0], north =
 * +z). Each work stands on open floor beside a display of the map, never
 * inside it: routes snap their endpoints to the navmesh within 0.5 m.
 */

export const MUSEUM = {
  name: 'Pinacoteca Nazionale di Bologna',
  /** Wikidata item of the museum itself. */
  wikidataId: 'Q1103550',
  shortDescription: 'Bolognese painting from Giotto to Guercino.',
  descriptionHTML: `
<p>The Pinacoteca Nazionale di Bologna is the city's main picture gallery. It
was founded in the late eighteenth century to save the altarpieces of the
churches and convents suppressed in the Napoleonic years, and since 1885 it
has occupied the former Jesuit novitiate of Sant'Ignazio, beside the Academy
of Fine Arts.</p>
<p>Its rooms follow the history of painting in Bologna: the Gothic masters of
the fourteenth century, the Renaissance with Raphael's Saint Cecilia, and the
great seventeenth-century school of the Carracci, Guido Reni, Domenichino and
Guercino.</p>`,
  city: 'Bologna',
  address: 'Via delle Belle Arti 56',
  region: 'Emilia-Romagna',
  postalCode: '40126',
  // Payload point fields are [longitude, latitude].
  latlng: [11.3524, 44.4972] as [number, number],
  email: 'pin-bo@cultura.gov.it',
  ticketLabel: 'Full €10 · Reduced €2 (18–25) · Free under 18',
  ticketUrl: 'https://www.pinacotecabologna.beniculturali.it/',
  categories: ['arte-antica', 'arte-moderna'],
  news: [
    {
      title: 'The Saint Cecilia room reopens',
      content:
        'After the new lighting works, Raphael’s Ecstasy of Saint Cecilia is back on view with the Renaissance altarpieces around it.',
      date: '2026-10-01T09:00:00.000Z',
    },
    {
      title: 'First Sunday of the month: free entry',
      content: 'State museums are free on the first Sunday of every month.',
      date: '2026-09-15T09:00:00.000Z',
    },
  ],
}

type Difficulty = 'easy' | 'medium' | 'hard'

/** Username of the content's author, one of the two author accounts. */
export type DemoAuthor = 'autore1' | 'autore2'

export type DemoContent = {
  title: string
  bodyHTML: string
  difficulty: Difficulty
  author: DemoAuthor
  audience?: 'everyone' | 'children'
  /** Euro cents; leaves the body locked for visitors who haven't bought it. */
  price?: number
  sources?: { label: string; url?: string }[]
}

export type DemoObject = {
  /** Stable key: map item id and tour references. */
  key: string
  name: string
  /** The work's Wikidata item: its universal identifier. */
  wikidataId: string
  /** The museum's own inventory number, when Wikidata records it. */
  inventoryNumber?: string
  artist: string
  dating: string
  description: string
  provenance: string
  condition: { state: 'excellent' | 'good' | 'fair' | 'poor' | 'restoration'; notes?: string }
  creditLine: string
  rights: string
  /** Wikimedia Commons file name of a photo of the work (public domain painting). */
  image: string
  categories: string[]
  position: [number, number]
  /** Ordered; the first one is the object's main text. */
  contents: DemoContent[]
}

const wikipedia = (title: string) => ({
  label: `Wikipedia: ${title.replaceAll('_', ' ')}`,
  url: `https://it.wikipedia.org/wiki/${title}`,
})
const RIGHTS = 'Public domain (painting); photo from Wikimedia Commons'
const GOTHIC = ['arte-antica']
const MODERN = ['arte-moderna']

export const OBJECTS: DemoObject[] = [
  // --- West wing: the Gothic and early Renaissance rooms ---
  {
    key: 'giotto',
    name: 'Bologna Polyptych',
    wikidataId: 'Q3907499',
    inventoryNumber: '284',
    artist: 'Giotto',
    dating: 'c. 1330–1335',
    description:
      'Five gilded panels: the Virgin and Child enthroned between Saints Peter and Paul and the archangels Gabriel and Michael, with saints in the predella.',
    provenance: 'Painted for the church of Santa Maria degli Angeli in Bologna.',
    condition: { state: 'good', notes: 'Original frame partly lost; gold ground worn in places.' },
    creditLine: 'Tempera and gold on panel',
    rights: RIGHTS,
    image: 'Giotto. Polyptych. 1330-35. 91x340cm. Pinacoteca, Bologna..jpg',
    categories: GOTHIC,
    position: [2.5, 11.3],
    contents: [
      {
        title: 'Giotto signs his name',
        difficulty: 'medium',
        author: 'autore1',
        bodyHTML: `
<p>Look at the base of the central panel: the inscription reads
<em>Opus Magistri Iocti de Florentia</em>, "the work of Master Giotto of
Florence". A signature was rare in the fourteenth century, and here it works
almost like a brand: Giotto ran a large workshop, and his name guaranteed the
quality of what came out of it.</p>
<p>Compared with older gold-ground altarpieces, the figures have weight. The
Virgin sits on a throne that recedes into space, and the saints turn towards
her as if they stood in the same room.</p>`,
        sources: [wikipedia('Polittico_di_Bologna')],
      },
    ],
  },
  {
    key: 'vitale',
    name: 'Saint George and the Dragon',
    wikidataId: 'Q27345212',
    inventoryNumber: '6394',
    artist: 'Vitale da Bologna',
    dating: 'c. 1330–1335',
    description:
      'Saint George on a rearing white horse drives his lance into the dragon while the princess escapes behind him.',
    provenance: 'From a Bolognese church; in the gallery since the nineteenth century.',
    condition: { state: 'good' },
    creditLine: 'Tempera on panel',
    rights: RIGHTS,
    image: 'Vitale da bologna, san giorgio libera la principessa, 1330-35 ca., 01.jpg',
    categories: GOTHIC,
    position: [5.5, 11.3],
    contents: [
      {
        title: 'A knight in motion',
        difficulty: 'easy',
        author: 'autore2',
        bodyHTML: `
<p>Few Gothic paintings move like this one. The horse twists its neck, the
saint leans back to strike, his cloak flies out behind him: Vitale da Bologna
builds the whole scene on diagonal lines, so the eye never rests.</p>
<p>Vitale was the leading painter of fourteenth-century Bologna. Where Giotto,
in the next panel, aims at calm and solid figures, Vitale prefers energy,
bright colour and drama.</p>`,
        sources: [wikipedia('Vitale_da_Bologna')],
      },
      {
        title: 'Find the dragon’s tail',
        difficulty: 'easy',
        audience: 'children',
        author: 'autore2',
        bodyHTML: `
<p>The dragon is hiding a long, curly tail. Can you follow it with your finger
in the air, from its head to the very tip?</p>
<p>Now look at the horse: is it calm or scared? Try to make the same face!</p>`,
      },
    ],
  },
  {
    key: 'cossa',
    name: 'Merchants’ Altarpiece',
    wikidataId: 'Q3889219',
    artist: 'Francesco del Cossa',
    dating: '1474',
    description:
      'The Virgin and Child enthroned between Saint Petronius and Saint John the Evangelist, with the kneeling donor.',
    provenance: 'Commissioned by the Foro dei Mercanti, the merchants’ court of Bologna.',
    condition: { state: 'good' },
    creditLine: 'Tempera on panel',
    rights: RIGHTS,
    image: 'Francesco del Cossa 025.jpg',
    categories: GOTHIC,
    position: [8.5, 11.3],
    contents: [
      {
        title: 'A painting for the merchants',
        difficulty: 'medium',
        author: 'autore1',
        bodyHTML: `
<p>The merchants' court of Bologna judged trade disputes, and in 1474 it
ordered this altarpiece from Francesco del Cossa, a painter trained in
Ferrara. Saint Petronius, the city's patron, holds a model of Bologna: the
picture is as much about civic pride as about devotion.</p>
<p>Notice how sharp everything is: the folds of the robes look carved, the
architecture of the throne is drawn with a ruler. This hard, metallic style is
typical of the Ferrarese school.</p>`,
        sources: [wikipedia('Pala_dei_Mercanti')],
      },
    ],
  },
  {
    key: 'francia',
    name: 'Bentivoglio Altarpiece',
    wikidataId: 'Q16038421',
    inventoryNumber: '584',
    artist: 'Francesco Francia',
    dating: '1498',
    description: 'Altarpiece by Francesco Francia for the Bentivoglio, the lords of Bologna.',
    provenance: 'Painted for the family of Giovanni II Bentivoglio.',
    condition: { state: 'good' },
    creditLine: 'Oil on panel',
    rights: RIGHTS,
    image: 'Francesco Francia - Adoration of the Child - WGA08169.jpg',
    categories: GOTHIC,
    position: [3, 18.7],
    contents: [
      {
        title: 'The goldsmith who became a painter',
        difficulty: 'medium',
        author: 'autore2',
        bodyHTML: `
<p>Francesco Francia began as a goldsmith and medal maker and directed the
mint of Bologna under the Bentivoglio, the family that ruled the city at the
end of the fifteenth century. Only later did he turn to painting, and he
became the favourite painter of the court.</p>
<p>His figures are soft and calm, his landscapes clear and open: a gentle
style close to Perugino's, which you will meet in the next room.</p>`,
        sources: [wikipedia('Francesco_Francia')],
      },
    ],
  },
  {
    key: 'perugino',
    name: 'Madonna in Glory with Saints',
    wikidataId: 'Q3213771',
    inventoryNumber: '579',
    artist: 'Perugino',
    dating: 'c. 1500',
    description:
      'The Virgin in a mandorla of cherubs above four saints: Michael, Catherine of Alexandria, Apollonia and John the Evangelist.',
    provenance: 'From the church of San Giovanni in Monte, Bologna.',
    condition: { state: 'good' },
    creditLine: 'Oil on panel',
    rights: RIGHTS,
    image: 'Pietro Perugino cat59.jpg',
    categories: GOTHIC,
    position: [8, 18.7],
    contents: [
      {
        title: 'Heaven above, saints below',
        difficulty: 'easy',
        author: 'autore1',
        bodyHTML: `
<p>The picture is split in two. Above, the Virgin floats in an almond-shaped
glory of red cherubs; below, four saints stand on the ground in a quiet
landscape. Each one holds the sign that lets you recognise them: Michael his
sword, Catherine her wheel, Apollonia the pincers of her martyrdom.</p>
<p>Perugino repeated this balanced scheme in many altarpieces. His pupil
Raphael learnt it from him, then went further: compare it with the Saint
Cecilia nearby.</p>`,
        sources: [wikipedia('Madonna_in_gloria_e_santi_(Perugino_Bologna)')],
      },
    ],
  },
  {
    key: 'raphael',
    name: 'Ecstasy of Saint Cecilia',
    wikidataId: 'Q1103801',
    inventoryNumber: '577',
    artist: 'Raphael',
    dating: 'c. 1514–1516',
    description:
      'Saint Cecilia listens to the angels singing above her, between Saints Paul, John the Evangelist, Augustine and Mary Magdalene.',
    provenance:
      'Painted for the chapel of Elena Duglioli dall’Olio in San Giovanni in Monte; taken to Paris in 1798 and returned in 1815.',
    condition: { state: 'good', notes: 'Transferred from panel to canvas in Paris.' },
    creditLine: 'Oil on canvas (transferred from panel)',
    rights: RIGHTS,
    image:
      'Bologna Pinacoteca Nazionale - Rafaël Santi (1483-1520) - Heilige Cecilia in extase met Paulus, Johannes (evangelist), Augustinus en Maria Magdalena - 26-04-2012 9-13-18.jpg',
    categories: GOTHIC,
    position: [9.8, 22.8],
    contents: [
      {
        title: 'Music of heaven, music of earth',
        difficulty: 'medium',
        author: 'autore1',
        bodyHTML: `
<p>Saint Cecilia, patron of music, lowers the small organ she holds and looks
up: a choir of angels is singing in the clouds. At her feet lie broken and
discarded instruments — viols, a tambourine, cymbals. Earthly music falls
silent before the music of heaven.</p>
<p>Raphael sent the altarpiece from Rome to Bologna for a local noblewoman,
Elena Duglioli dall'Olio. Napoleon's troops took it to Paris in 1798, where it
was moved from its wooden panel onto canvas; it came back in 1815.</p>`,
        sources: [wikipedia('Estasi_di_santa_Cecilia')],
      },
      {
        title: 'Five saints, five ways of listening',
        difficulty: 'hard',
        author: 'autore1',
        price: 299,
        bodyHTML: `
<p>Each figure reacts differently to the vision. Paul, leaning on his sword,
looks down in meditation; John and Augustine exchange a glance; Mary Magdalene
turns towards us, holding her jar of ointment, and is the only one who seems
to ignore the angels.</p>
<p>Raphael uses the semicircle of saints to lead the eye to Cecilia, the only
figure who looks up. The composition shows how far he had moved from
Perugino's symmetry: the saints are no longer lined up, they form a living
group around a single moment.</p>`,
        sources: [wikipedia('Estasi_di_santa_Cecilia')],
      },
    ],
  },
  // --- North rooms: Mannerism and Venice ---
  {
    key: 'parmigianino',
    name: 'Madonna of Saint Margaret',
    wikidataId: 'Q3842737',
    artist: 'Parmigianino',
    dating: 'c. 1529–1530',
    description:
      'The Virgin and Child with Saints Margaret, Jerome, Petronius and the archangel Michael.',
    provenance: 'Painted for the Benedictine nuns of Santa Margherita in Bologna.',
    condition: { state: 'good' },
    creditLine: 'Oil on panel',
    rights: RIGHTS,
    image:
      'Parmigianino - Madonna and Child with Saints Margaret, Jerome, Petronius and Michael.jpg',
    categories: GOTHIC,
    position: [12.6, 22.6],
    contents: [
      {
        title: 'Elegance stretched to the limit',
        difficulty: 'hard',
        author: 'autore2',
        bodyHTML: `
<p>Parmigianino, from Parma, painted this altarpiece during his years in
Bologna. The bodies are long and supple, the hands slender, the poses
twisting: this deliberate stretching of proportions is the hallmark of the
style later called Mannerism.</p>
<p>At the centre, the Child leans towards Saint Margaret and their faces almost
touch. The intimacy of that exchange, rather than a solemn display of saints,
is what the picture is about.</p>`,
        sources: [wikipedia('Madonna_di_santa_Margherita')],
      },
    ],
  },
  {
    key: 'titian',
    name: 'Christ and the Good Thief',
    wikidataId: 'Q60840797',
    inventoryNumber: '521',
    artist: 'Titian',
    dating: 'c. 1566',
    description: 'Christ on the cross turns towards the repentant thief crucified beside him.',
    provenance: 'Entered the gallery from a Bolognese collection.',
    condition: { state: 'fair', notes: 'Darkened varnish.' },
    creditLine: 'Oil on canvas',
    rights: RIGHTS,
    image: 'Titian - Christ and the Good Thief - WGA22832.jpg',
    categories: GOTHIC,
    position: [15, 19.6],
    contents: [
      {
        title: 'Painting with the fingers',
        difficulty: 'medium',
        author: 'autore2',
        bodyHTML: `
<p>This is a late work by Titian, the great Venetian painter, made when he was
over seventy. Look closely: the outlines dissolve, the paint is laid in rough
strokes, in places probably spread with the fingers.</p>
<p>The subject is a promise. The good thief asks Christ to remember him, and
Christ turns his head towards him in the dark sky. The whole drama lives in
that small movement.</p>`,
        sources: [wikipedia('Cristo_e_il_buon_ladrone_(Tiziano)')],
      },
    ],
  },
  // --- Central court: the Carracci ---
  {
    key: 'ludovico',
    name: 'Bargellini Madonna',
    wikidataId: 'Q131405243',
    inventoryNumber: '578',
    artist: 'Ludovico Carracci',
    dating: '1588',
    description: 'The Virgin and Child enthroned among saints, painted for the Bargellini family.',
    provenance: 'Commissioned by the Bargellini family of Bologna.',
    condition: { state: 'good' },
    creditLine: 'Oil on canvas',
    rights: RIGHTS,
    image: 'Carracci Ludovico Madonna Bargellini.jpg',
    categories: MODERN,
    position: [15, 11.6],
    contents: [
      {
        title: 'Back to nature',
        difficulty: 'medium',
        author: 'autore1',
        bodyHTML: `
<p>Around 1582 Ludovico Carracci and his cousins Agostino and Annibale opened
an academy in Bologna, later called the Accademia degli Incamminati. They
taught drawing from life: real bodies, real light, instead of the artificial
poses of late Mannerism.</p>
<p>This altarpiece shows what that meant. The saints look like people you
could meet, the light is warm and natural, and the Virgin is approachable
rather than remote.</p>`,
        sources: [wikipedia('Ludovico_Carracci')],
      },
    ],
  },
  {
    key: 'agostino',
    name: 'Last Communion of Saint Jerome',
    wikidataId: 'Q3685503',
    inventoryNumber: '461',
    artist: 'Agostino Carracci',
    dating: 'c. 1592–1594',
    description: 'The dying Saint Jerome, held up by his followers, receives his last communion.',
    provenance: 'Painted for the Certosa (Charterhouse) of Bologna.',
    condition: { state: 'good' },
    creditLine: 'Oil on canvas',
    rights: RIGHTS,
    image: 'Agostino carracci ultima comunione san girolamo pinacoteca nazionale bologna.png',
    categories: MODERN,
    position: [12.6, 14.4],
    contents: [
      {
        title: 'An old man’s last morning',
        difficulty: 'medium',
        author: 'autore2',
        bodyHTML: `
<p>Saint Jerome, the scholar who translated the Bible into Latin, is so weak
that he must be held up to receive communion. Agostino Carracci paints his
thin body and trembling hands without idealising them.</p>
<p>The picture became famous a generation later, when Domenichino painted the
same subject for a church in Rome and was accused of copying it: the
composition of the two works is strikingly close.</p>`,
        sources: [wikipedia('Comunione_di_san_Girolamo_(Agostino_Carracci)')],
      },
    ],
  },
  // --- East wing: the seventeenth century ---
  {
    key: 'annibale',
    name: 'Madonna Enthroned with Saints John the Baptist, John the Evangelist and Catherine',
    wikidataId: 'Q19966583',
    inventoryNumber: '476',
    artist: 'Annibale Carracci',
    dating: '1593',
    description:
      'The Virgin and Child enthroned with the young John the Baptist, John the Evangelist and Catherine of Alexandria.',
    provenance: 'From the church of San Giorgio in Poggiale, Bologna.',
    condition: { state: 'good' },
    creditLine: 'Oil on canvas',
    rights: RIGHTS,
    image: 'Annibale Carracci Pala di san Giorgio.jpg',
    categories: MODERN,
    position: [20.8, 11],
    contents: [
      {
        title: 'Before Rome',
        difficulty: 'medium',
        author: 'autore1',
        bodyHTML: `
<p>Annibale was the most gifted of the three Carracci. This altarpiece, among
the last he painted in Bologna, already has the grandeur of his Roman works:
two years later he left for Rome to decorate the Farnese Gallery, one of the
founding works of Baroque painting.</p>
<p>The figures are monumental, yet their gestures are natural: the young
Baptist points at the Child, Catherine rests her hand on her wheel. Annibale
blends Venetian colour with the clear design of Raphael.</p>`,
        sources: [wikipedia('Annibale_Carracci')],
      },
    ],
  },
  {
    key: 'reni-innocents',
    name: 'Massacre of the Innocents',
    wikidataId: 'Q2448678',
    inventoryNumber: '439',
    artist: 'Guido Reni',
    dating: '1611',
    description:
      'Herod’s soldiers kill the children of Bethlehem while the mothers scream, flee and mourn.',
    provenance: 'Painted for the Berò chapel in the church of San Domenico, Bologna.',
    condition: { state: 'good' },
    creditLine: 'Oil on canvas',
    rights: RIGHTS,
    image: 'Guido Reni - Massacre of the Innocents - Pinacoteca Nazionale Bologna.jpg',
    categories: MODERN,
    position: [28.8, 10.8],
    contents: [
      {
        title: 'Horror in perfect order',
        difficulty: 'hard',
        author: 'autore2',
        bodyHTML: `
<p>The subject is one of the most violent in the Bible, yet the picture is
built like a classical relief. Two soldiers form a triangle at the top, the
mothers fan out around them, two dead children lie at the bottom in a calm
row. The geometry holds the chaos together.</p>
<p>The screaming woman at the top left quotes ancient sculpture and Raphael.
Reni's idea was that beauty and order could make suffering bearable to look
at — and more moving for it.</p>`,
        sources: [wikipedia('Strage_degli_innocenti_(Reni)')],
      },
      {
        title: 'Count the mothers',
        difficulty: 'easy',
        audience: 'children',
        author: 'autore2',
        bodyHTML: `
<p>This is a sad story: a cruel king wanted to get rid of all the babies of a
town. The mothers are trying to protect them.</p>
<p>How many mothers can you count? Look at their hands: what is each of them
doing?</p>`,
      },
    ],
  },
  {
    key: 'reni-plague',
    name: 'Plague Banner (Pallione del Voto)',
    wikidataId: 'Q25217589',
    inventoryNumber: '448',
    artist: 'Guido Reni',
    dating: '1630',
    description:
      'The Virgin and Child in glory above the patron saints of Bologna, with a view of the city at the bottom.',
    provenance:
      'Painted on silk as a processional banner, vowed by the city during the plague of 1630.',
    condition: { state: 'fair', notes: 'Silk support; light exposure kept low.' },
    creditLine: 'Oil on silk',
    rights: RIGHTS,
    image: 'Guido Reni 061.jpg',
    categories: MODERN,
    position: [28.8, 13.4],
    contents: [
      {
        title: 'A city asks for help',
        difficulty: 'medium',
        author: 'autore1',
        bodyHTML: `
<p>In 1630 the plague struck Bologna. The city made a vow and asked Guido Reni
for a banner to carry in procession: the Virgin in glory above the city's
protector saints, who pray for the people below.</p>
<p>At the bottom you can see Bologna itself, with its walls and towers. The
banner was painted on silk so that it could be carried through the streets,
which is why it is so light and so fragile.</p>`,
        sources: [wikipedia('Pallione_del_Voto')],
      },
    ],
  },
  {
    key: 'reni-mother',
    name: 'Portrait of the Artist’s Mother',
    wikidataId: 'Q122831858',
    inventoryNumber: '338',
    artist: 'Guido Reni',
    dating: 'c. 1609–1612',
    description: 'An elderly woman in a dark dress and white headscarf, seen half-length.',
    provenance: 'Entered the gallery from a Bolognese collection.',
    condition: { state: 'good' },
    creditLine: 'Oil on canvas',
    rights: RIGHTS,
    image: "Guido Reni - Portrait of the Artist's Mother - WGA19291.jpg",
    categories: MODERN,
    position: [28.8, 18],
    contents: [
      {
        title: 'A rare private picture',
        difficulty: 'easy',
        author: 'autore2',
        bodyHTML: `
<p>Guido Reni painted saints and gods all his life, and very few portraits.
This one is of his own mother, to whom he was deeply attached.</p>
<p>There is no idealisation here: the wrinkles, the tired eyes, the plain
clothes are painted with care and affection. Beside his grand altarpieces, it
shows a quieter, more personal side of the painter.</p>`,
        sources: [wikipedia('Guido_Reni')],
      },
    ],
  },
  {
    key: 'domenichino',
    name: 'Martyrdom of Saint Agnes',
    wikidataId: 'Q132147993',
    artist: 'Domenichino',
    dating: 'c. 1621–1625',
    description:
      'Saint Agnes is killed by a soldier while angels bring her the palm and crown of martyrdom.',
    provenance: 'Painted for the church of Sant’Agnese in Bologna.',
    condition: { state: 'good' },
    creditLine: 'Oil on canvas',
    rights: RIGHTS,
    image: "Domenico Zampieri detto il Domenichino, Martirio di Sant'Agnese (1621-1625) 01.jpg",
    categories: MODERN,
    position: [28.8, 21],
    contents: [
      {
        title: 'Two stories on one canvas',
        difficulty: 'medium',
        author: 'autore1',
        bodyHTML: `
<p>The lower half shows the cruelty of the world: Agnes, a young Roman girl,
is put to death while the crowd watches. The upper half opens onto heaven,
where Christ and the angels wait with the palm and the crown of the martyrs.</p>
<p>Domenichino, a pupil of the Carracci, liked clear stories that anyone could
read. Every gesture in the crowd — fear, pity, curiosity — is a different
reaction to the same event.</p>`,
        sources: [wikipedia('Domenichino')],
      },
    ],
  },
  {
    key: 'guercino',
    name: 'Saint William of Aquitaine Receiving the Habit',
    wikidataId: 'Q133857694',
    inventoryNumber: '478',
    artist: 'Guercino',
    dating: '1620',
    description:
      'The duke William of Aquitaine kneels, his armour on the ground, to receive the monk’s habit.',
    provenance: 'Painted for the church of San Gregorio in Bologna.',
    condition: { state: 'good' },
    creditLine: 'Oil on canvas',
    rights: RIGHTS,
    image: "Vestizione di san Guglielmo d'Aquitania.jpg",
    categories: MODERN,
    position: [21, 22.8],
    contents: [
      {
        title: 'From armour to habit',
        difficulty: 'medium',
        author: 'autore2',
        bodyHTML: `
<p>William, duke of Aquitaine, gives up power and war to become a monk. Look at
the floor: his helmet and armour lie abandoned, while a bishop dresses him in
the plain habit.</p>
<p>Guercino, "the squinter", came from Cento near Bologna. His strong contrasts
of light and shadow and his warm, broken colour make the scene feel
immediate, almost like a moment caught in a real church.</p>`,
        sources: [wikipedia('Guercino')],
      },
    ],
  },
]

/** Content titles in visiting order; the tour's museum is the seeded one. */
export const TOURS = [
  {
    title: 'Masterpieces of the Pinacoteca',
    description: 'Twelve works, from Giotto to Guercino.',
    durationMinutes: 75,
    wheelchairAccessible: true,
    categories: ['arte-antica', 'arte-moderna'],
    bodyHTML: `<p>The essential visit: five centuries of painting in Bologna, from the
gold grounds of the fourteenth century to the great altarpieces of the
seventeenth. This is also the tour for class visits, with a final quiz.</p>`,
    stops: [
      'Giotto signs his name',
      'A knight in motion',
      'A painting for the merchants',
      'Heaven above, saints below',
      'Music of heaven, music of earth',
      'Elegance stretched to the limit',
      'Painting with the fingers',
      'Back to nature',
      'Before Rome',
      'Horror in perfect order',
      'Two stories on one canvas',
      'From armour to habit',
    ],
    quiz: [
      {
        prompt: 'Who wrote his name on the Bologna Polyptych?',
        correctAnswer: 'Giotto',
        wrong: ['Vitale da Bologna', 'Raphael', 'Guido Reni'],
      },
      {
        prompt: 'What lies at Saint Cecilia’s feet in Raphael’s painting?',
        correctAnswer: 'Broken musical instruments',
        wrong: ['A sword', 'A model of Bologna', 'A crown of flowers'],
      },
      {
        prompt: 'What did the Carracci teach in their academy?',
        correctAnswer: 'Drawing from life',
        wrong: ['Goldsmith work', 'Sculpture in marble', 'Fresco restoration'],
      },
      {
        prompt: 'What has Saint William left on the floor in Guercino’s painting?',
        correctAnswer: 'His armour',
        wrong: ['His crown', 'A book', 'A musical instrument'],
      },
    ],
  },
  {
    title: 'From gold grounds to Raphael',
    description: 'Gothic and Renaissance Bologna in ten works.',
    durationMinutes: 50,
    wheelchairAccessible: true,
    categories: ['arte-antica'],
    bodyHTML: `<p>How painting in Bologna changed between the fourteenth and the
sixteenth century: from Giotto's gold to Raphael's saints and Parmigianino's
elegance, ending with the Carracci who reacted against it.</p>`,
    stops: [
      'Giotto signs his name',
      'A knight in motion',
      'A painting for the merchants',
      'The goldsmith who became a painter',
      'Heaven above, saints below',
      'Music of heaven, music of earth',
      'Elegance stretched to the limit',
      'Painting with the fingers',
      'Back to nature',
      'An old man’s last morning',
    ],
    quiz: [],
  },
  {
    title: 'The Carracci and their heirs',
    description: 'The Bolognese school of the seventeenth century.',
    durationMinutes: 50,
    wheelchairAccessible: true,
    categories: ['arte-moderna'],
    bodyHTML: `<p>Around 1582 three cousins founded an academy that changed European
painting. Follow the Carracci, then their pupils and heirs: Guido Reni,
Domenichino and Guercino.</p>`,
    stops: [
      'Elegance stretched to the limit',
      'Back to nature',
      'An old man’s last morning',
      'Before Rome',
      'Horror in perfect order',
      'A city asks for help',
      'A rare private picture',
      'Two stories on one canvas',
      'From armour to habit',
      'Painting with the fingers',
    ],
    quiz: [],
  },
]
