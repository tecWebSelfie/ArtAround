/**
 * Editorial data for `seed-demo-museum.ts`: a fictional civic museum laid out
 * on the realistic 11-room map (`createRealisticMuseumMap`), dense enough to
 * try tour navigation as a visitor would — several rooms per tour, side
 * contents for nearby suggestions, a paid content, children's texts and a
 * wheelchair route.
 *
 * Positions are [x, z] in metres on that map (entrance at [15, 0], north =
 * +z). Each object stands on open floor beside the display it labels (case,
 * pedestal or painting from the map), never inside it: routes snap their
 * endpoints to the navmesh within 0.5 m.
 */

export const MUSEUM = {
  name: 'Museo Civico di Villaforte',
  shortDescription: 'Archaeology, sculpture and painting in a 16th-century palazzo.',
  descriptionHTML: `
<p>The Museo Civico di Villaforte occupies Palazzo Forte, a merchant's residence
rebuilt around a central courtyard in 1548. Its collections grew from the
excavations on the Colle della Rocca in the 1880s and from the donations of
local families, and now run from Etruscan bronzes to twentieth-century painting.</p>
<p>The visit starts in the foyer and follows a ring of rooms around the
Sculpture Court: archaeology and sculpture in the west wing, temporary
exhibitions to the north, Italian painting and modern art in the east wing.
The whole ground floor is step-free.</p>`,
  city: 'Bologna',
  address: 'Via Castiglione 41',
  region: 'Emilia-Romagna',
  postalCode: '40124',
  // Payload point fields are [longitude, latitude].
  latlng: [11.3478, 44.4905] as [number, number],
  email: 'info@museovillaforte.example',
  ticketLabel: 'Full €9 · Reduced €5 · Free under 18',
  categories: ['archeologia', 'arte-antica', 'arte-moderna'],
  news: [
    {
      title: 'Seeing in the dark: Etruscan mirrors',
      content:
        'The temporary exhibition room hosts twelve engraved mirrors on loan until March, shown with raking light.',
      date: '2026-10-01T09:00:00.000Z',
    },
    {
      title: 'Thursday evenings',
      content: 'Every Thursday the museum stays open until 22:00, with a free guided tour at 20:30.',
      date: '2026-09-15T09:00:00.000Z',
    },
  ],
}

type Difficulty = 'easy' | 'medium' | 'hard'

export type DemoContent = {
  title: string
  bodyHTML: string
  difficulty: Difficulty
  audience?: 'everyone' | 'children'
  /** Euro cents; leaves the body locked for visitors who haven't bought it. */
  price?: number
  sources?: { label: string; url?: string }[]
}

export type DemoObject = {
  /** Stable key: map item id and tour references. */
  key: string
  name: string
  artist?: string
  dating: string
  description: string
  provenance: string
  condition: { state: 'excellent' | 'good' | 'fair' | 'poor' | 'restoration'; notes?: string }
  creditLine: string
  rights: string
  categories: string[]
  position: [number, number]
  /** Ordered; the first one is the object's main text. */
  contents: DemoContent[]
}

const copyright = '© Museo Civico di Villaforte'

export const OBJECTS: DemoObject[] = [
  // --- 02 Foyer and ticket office ---
  {
    key: 'model',
    name: 'Model of Palazzo Forte',
    artist: 'Studio Bassi, Villaforte',
    dating: '1998',
    description:
      'Limewood and card model of the palazzo at 1:50, showing the courtyard, the two wings and the 1548 loggia.',
    provenance: 'Commissioned by the museum for the reopening of 1999.',
    condition: { state: 'good', notes: 'Loggia columns reglued in 2019.' },
    creditLine: 'Museum commission, 1998',
    rights: 'CC BY 4.0',
    categories: [],
    position: [10, 4.8],
    contents: [
      {
        title: 'A merchant’s house around a courtyard',
        difficulty: 'easy',
        bodyHTML: `
<p>Before you enter the galleries, look at the palazzo from above. The wool
merchant Giovan Battista Forte bought two medieval houses in 1541 and joined
them around an open courtyard, the space you will walk around today.</p>
<h2>How the visit works</h2>
<p>The rooms form a ring around the Sculpture Court. Archaeology and sculpture
fill the west wing; Italian painting and modern art the east wing; the room to
the north hosts temporary exhibitions. Every room has a doorway onto the next,
so you never have to retrace your steps.</p>`,
        sources: [{ label: 'R. Bassi, Palazzo Forte: un cantiere del Cinquecento, 1997' }],
      },
    ],
  },
  // --- 06 Archaeology (display cases along z = 12.5) ---
  {
    key: 'krater',
    name: 'Red-figure calyx krater',
    artist: 'Painter of the Villaforte Symposium',
    dating: 'c. 430 BC',
    description:
      'Attic wine-mixing bowl showing a banquet: five reclining men, a flute player and a boy carrying a ladle.',
    provenance: 'Excavated in tomb 14 of the Colle della Rocca necropolis, 1887.',
    condition: { state: 'good', notes: 'Recomposed from 38 fragments; the left handle is a 1950s integration.' },
    creditLine: 'Rocca excavations, 1887',
    rights: 'Public domain (object); photo CC BY-SA 4.0',
    categories: ['archeologia', 'arte-antica'],
    position: [2.5, 11.3],
    contents: [
      {
        title: 'A party in a tomb',
        difficulty: 'medium',
        bodyHTML: `
<p>A krater was the centrepiece of a Greek drinking party, the symposium: wine
was never drunk neat but mixed with water in a bowl like this one, then ladled
into cups. The scene painted on it shows exactly that moment.</p>
<p>Why did it end up in an Etruscan tomb in Villaforte? Athenian pottery was a
luxury import for Etruscan families, who adopted the banquet as a sign of
status and took it with them into the afterlife.</p>`,
        sources: [
          { label: 'Beazley Archive Pottery Database', url: 'https://www.beazley.ox.ac.uk/' },
        ],
      },
      {
        title: 'How red-figure painting was made',
        difficulty: 'hard',
        price: 299,
        bodyHTML: `
<p>Red-figure painters worked in reverse: they left the figures in the colour of
the clay and painted the background black with a refined slip. Fine relief
lines, raised like threads, drew the muscles and folds of the clothes.</p>
<h2>Three firings in one</h2>
<p>The black is not paint but clay that turned black and glassy in a
three-stage firing — oxidising, reducing, then oxidising again — which only a
skilled potter could control.</p>`,
        sources: [{ label: 'J. Boardman, Athenian Red Figure Vases: The Classical Period' }],
      },
      {
        title: 'The krater: a giant mixing bowl',
        difficulty: 'easy',
        audience: 'children',
        bodyHTML: `
<p>This big bowl is 2,400 years old! At parties, Greeks poured wine and water in
it and mixed them, a bit like a huge punch bowl.</p>
<p>Can you find the boy with the ladle? He is the one who filled everyone’s cup.
Count the guests lying on their couches: how many are there?</p>`,
      },
    ],
  },
  {
    key: 'mirror',
    name: 'Engraved bronze mirror with Turan',
    dating: 'Late 4th century BC',
    description:
      'Etruscan hand mirror; the back is engraved with Turan, goddess of love, adorning a young woman.',
    provenance: 'Rocca necropolis, tomb 22; acquired from the Guidi collection in 1903.',
    condition: { state: 'fair', notes: 'Green corrosion on the rim; the reflecting side is no longer polished.' },
    creditLine: 'Guidi collection, 1903',
    rights: 'Public domain (object)',
    categories: ['archeologia', 'arte-antica'],
    position: [5.5, 11.3],
    contents: [
      {
        title: 'Turan’s mirror',
        difficulty: 'medium',
        bodyHTML: `
<p>The front of this mirror was once polished bronze, bright enough to see your
face in. The back carries the real treasure: a scene drawn with a fine point,
where the goddess Turan adjusts the jewellery of a young bride.</p>
<p>Names are written beside the figures, right to left, in the Etruscan
alphabet. Mirrors like this were wedding gifts and were buried with women.</p>`,
        sources: [{ label: 'Corpus Speculorum Etruscorum, Italia 4' }],
      },
    ],
  },
  {
    key: 'lamps',
    name: 'Group of Roman oil lamps',
    dating: '1st–3rd century AD',
    description:
      'Eleven mould-made terracotta lamps with gladiators, a ship, a dolphin and the maker’s stamp FORTIS.',
    provenance: 'Found during the building of the railway station, 1872.',
    condition: { state: 'excellent' },
    creditLine: 'Municipal excavations, 1872',
    rights: 'Public domain (object)',
    categories: ['archeologia'],
    position: [8.5, 11.3],
    contents: [
      {
        title: 'Light by the thousand',
        difficulty: 'easy',
        bodyHTML: `
<p>Every Roman home burned olive oil for light, and lamps were made by the
million in two-part moulds. Turn your eyes to the bottom of the case: the
stamp FORTIS belongs to a workshop near Modena whose lamps travelled as far as
Britain and Egypt.</p>
<p>The pictures on top were the advertising of their day: gladiators, gods and
ships sold well.</p>`,
      },
    ],
  },
  // --- 07 Sculpture (pedestals at [3, 20] and [8, 20]) ---
  {
    key: 'head',
    name: 'Marble portrait of a woman',
    dating: 'c. AD 120',
    description:
      'Life-size head of a Roman lady with a tall honeycomb hairstyle, carved in Luna marble.',
    provenance: 'Found in the forum area in 1931.',
    condition: { state: 'good', notes: 'Nose restored in plaster, 1932.' },
    creditLine: 'Forum excavations, 1931',
    rights: 'Public domain (object)',
    categories: ['archeologia', 'arte-antica'],
    position: [3, 18.7],
    contents: [
      {
        title: 'Hair as a fashion statement',
        difficulty: 'medium',
        bodyHTML: `
<p>Roman portraits followed the court: when the empress changed her hairstyle,
women across the empire did the same. This tower of curls copies the fashion
of Hadrian’s wife, Sabina, and dates the head to around AD 120.</p>
<p>Look at the back: the curls are only roughed out. The portrait stood in a
niche, and nobody was meant to see it from behind.</p>`,
      },
    ],
  },
  {
    key: 'boy',
    name: 'Boy with a goose',
    artist: 'After a Hellenistic original',
    dating: '2nd century AD',
    description: 'Bronze statuette of a toddler wrestling a goose, a Roman copy of a famous Greek group.',
    provenance: 'Bequest of Count Ottavio Guidi, 1903.',
    condition: { state: 'good' },
    creditLine: 'Guidi bequest, 1903',
    rights: 'Public domain (object)',
    categories: ['arte-antica'],
    position: [8, 18.7],
    contents: [
      {
        title: 'A tantrum in bronze',
        difficulty: 'easy',
        bodyHTML: `
<p>Greek sculptors of the third century BC discovered children: not small
adults, but chubby, clumsy, stubborn. This boy squeezes a goose that is nearly
his size, and the goose is clearly winning.</p>
<p>The Romans loved the joke and copied it for their gardens; this copy once
stood beside a fountain.</p>`,
      },
      {
        title: 'Who wins: the boy or the goose?',
        difficulty: 'easy',
        audience: 'children',
        bodyHTML: `
<p>This boy is about two years old, and he has grabbed a goose by the neck. Walk
around the statue: from one side he seems to win, from the other the goose
does.</p>
<p>Try to copy his pose. Is it easy to keep your balance?</p>`,
      },
    ],
  },
  {
    key: 'relief',
    name: 'Madonna and Child relief',
    artist: 'Workshop of Agostino di Duccio',
    dating: 'c. 1460',
    description: 'Shallow marble relief with the Virgin holding the Child among four angels.',
    provenance: 'From the church of San Michele, deconsecrated in 1866.',
    condition: { state: 'restoration', notes: 'Cleaning in progress until spring 2027.' },
    creditLine: 'San Michele, 1866',
    rights: 'Public domain (object)',
    categories: ['arte-antica'],
    position: [9.8, 22.8],
    contents: [
      {
        title: 'Carving air',
        difficulty: 'hard',
        bodyHTML: `
<p>The relief is barely two centimetres deep, yet the angels seem to float in
front of the Virgin. Florentine sculptors called the technique
<em>rilievo schiacciato</em>, “flattened relief”: depth is suggested by tiny
differences of level and by lines, as in a drawing.</p>
<p>The relief is being cleaned: the grey patches are the poultices that draw
out old dirt.</p>`,
      },
    ],
  },
  // --- 11 Sculpture Court (pedestal at [15, 13]) ---
  {
    key: 'fountain',
    name: 'Lion fountain mask',
    dating: '1548',
    description: 'Sandstone lion head that fed the courtyard fountain of Palazzo Forte.',
    provenance: 'Palazzo Forte, in situ until 1957.',
    condition: { state: 'fair', notes: 'Weathered; the lower jaw is lost.' },
    creditLine: 'Palazzo Forte',
    rights: 'Public domain (object)',
    categories: [],
    position: [15, 11.6],
    contents: [
      {
        title: 'The water of the Forte family',
        difficulty: 'easy',
        bodyHTML: `
<p>A private fountain was the ultimate luxury in a sixteenth-century town. This
lion spouted water drawn from a cistern under the court, filled by the roofs
around you.</p>
<p>The lion was the Forte family’s emblem: you will find it again above the
main entrance and on the painted ceiling of the bookshop.</p>`,
      },
    ],
  },
  {
    key: 'milestone',
    name: 'Milestone of the Via Aemilia',
    dating: 'AD 3',
    description: 'Limestone column inscribed with the distance to Rome and the name of Emperor Augustus.',
    provenance: 'Found reused in a farmhouse wall at Ponte Rosso, 1894.',
    condition: { state: 'good' },
    creditLine: 'Gift of the Rinaldi family, 1894',
    rights: 'Public domain (object)',
    categories: ['archeologia'],
    position: [12.6, 14.4],
    contents: [
      {
        title: 'Two hundred and seventeen miles to Rome',
        difficulty: 'medium',
        bodyHTML: `
<p>Read the last line: <strong>CCXVII</strong>, 217 Roman miles to the capital.
Milestones were the motorway signs of the empire, and each one also reminded
travellers who had paid for the road.</p>
<p>This one spent 1,800 years built into a farmhouse, which is why its
inscription is so sharp.</p>`,
        sources: [{ label: 'CIL XI, 6642' }],
      },
    ],
  },
  // --- 10 Temporary exhibitions (pedestal at [15, 21]) ---
  {
    key: 'loan-mirror',
    name: 'Mirror with the Dioscuri (loan)',
    dating: '3rd century BC',
    description: 'Etruscan mirror engraved with the twin horsemen Castor and Pollux, on loan from Perugia.',
    provenance: 'Museo Archeologico Nazionale dell’Umbria, loan for “Seeing in the dark”.',
    condition: { state: 'good' },
    creditLine: 'Loan, Museo Archeologico Nazionale dell’Umbria',
    rights: 'All rights reserved',
    categories: ['archeologia'],
    position: [15, 19.6],
    contents: [
      {
        title: 'Seeing in the dark',
        difficulty: 'medium',
        bodyHTML: `
<p>Engraved lines on bronze are almost invisible in flat light. In this room the
mirrors are lit from a low angle, as archaeologists do when they draw them,
so every scratch casts its own shadow.</p>
<p>Compare the twins on this mirror with the goddess Turan you met in the
archaeology room: the same workshop habits, a century apart.</p>`,
      },
    ],
  },
  {
    key: 'drawings',
    name: 'Excavation notebook of Luigi Rossi',
    artist: 'Luigi Rossi',
    dating: '1887–1889',
    description: 'Field notebook with ink plans of the Rocca tombs and pencil drawings of the finds.',
    provenance: 'Rossi family archive, deposited 1962.',
    condition: { state: 'fair', notes: 'Shown open at a different page every three months.' },
    creditLine: 'Rossi family deposit',
    rights: 'CC BY-NC 4.0',
    categories: ['archeologia'],
    position: [12.6, 22.6],
    contents: [
      {
        title: 'The notebook that found the krater',
        difficulty: 'medium',
        bodyHTML: `
<p>Luigi Rossi, a pharmacist with a passion for antiquities, dug the Rocca hill
for three summers. His notebook is why we know which objects came from which
tomb — including the krater in the archaeology room, sketched on the page
shown here.</p>`,
      },
    ],
  },
  // --- 08 Italian painting (paintings on the east wall, x = 29.7) ---
  {
    key: 'annunciation',
    name: 'Annunciation',
    artist: 'Francesco Zaganelli',
    dating: '1509',
    description: 'Oil on poplar panel; the angel kneels in a loggia opening onto a hilly landscape.',
    provenance: 'High altar of Santa Maria dei Servi; transferred to the museum in 1866.',
    condition: { state: 'good', notes: 'Varnish removed in 2011.' },
    creditLine: 'Santa Maria dei Servi, 1866',
    rights: 'Public domain',
    categories: ['arte-antica'],
    position: [28.8, 10.8],
    contents: [
      {
        title: 'A message in perspective',
        difficulty: 'medium',
        bodyHTML: `
<p>The lines of the loggia’s floor all run to one point, just behind the
Virgin’s hand: the painter used perspective to lead your eye to the moment
she accepts the angel’s message.</p>
<p>The landscape behind is not invented: the hill with a castle is the Rocca of
Villaforte, seen from the south.</p>`,
        sources: [{ label: 'Catalogue of paintings, Museo Civico di Villaforte, 2004, no. 12' }],
      },
    ],
  },
  {
    key: 'portrait',
    name: 'Portrait of Lucrezia Forte',
    artist: 'Lavinia Fontana',
    dating: '1582',
    description: 'Oil on canvas; a young woman of the Forte family with a lapdog and a pearl necklace.',
    provenance: 'Forte family; bought by the town in 1921.',
    condition: { state: 'excellent' },
    creditLine: 'Purchased 1921',
    rights: 'Public domain',
    categories: ['arte-antica'],
    position: [28.8, 13.4],
    contents: [
      {
        title: 'A woman paints a woman',
        difficulty: 'medium',
        bodyHTML: `
<p>Lavinia Fontana was one of the first women to run her own painting workshop,
and Bologna’s noble families queued for her portraits. She painted every
pearl and every hair of the dog, but also a sitter who looks straight at you.</p>`,
      },
    ],
  },
  {
    key: 'still-life',
    name: 'Still life with quinces',
    artist: 'Cristoforo Munari',
    dating: 'c. 1700',
    description: 'Quinces, a porcelain bowl and a lute on a table covered with a green cloth.',
    provenance: 'Gift of Elena Malvezzi, 1955.',
    condition: { state: 'good' },
    creditLine: 'Gift of Elena Malvezzi, 1955',
    rights: 'Public domain',
    categories: ['arte-antica'],
    position: [20.8, 11],
    contents: [
      {
        title: 'Find the fly',
        difficulty: 'easy',
        audience: 'children',
        bodyHTML: `
<p>Painters loved to hide a tiny trick in their pictures. Somewhere on these
quinces there is a fly so real you might want to shoo it away. Can you find
it?</p>
<p>Now look at the bowl: it came all the way from China.</p>`,
      },
    ],
  },
  // --- 09 Modern art (paintings on the east wall, x = 29.7) ---
  {
    key: 'morandi',
    name: 'Still life (bottles)',
    artist: 'Circle of Giorgio Morandi',
    dating: '1952',
    description: 'Oil on canvas; five bottles and a box in muted greys and pinks.',
    provenance: 'Gift of the artist’s pupils, 1970.',
    condition: { state: 'excellent' },
    creditLine: 'Gift, 1970',
    rights: 'All rights reserved',
    categories: ['arte-moderna'],
    position: [28.8, 18],
    contents: [
      {
        title: 'Painting the same bottles for forty years',
        difficulty: 'hard',
        bodyHTML: `
<p>Morandi and his circle kept dusty bottles in the studio and painted them
again and again. Change the light, the distance between two objects or a
shade of grey, and the whole picture changes.</p>
<p>Stand back two metres: the bottles merge into one building-like block.</p>`,
      },
    ],
  },
  {
    key: 'futurist',
    name: 'Speed of a motorcycle',
    artist: 'Ada Casali',
    dating: '1924',
    description: 'Tempera on board; a red motorcycle broken into overlapping planes and lines of force.',
    provenance: 'Bought at the Venice Biennale, 1926.',
    condition: { state: 'good' },
    creditLine: 'Purchased 1926',
    rights: 'All rights reserved',
    categories: ['arte-moderna'],
    position: [28.8, 21],
    contents: [
      {
        title: 'Painting noise',
        difficulty: 'medium',
        bodyHTML: `
<p>The Futurists wanted painting to roar like an engine. Casali repeats the
wheels three times and cuts the background with diagonal “lines of force”, so
the motorcycle seems to leave the frame on the right.</p>`,
      },
    ],
  },
  {
    key: 'mobile',
    name: 'Red and blue mobile',
    artist: 'Piero Lanza',
    dating: '1968',
    description: 'Painted aluminium sheets balanced on steel wires, turning with the air of the room.',
    provenance: 'Gift of the artist, 1985.',
    condition: { state: 'good', notes: 'Do not touch: the balance is set by hand.' },
    creditLine: 'Gift of the artist, 1985',
    rights: 'All rights reserved',
    categories: ['arte-moderna', 'arte-contemporanea'],
    position: [21, 22.8],
    contents: [
      {
        title: 'A sculpture that moves by itself',
        difficulty: 'easy',
        audience: 'children',
        bodyHTML: `
<p>Stand still and watch: this sculpture turns very slowly, pushed only by the
air you and other visitors move when you walk.</p>
<p>Each piece balances another one. If one were heavier, the whole mobile
would tip.</p>`,
      },
    ],
  },
]

/** Content titles in visiting order; the tour's museum is the seeded one. */
export const TOURS = [
  {
    title: 'Highlights of Villaforte',
    description: 'Eight masterpieces, all around the court.',
    durationMinutes: 60,
    wheelchairAccessible: true,
    categories: ['archeologia', 'arte-antica', 'arte-moderna'],
    bodyHTML: `<p>The essential visit: one object per room, from Etruscan tombs to the
Futurists, walking once around the Sculpture Court.</p>`,
    stops: [
      'A merchant’s house around a courtyard',
      'A party in a tomb',
      'Turan’s mirror',
      'Hair as a fashion statement',
      'Seeing in the dark',
      'The water of the Forte family',
      'Painting noise',
      'A message in perspective',
    ],
    quiz: [
      {
        prompt: 'What was a krater used for?',
        correctAnswer: 'Mixing wine with water',
        wrong: ['Storing olive oil', 'Cooking meat', 'Washing hands before dinner'],
      },
      {
        prompt: 'Whose hairstyle does the marble portrait copy?',
        correctAnswer: 'Empress Sabina',
        wrong: ['Cleopatra', 'Turan', 'Lucrezia Forte'],
      },
      {
        prompt: 'Which animal was the Forte family’s emblem?',
        correctAnswer: 'A lion',
        wrong: ['A goose', 'A dolphin', 'An eagle'],
      },
    ],
  },
  {
    title: 'Ancient Villaforte in 30 minutes',
    description: 'Etruscans and Romans in the west wing and court.',
    durationMinutes: 30,
    wheelchairAccessible: true,
    categories: ['archeologia'],
    bodyHTML: `<p>From the lamps of the Roman town to the road that led to Rome: a short
route through the archaeology room, the sculpture room and the court.</p>`,
    stops: [
      'Light by the thousand',
      'Turan’s mirror',
      'A tantrum in bronze',
      'Two hundred and seventeen miles to Rome',
    ],
    quiz: [],
  },
  {
    title: 'Family trail: look closer',
    description: 'Four stops with games for children aged 6–10.',
    durationMinutes: 40,
    wheelchairAccessible: true,
    categories: [],
    bodyHTML: `<p>A trail made for families: count, look for hidden details and try
the poses. Each stop has a short text written for children.</p>`,
    stops: [
      'The krater: a giant mixing bowl',
      'Who wins: the boy or the goose?',
      'A sculpture that moves by itself',
      'Find the fly',
    ],
    quiz: [],
  },
]
