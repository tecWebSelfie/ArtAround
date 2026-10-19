import {
  MUSEUM_FUNCTION_CURATOR,
  MUSEUM_FUNCTION_DIRECTOR,
  MUSEUM_FUNCTION_NONE,
} from '@/fields/MuseumFunction'
import config from '@/payload.config'
import { convertHTMLToLexical, editorConfigFactory } from '@payloadcms/richtext-lexical'
import { JSDOM } from 'jsdom'
import type { RequiredDataFromCollectionSlug } from 'payload'
import { getPayload } from 'payload'

const editorDefaultConfig = await editorConfigFactory.default({
  config: await config, // Your Payload Config
})

const htmlToRichText = (html: string) =>
  convertHTMLToLexical({
    editorConfig: editorDefaultConfig,
    JSDOM,
    html,
  })

try {
  const payload = await getPayload({ config })

  console.log('Seeding database...')
  console.log('Creating super admin user if it does not exist...')
  const existing = await payload.find({
    collection: 'users',
    where: { email: { equals: 'dev@payloadcms.com' } },
    limit: 1,
  })
  let superAdminId: string | undefined =
    existing.docs[0] != null ? String(existing.docs[0].id) : undefined
  if (existing.docs.length === 0) {
    const created = await payload.create({
      collection: 'users',
      data: {
        username: 'dev',
        email: 'dev@payloadcms.com',
        password: 'test',
        isSuperAdmin: true,
        name: { firstName: 'Dev', lastName: 'Admin', fullName: 'Dev Admin' },
      },
    })
    superAdminId = String(created.id)
  } else {
    console.log('SuperAdmin user already exists, skipping')
  }

  // --- RBAC seed (values snapshotted from live MongoDB) ---
  // Collections provided by @zealamic/payload-plugin-rbac:
  // permission-actions, permission-features, permissions, roles, roles-permissions
  // All lookups are by natural key (code/name) so re-seeds are idempotent
  // and survive fresh DBs with different ObjectIds.

  const findOneBy = async (
    collection: 'permission-actions' | 'permission-features' | 'permissions' | 'roles',
    field: string,
    value: string,
  ) => {
    const res = await payload.find({
      collection,
      where: { [field]: { equals: value } },
      limit: 1,
      depth: 0,
    })
    const doc = res.docs[0] as { id: string | number } | undefined
    return doc != null ? String(doc.id) : undefined
  }

  console.log('Seeding permission-actions...')
  const permissionActionsSeed = [
    { code: 'Create', type: 'main' as const, sortOrder: 0, status: 'active' as const },
    { code: 'Read', type: 'main' as const, sortOrder: 0, status: 'active' as const },
    { code: 'Update', type: 'main' as const, sortOrder: 0, status: 'active' as const },
    { code: 'Delete', type: 'main' as const, sortOrder: 0, status: 'active' as const },
  ]
  const actionIdsByCode: Record<string, string> = {}
  for (const action of permissionActionsSeed) {
    const foundId = await findOneBy('permission-actions', 'code', action.code)
    if (foundId) {
      actionIdsByCode[action.code] = foundId
      continue
    }
    const created = await payload.create({
      collection: 'permission-actions',
      data: { ...action, ...(superAdminId ? { createdBy: superAdminId } : {}) },
    })
    actionIdsByCode[action.code] = String(created.id)
  }

  console.log('Seeding permission-features...')
  const permissionFeaturesSeed = [
    { code: 'Museum', sortOrder: 0, status: 'active' as const },
    { code: 'Content', sortOrder: 0, status: 'active' as const },
    { code: 'Object', sortOrder: 0, status: 'active' as const },
  ]
  const featureIdsByCode: Record<string, string> = {}
  for (const feature of permissionFeaturesSeed) {
    const foundId = await findOneBy('permission-features', 'code', feature.code)
    if (foundId) {
      featureIdsByCode[feature.code] = foundId
      continue
    }
    const created = await payload.create({
      collection: 'permission-features',
      data: { ...feature, ...(superAdminId ? { createdBy: superAdminId } : {}) },
    })
    featureIdsByCode[feature.code] = String(created.id)
  }

  console.log('Seeding permissions...')
  // Basic CRUD operations for every collection managed by the RBAC plugin
  // (payloadPluginRBAC targetCollections): museums, objects, contents, tours.
  // Feature codes below mirror the live DB values ('Museum', 'Content', ...).
  const crudFeatures = ['Museum', 'Content', 'Object']
  const crudActions = ['Create', 'Read', 'Update', 'Delete']
  const permissionsSeed = crudFeatures.flatMap((featureCode) =>
    crudActions.map((actionCode) => ({
      name: `${actionCode} ${featureCode}`,
      featureCode,
      actionCode,
    })),
  )
  const permissionIdsByName: Record<string, string> = {}
  for (const perm of permissionsSeed) {
    const foundId = await findOneBy('permissions', 'name', perm.name)
    if (foundId) {
      permissionIdsByName[perm.name] = foundId
      continue
    }
    const created = await payload.create({
      collection: 'permissions',
      data: {
        name: perm.name,
        permissionFeature: featureIdsByCode[perm.featureCode],
        permissionAction: actionIdsByCode[perm.actionCode],
        sortOrder: 0,
        status: 'active',
        ...(superAdminId ? { createdBy: superAdminId } : {}),
      },
    })
    permissionIdsByName[perm.name] = String(created.id)
  }

  console.log('Seeding roles...')
  // Director owns the museum: grant the full CRUD matrix. Curator/User get no
  // permissions by default; assign them via the admin UI as needed.
  const directorPermissions = permissionsSeed.map((perm) => perm.name)
  const buildDirectorDraft = () => {
    const draft: Record<string, boolean> = {}
    for (const permName of directorPermissions) {
      const permId = permissionIdsByName[permName]
      if (permId) draft[permId] = true
    }
    return draft
  }
  const rolesSeed = [
    {
      code: 'User',
      name: 'User',
      description: 'A logged in user, who can also create its own content and share it',
      status: 'active' as const,
      dataScope: 'own' as const,
      museumFunction: MUSEUM_FUNCTION_NONE,
    },
    {
      code: 'Curator',
      name: 'Curator',
      description: 'A museum curator',
      status: 'active' as const,
      dataScope: 'all' as const,
      museumFunction: MUSEUM_FUNCTION_CURATOR,
    },
    {
      code: 'Director',
      name: 'Director',
      description: 'A Museum director. He/Her owns the museum',
      status: 'active' as const,
      dataScope: 'all' as const,
      museumFunction: MUSEUM_FUNCTION_DIRECTOR,
    },
  ]
  const roleIdsByCode: Record<string, string> = {}
  for (const role of rolesSeed) {
    const foundId = await findOneBy('roles', 'code', role.code)
    if (foundId) {
      roleIdsByCode[role.code] = foundId
      // Keep the museum function in sync on re-seed (same policy as
      // Director's permissionMatrixDraft below): the seed owns the mapping
      // between system roles and museum functions.
      await payload.update({
        collection: 'roles',
        id: foundId,
        data: {
          museumFunction: role.museumFunction,
          ...(role.code === 'Director' ? { permissionMatrixDraft: buildDirectorDraft() } : {}),
        },
      })
      continue
    }
    const created = await payload.create({
      collection: 'roles',
      data: {
        ...role,
        ...(role.code === 'Director' ? { permissionMatrixDraft: buildDirectorDraft() } : {}),
        ...(superAdminId ? { createdBy: superAdminId } : {}),
      },
    })
    roleIdsByCode[role.code] = String(created.id)
  }

  // roles-permissions rows are auto-synced from roles.permissionMatrixDraft by
  // the plugin's syncPermissionMatrixDraftAfterChange hook, but ensure the
  // Director rows exist in case hooks were bypassed.
  console.log('Seeding roles-permissions...')
  const directorRoleId = roleIdsByCode['Director']
  if (directorRoleId) {
    for (const permName of directorPermissions) {
      const permId = permissionIdsByName[permName]
      if (!permId) continue
      const res = await payload.find({
        collection: 'roles-permissions',
        where: {
          and: [{ role: { equals: directorRoleId } }, { permission: { equals: permId } }],
        },
        limit: 1,
        depth: 0,
      })
      if (res.docs.length === 0) {
        await payload.create({
          collection: 'roles-permissions',
          data: { role: directorRoleId, permission: permId, enabled: true },
        })
      }
    }
  }

  // --- MCP dev API key (payload-mcp-api-keys) ---
  // Seeds a single `dev-mcp` key from PAYLOAD_MCP_KEY for local development.
  // Verification uses HMAC_SHA256(PAYLOAD_SECRET, rawKey) -> apiKeyIndex, so the
  // same PAYLOAD_SECRET must be used at seed time and at runtime. Passing the
  // plaintext `apiKey` + `enableAPIKey: true` to payload.create triggers the
  // standard encrypt/index hooks, same as Admin UI creation. Local API runs
  // with overrideAccess (bypass), which is required to set the `user` field
  // (create:false in the plugin collection).
  // Policy: missing env -> skip; existing `dev-mcp` label -> skip (no rotation).
  // Admin UI is source of truth for rotation; sync .env manually afterwards.
  console.log('Seeding MCP dev API key...')
  const rawMcpKey = process.env.PAYLOAD_MCP_KEY?.trim()
  if (!rawMcpKey) {
    console.log('PAYLOAD_MCP_KEY not set, skipping MCP key seed')
  } else if (!superAdminId) {
    console.log('SuperAdmin user missing, skipping MCP key seed')
  } else {
    const existingMcpKey = await payload.find({
      collection: 'payload-mcp-api-keys',
      where: { label: { equals: 'dev-mcp' } },
      limit: 1,
      depth: 0,
    })
    if (existingMcpKey.docs.length > 0) {
      console.log('MCP dev key already exists, skipping')
    } else {
      await payload.create({
        collection: 'payload-mcp-api-keys',
        data: {
          user: superAdminId,
          label: 'dev-mcp',
          description: 'Development MCP key (find+create on mcp-enabled collections)',
          museums: { find: true, create: true, update: false, delete: false },
          objects: { find: true, create: true, update: false, delete: false },
          contents: { find: true, create: true, update: false, delete: false },
          enableAPIKey: true,
          apiKey: rawMcpKey,
        },
      })
      console.log('MCP dev key created')
    }
  }

  // --- Demo content -------------------------------------------------------
  // Created in dependency order so every relation points at an existing doc:
  // users → categories → contents → objects → museums → tours → back-links
  // (museums.objects/tours, users.authored*) → memberships → purchases.
  // Every lookup is by natural key, so re-running the seed only adds what is
  // missing. Five documents per editorial collection keeps the catalog demo
  // realistic while staying small enough to inspect by hand.
  const findId = async (
    collection:
      | 'users'
      | 'museums'
      | 'objects'
      | 'contents'
      | 'tours'
      | 'museumCategories'
      | 'purchases',
    field: string,
    value: string,
  ): Promise<string | undefined> => {
    const res = await payload.find({
      collection,
      where: { [field]: { equals: value } },
      limit: 1,
      depth: 0,
    })
    return res.docs[0] != null ? String(res.docs[0].id) : undefined
  }

  console.log('Seeding demo users...')
  const demoUsers = [
    {
      username: 'davide',
      email: 'davide@example.com',
      password: 'test-password',
      name: { firstName: 'Davide', lastName: 'Bianchi', fullName: 'Davide Bianchi' },
      bio: 'Street art guide in Turin',
      description: 'Street art guide in Turin',
    },
    {
      username: 'chiara',
      email: 'chiara@example.com',
      password: 'test-password',
      name: { firstName: 'Chiara', lastName: 'Moretti', fullName: 'Chiara Moretti' },
      bio: 'Modern sculpture enthusiast from Bologna',
      description: 'Modern sculpture enthusiast from Bologna',
    },
    {
      username: 'luca',
      email: 'luca@example.com',
      password: 'test-password',
      name: { firstName: 'Luca', lastName: 'Ferrari', fullName: 'Luca Ferrari' },
      bio: 'Museum volunteer and audio guide narrator',
      description: 'Museum volunteer and audio guide narrator',
    },
    {
      username: 'anna',
      email: 'anna@example.com',
      password: 'test-password',
      name: { firstName: 'Anna', lastName: 'Rossi', fullName: 'Anna Rossi' },
      bio: 'Baroque painting scholar in Naples',
      description: 'Baroque painting scholar in Naples',
    },
    {
      username: 'paolo',
      email: 'paolo@example.com',
      password: 'test-password',
      name: { firstName: 'Paolo', lastName: 'Greco', fullName: 'Paolo Greco' },
      bio: 'Digital archivist for Sicilian museums',
      description: 'Digital archivist for Sicilian museums',
    },
  ] satisfies RequiredDataFromCollectionSlug<'users'>[]
  const userIdByEmail: Record<string, string> = {}
  for (const user of demoUsers) {
    const foundId = await findId('users', 'email', user.email)
    if (foundId) {
      userIdByEmail[user.email] = foundId
      console.log(`User "${user.email}" already exists, skipping`)
      continue
    }
    const created = await payload.create({ collection: 'users', data: user })
    userIdByEmail[user.email] = String(created.id)
    console.log(`User "${user.email}" created`)
  }

  console.log('Seeding museum categories...')
  const categorySeed = [
    {
      slug: 'arte-antica',
      name: 'Arte antica',
      featured: true,
      description: 'Collections from antiquity through the early Renaissance.',
      icon: 'landmark',
      color: '#B45309',
    },
    {
      slug: 'arte-moderna',
      name: 'Arte moderna',
      description: 'Painting and sculpture from the Renaissance to the 19th century.',
      icon: 'palette',
      color: '#7C3AED',
    },
    {
      slug: 'arte-contemporanea',
      name: 'Arte contemporanea',
      featured: true,
      description: 'Twentieth-century and contemporary art.',
      icon: 'sparkles',
      color: '#DB2777',
    },
    {
      slug: 'archeologia',
      name: 'Archeologia',
      description: 'Archaeological finds and ancient civilisations.',
      icon: 'amphora',
      color: '#0F766E',
    },
    {
      slug: 'scienza',
      name: 'Scienza',
      description: 'Science, technology and the history of ideas.',
      icon: 'atom',
      color: '#0369A1',
    },
  ] satisfies RequiredDataFromCollectionSlug<'museumCategories'>[]
  const categoryIdBySlug: Record<string, string> = {}
  for (const category of categorySeed) {
    const foundId = await findId('museumCategories', 'slug', category.slug)
    if (foundId) {
      categoryIdBySlug[category.slug] = foundId
      continue
    }
    const created = await payload.create({ collection: 'museumCategories', data: category })
    categoryIdBySlug[category.slug] = String(created.id)
    console.log(`Category "${category.slug}" created`)
  }

  console.log('Seeding demo contents...')
  // `author` and `objects` are joins: their owning side is written later
  // (users.authoredContents and objects.contents). Passing `{}` keeps the
  // required join satisfied without inventing a reverse relation here.
  const demoContents = [
    {
      authorEmail: 'davide@example.com',
      data: {
        title: 'La scultura barocca del Bernini',
        difficulty: 'medium',
        body: htmlToRichText(
          '<p>Gian Lorenzo Bernini trasformò il marmo in movimento: il <em>Ratto di Proserpina</em> racconta il mito attraverso panneggi, sguardi e una composizione a spirale che invita il visitatore a girare intorno al gruppo scultoreo.</p>',
        ),
        copyright: 'Text © ArtAround, 2026.',
        categories: [categoryIdBySlug['arte-antica'], categoryIdBySlug['arte-moderna']],
        sources: [
          { label: 'Galleria Borghese — collezione permanente', url: 'https://galleriaborghese.beniculturali.it' },
        ],
        author: {},
        objects: {},
        pricing: { currency: 'eur' },
      },
    },
    {
      authorEmail: 'chiara@example.com',
      data: {
        title: 'Il Quarto Stato e la pittura sociale',
        difficulty: 'easy',
        body: htmlToRichText(
          '<p>Dipinto da Giuseppe Pellizza da Volpedo nel 1901, <em>Il Quarto Stato</em> è il manifesto visivo delle lotte operaie: una folla che avanza lenta e compatta, costruita con la tecnica divisionista.</p>',
        ),
        copyright: 'Text © ArtAround, 2026.',
        categories: [categoryIdBySlug['arte-contemporanea']],
        sources: [{ label: 'Palazzo Reale di Milano — mostre' }],
        author: {},
        objects: {},
        pricing: { currency: 'eur' },
      },
    },
    {
      authorEmail: 'luca@example.com',
      data: {
        title: 'Galileo e la nascita della scienza moderna',
        difficulty: 'medium',
        body: htmlToRichText(
          '<p>Il cannocchiale, il microscopio e la bilancia idrostatica raccontano il metodo galileiano: osservare, misurare, sperimentare. Gli strumenti del Museo Galileo sono anche oggetti di artigianato di altissima qualità.</p>',
        ),
        copyright: 'Text © ArtAround, 2026.',
        categories: [categoryIdBySlug['scienza']],
        sources: [{ label: 'Museo Galileo — collezione', url: 'https://www.museogalileo.it' }],
        author: {},
        objects: {},
        // Paid content: exercises the checkout/entitlement path in the app.
        pricing: { currency: 'eur', priceCents: 499 },
      },
    },
    {
      authorEmail: 'anna@example.com',
      data: {
        title: 'Il marmo Farnese: dal mito al museo',
        difficulty: 'medium',
        body: htmlToRichText(
          '<p>L\u2019<em>Ercole Farnese</em> è una copia romana da originale greco che ha influenzato scultori e collezionisti per secoli. Il percorso racconta come le sculture Farnese arrivarono a Napoli.</p>',
        ),
        copyright: 'Text © ArtAround, 2026.',
        categories: [categoryIdBySlug['archeologia'], categoryIdBySlug['arte-antica']],
        sources: [{ label: 'MANN — collezione Farnese', url: 'https://mann-napoli.it' }],
        author: {},
        objects: {},
        pricing: { currency: 'eur' },
      },
    },
    {
      authorEmail: 'paolo@example.com',
      data: {
        title: 'Venezia e il mito della Serenissima',
        difficulty: 'easy',
        body: htmlToRichText(
          '<p>Le sale di Palazzo Ducale celebrano il potere della Repubblica: tele del Tintoretto, soffitti dorati e il Ponte dei Sospiri raccontano la storia politica della Serenissima.</p>',
        ),
        copyright: 'Text © ArtAround, 2026.',
        categories: [categoryIdBySlug['arte-moderna']],
        sources: [{ label: 'Palazzo Ducale — percorso di visita' }],
        author: {},
        objects: {},
        pricing: { currency: 'eur', priceCents: 299 },
      },
    },
  ] satisfies { authorEmail: string; data: RequiredDataFromCollectionSlug<'contents'> }[]
  const contentIdByTitle: Record<string, string> = {}
  for (const content of demoContents) {
    const foundId = await findId('contents', 'title', content.data.title)
    if (foundId) {
      contentIdByTitle[content.data.title] = foundId
      console.log(`Content "${content.data.title}" already exists, skipping`)
      continue
    }
    const created = await payload.create({ collection: 'contents', data: content.data })
    contentIdByTitle[content.data.title] = String(created.id)
    console.log(`Content "${content.data.title}" created`)
  }

  console.log('Seeding demo objects...')
  const demoObjects = [
    {
      name: 'Ratto di Proserpina',
      description:
        'Gruppo scultoreo in marmo bianco: Proserpina rapita da Plutone, con un celebre dettaglio delle dita che affondano nella coscia.',
      artist: 'Gian Lorenzo Bernini',
      dating: '1621–1625',
      provenance: 'Collezione Scipione Borghese, Roma.',
      condition: { state: 'excellent' as const, notes: 'Restaurato nel 2019; superficie stabile.' },
      creditLine: 'Galleria Borghese, Roma',
      rights: 'Immagine e testo: riproduzione consentita per uso didattico.',
      categories: [categoryIdBySlug['arte-antica'], categoryIdBySlug['arte-moderna']],
      contents: [contentIdByTitle['La scultura barocca del Bernini']],
    },
    {
      name: 'Il Quarto Stato',
      description:
        'Grande tela divisionista con una folla di lavoratori in marcia: simbolo delle lotte sociali del Novecento italiano.',
      artist: 'Giuseppe Pellizza da Volpedo',
      dating: '1898–1901',
      provenance: 'Acquisito dal Comune di Milano per il Museo del Novecento.',
      condition: { state: 'good' as const, notes: 'Piccole ritocchi precedenti; vernice uniforme.' },
      creditLine: 'Museo del Novecento, Milano',
      rights: 'Pubblico dominio.',
      categories: [categoryIdBySlug['arte-contemporanea']],
      contents: [contentIdByTitle['Il Quarto Stato e la pittura sociale']],
    },
    {
      name: 'Cannocchiale galileiano',
      description:
        'Cannocchiale in legno e cuoio attribuito a Galileo, testimonianza delle prime osservazioni astronomiche.',
      artist: 'Galileo Galilei (bottega)',
      dating: 'c. 1610',
      provenance: 'Collezione medicea, Firenze.',
      condition: {
        state: 'fair' as const,
        notes: 'Lenti originali; l\u2019ottone presenta ossidazione controllata.',
      },
      creditLine: 'Museo Galileo, Firenze',
      rights: 'CC BY-SA 4.0',
      categories: [categoryIdBySlug['scienza']],
      contents: [contentIdByTitle['Galileo e la nascita della scienza moderna']],
    },
    {
      name: 'Ercole Farnese',
      description:
        'Copia romana in marmo dell\u2019Ercole di Lisippo, rinvenuta nelle Terme di Caracalla e parte della collezione Farnese.',
      artist: 'Glicone di Atene',
      dating: 'III secolo d.C.',
      provenance: 'Terme di Caracalla, collezione Farnese, Napoli.',
      condition: { state: 'good' as const, notes: 'Integrazioni storiche documentate.' },
      creditLine: 'Museo Archeologico Nazionale di Napoli',
      rights: 'Pubblico dominio.',
      categories: [categoryIdBySlug['archeologia'], categoryIdBySlug['arte-antica']],
      contents: [contentIdByTitle['Il marmo Farnese: dal mito al museo']],
    },
    {
      name: 'Leone di San Marco',
      description:
        'Rilievo con il leone alato, emblema di Venezia, collocato lungo il percorso del Palazzo Ducale.',
      artist: 'Scultore veneziano',
      dating: 'XIV secolo',
      provenance: 'Palazzo Ducale, Venezia.',
      condition: {
        state: 'restoration' as const,
        notes: 'Intervento conservativo in corso sulla superficie lapidea.',
      },
      creditLine: 'Fondazione Musei Civici di Venezia',
      rights: 'Immagine su concessione del museo.',
      categories: [categoryIdBySlug['arte-moderna']],
      contents: [contentIdByTitle['Venezia e il mito della Serenissima']],
    },
  ] satisfies RequiredDataFromCollectionSlug<'objects'>[]
  const objectIdByName: Record<string, string> = {}
  for (const object of demoObjects) {
    const foundId = await findId('objects', 'name', object.name)
    if (foundId) {
      objectIdByName[object.name] = foundId
      console.log(`Object "${object.name}" already exists, skipping`)
      continue
    }
    const created = await payload.create({
      collection: 'objects',
      data: object,
      // The Mint workflow would otherwise queue a model generation job for
      // every seeded object; demo data has no source image to generate from.
      context: { skipMintModelGeneration: true },
    })
    objectIdByName[object.name] = String(created.id)
    console.log(`Object "${object.name}" created`)
  }

  console.log('Seeding demo museums...')
  const demoMuseums = [
    {
      key: 'borghese',
      name: 'Galleria Borghese',
      shortDescription: 'Baroque masterpieces in a Roman villa',
      categories: ['arte-antica', 'arte-moderna'],
      address: 'Piazzale Scipione Borghese 5',
      city: 'Roma',
      region: 'Lazio',
      postalCode: '00197',
      latlng: [12.4922, 41.9142] as [number, number],
      description: 'Bernini sculptures and Caravaggio paintings in Villa Borghese.',
      ticketLabel: 'Standard ticket',
      ticketUrl: 'https://www.galleriaborghese.beniculturali.it/en/tickets',
      news: 'New lighting for the Bernini rooms',
      object: 'Ratto di Proserpina',
    },
    {
      key: 'palazzo-reale',
      name: 'Palazzo Reale di Milano',
      shortDescription: 'Grand exhibitions in the heart of Milan',
      categories: ['arte-contemporanea'],
      address: 'Piazza del Duomo 12',
      city: 'Milano',
      region: 'Lombardia',
      postalCode: '20122',
      latlng: [9.1917, 45.4636] as [number, number],
      description: 'Major international exhibitions next to the Duomo.',
      ticketLabel: 'Standard ticket',
      object: 'Il Quarto Stato',
    },
    {
      key: 'galileo',
      name: 'Museo Galileo',
      shortDescription: 'History of science in Florence',
      categories: ['scienza'],
      address: 'Piazza dei Giudici 1',
      city: 'Firenze',
      region: 'Toscana',
      postalCode: '50122',
      latlng: [11.476, 43.7679] as [number, number],
      description: 'Scientific instruments from Galileo and the Medici era.',
      ticketLabel: 'Standard ticket',
      object: 'Cannocchiale galileiano',
    },
    {
      key: 'mann',
      name: 'Museo Archeologico Nazionale di Napoli',
      shortDescription: 'Roman antiquities from Pompeii',
      categories: ['archeologia', 'arte-antica'],
      address: 'Piazza Museo 19',
      city: 'Napoli',
      region: 'Campania',
      postalCode: '80135',
      latlng: [14.1245, 40.8533] as [number, number],
      description: 'Farnese collection and finds from Pompeii and Herculaneum.',
      ticketLabel: 'Standard ticket',
      object: 'Ercole Farnese',
    },
    {
      key: 'ducale',
      name: 'Palazzo Ducale di Venezia',
      shortDescription: 'Gothic palace of the Doges',
      categories: ['arte-moderna'],
      address: 'Piazza San Marco 1',
      city: 'Venezia',
      region: 'Veneto',
      postalCode: '30124',
      latlng: [12.3358, 45.4346] as [number, number],
      description: 'Tintoretto ceilings and the Bridge of Sighs.',
      ticketLabel: 'Standard ticket',
      ticketUrl: 'https://palazzoducale.visitmuve.it/en/tickets',
      news: 'Evening openings in spring',
      object: 'Leone di San Marco',
    },
  ] satisfies {
    key: string
    name: string
    shortDescription: string
    categories: string[]
    address: string
    city: string
    region: string
    postalCode: string
    latlng: [number, number]
    description: string
    ticketLabel: string
    ticketUrl?: string
    news?: string
    object: string
  }[]
  const museumIdByKey: Record<string, string> = {}
  for (const museum of demoMuseums) {
    const objectId = objectIdByName[museum.object]
    const data: RequiredDataFromCollectionSlug<'museums'> = {
      name: museum.name,
      shortDescription: museum.shortDescription,
      description: htmlToRichText(`<p>${museum.description}</p>`),
      categories: museum.categories.map((slug) => categoryIdBySlug[slug]),
      accessibility: {
        isAccessible: true,
        stepFreeEntrance: true,
        elevator: museum.key !== 'ducale',
        accessibleBathrooms: true,
        tactilePaths: museum.key === 'mann' || museum.key === 'galileo',
        audioGuides: true,
        signLanguage: museum.key === 'borghese',
        serviceAnimals: true,
      },
      location: {
        address: museum.address,
        city: museum.city,
        region: museum.region,
        postalCode: museum.postalCode,
        country: 'IT',
        latlng: museum.latlng,
      },
      ticketInfo: { label: museum.ticketLabel, url: museum.ticketUrl },
      objects: objectId ? [objectId] : [],
      news: museum.news
        ? [
            {
              title: museum.news,
              content: 'Programme update — see the museum website for details.',
              date: '2026-04-01T00:00:00.000Z',
            },
          ]
        : undefined,
    }
    const foundId = await findId('museums', 'name', museum.name)
    if (foundId) {
      museumIdByKey[museum.key] = foundId
      console.log(`Museum "${museum.name}" already exists, skipping`)
      continue
    }
    const created = await payload.create({ collection: 'museums', data })
    museumIdByKey[museum.key] = String(created.id)
    console.log(`Museum "${museum.name}" created`)
  }

  console.log('Seeding demo tours...')
  // `museum`/`author` are joins owned by museums.tours and users.authoredTours;
  // those arrays are written in the back-link step below.
  const demoTours = [
    {
      museumKey: 'borghese',
      authorEmail: 'davide@example.com',
      data: {
        title: 'Capolavori della Galleria Borghese',
        description: 'Bernini, Caravaggio e Canova in un unico percorso.',
        contents: [contentIdByTitle['La scultura barocca del Bernini']],
        categories: [categoryIdBySlug['arte-antica'], categoryIdBySlug['arte-moderna']],
        durationMinutes: 60,
        distanceMeters: 800,
        wheelchairAccessible: true,
        museum: {},
        author: {},
        pricing: { currency: 'eur', priceCents: 1200 },
      },
    },
    {
      museumKey: 'palazzo-reale',
      authorEmail: 'chiara@example.com',
      data: {
        title: 'Palazzo Reale tra Ottocento e Avanguardia',
        description: 'Dalle sale storiche alle mostre temporanee.',
        contents: [contentIdByTitle['Il Quarto Stato e la pittura sociale']],
        categories: [categoryIdBySlug['arte-contemporanea']],
        durationMinutes: 45,
        distanceMeters: 600,
        wheelchairAccessible: true,
        museum: {},
        author: {},
        pricing: { currency: 'eur', priceCents: 900 },
      },
    },
    {
      museumKey: 'galileo',
      authorEmail: 'luca@example.com',
      data: {
        title: 'Galileo: strumenti e scoperte',
        description: 'Un percorso tra cannocchiali, globi e macchine.',
        contents: [contentIdByTitle['Galileo e la nascita della scienza moderna']],
        categories: [categoryIdBySlug['scienza']],
        durationMinutes: 75,
        distanceMeters: 950,
        wheelchairAccessible: true,
        museum: {},
        author: {},
        pricing: { currency: 'eur', priceCents: 1000 },
      },
    },
    {
      museumKey: 'mann',
      authorEmail: 'anna@example.com',
      data: {
        title: 'Pompei al MANN',
        description: 'Affreschi, mosaici e sculture dalla città sepolta.',
        contents: [contentIdByTitle['Il marmo Farnese: dal mito al museo']],
        categories: [categoryIdBySlug['archeologia'], categoryIdBySlug['arte-antica']],
        durationMinutes: 90,
        distanceMeters: 1200,
        wheelchairAccessible: true,
        museum: {},
        author: {},
        pricing: { currency: 'eur', priceCents: 1500 },
      },
    },
    {
      museumKey: 'ducale',
      authorEmail: 'paolo@example.com',
      data: {
        title: 'Itinerario del potere a Palazzo Ducale',
        description: 'Sale istituzionali, Tintoretto e Ponte dei Sospiri.',
        contents: [contentIdByTitle['Venezia e il mito della Serenissima']],
        categories: [categoryIdBySlug['arte-moderna']],
        durationMinutes: 60,
        distanceMeters: 700,
        wheelchairAccessible: false,
        museum: {},
        author: {},
        pricing: { currency: 'eur', priceCents: 1100 },
      },
    },
  ] satisfies { museumKey: string; authorEmail: string; data: RequiredDataFromCollectionSlug<'tours'> }[]
  const tourIdByTitle: Record<string, string> = {}
  for (const tour of demoTours) {
    const foundId = await findId('tours', 'title', tour.data.title)
    if (foundId) {
      tourIdByTitle[tour.data.title] = foundId
      console.log(`Tour "${tour.data.title}" already exists, skipping`)
      continue
    }
    const created = await payload.create({ collection: 'tours', data: tour.data })
    tourIdByTitle[tour.data.title] = String(created.id)
    console.log(`Tour "${tour.data.title}" created`)
  }

  // Back-links: owners of the joins. Only set fields this seed owns, and only
  // add missing ids so re-seeding never duplicates relations.
  console.log('Linking authors and museums...')
  const contentsByAuthor = new Map<string, string[]>()
  for (const content of demoContents) {
    const id = contentIdByTitle[content.data.title]
    contentsByAuthor.set(content.authorEmail, [
      ...(contentsByAuthor.get(content.authorEmail) ?? []),
      id,
    ])
  }
  const toursByAuthor = new Map<string, string[]>()
  for (const tour of demoTours) {
    const id = tourIdByTitle[tour.data.title]
    toursByAuthor.set(tour.authorEmail, [...(toursByAuthor.get(tour.authorEmail) ?? []), id])
  }
  for (const user of demoUsers) {
    const userId = userIdByEmail[user.email]
    const current = await payload.findByID({ collection: 'users', id: userId, depth: 0 })
    await payload.update({
      collection: 'users',
      id: userId,
      data: {
        authoredContents: [
          ...new Set([
            ...(current.authoredContents ?? []).map((entry) =>
              typeof entry === 'string' ? entry : entry.id,
            ),
            ...(contentsByAuthor.get(user.email) ?? []),
          ]),
        ],
        authoredTours: [
          ...new Set([
            ...(current.authoredTours ?? []).map((entry) =>
              typeof entry === 'string' ? entry : entry.id,
            ),
            ...(toursByAuthor.get(user.email) ?? []),
          ]),
        ],
      },
    })
  }
  for (const museum of demoMuseums) {
    const museumId = museumIdByKey[museum.key]
    const current = await payload.findByID({ collection: 'museums', id: museumId, depth: 0 })
    const tours = demoTours
      .filter((tour) => tour.museumKey === museum.key)
      .map((tour) => tourIdByTitle[tour.data.title])
    await payload.update({
      collection: 'museums',
      id: museumId,
      data: {
        objects: [
          ...new Set([
            ...(current.objects ?? []).map((entry) =>
              typeof entry === 'string' ? entry : entry.id,
            ),
            ...(objectIdByName[museum.object] ? [objectIdByName[museum.object]] : []),
          ]),
        ],
        tours: [
          ...new Set([
            ...(current.tours ?? []).map((entry) => (typeof entry === 'string' ? entry : entry.id)),
            ...tours,
          ]),
        ],
      },
    })
  }

  console.log('Seeding user-museum memberships...')
  // One membership per demo user: alternating Director/Curator roles. The
  // unique (user, museum) index keeps re-seeds idempotent.
  const membershipSeed = demoUsers.map((user, index) => ({
    user: userIdByEmail[user.email],
    museum: museumIdByKey[demoMuseums[index].key],
    role: roleIdsByCode[index % 2 === 0 ? 'Director' : 'Curator'],
  }))
  for (const membership of membershipSeed) {
    if (!membership.role) continue
    const existingMembership = await payload.find({
      collection: 'user-museum-memberships',
      where: {
        and: [
          { user: { equals: membership.user } },
          { museum: { equals: membership.museum } },
        ],
      },
      limit: 1,
      depth: 0,
    })
    if (existingMembership.docs.length > 0) continue
    await payload.create({ collection: 'user-museum-memberships', data: membership })
    console.log('Membership created')
  }

  console.log('Seeding demo purchases...')
  // Receipts for the paid contents/tours above, so the profile "purchases"
  // tab and the entitlement checks have data without hitting Stripe.
  const purchaseSeed = [
    {
      user: userIdByEmail['davide@example.com'],
      target: { relationTo: 'tours' as const, value: tourIdByTitle['Capolavori della Galleria Borghese'] },
      productTitle: 'Capolavori della Galleria Borghese',
      amountCents: 1200,
      status: 'paid' as const,
    },
    {
      user: userIdByEmail['chiara@example.com'],
      target: {
        relationTo: 'tours' as const,
        value: tourIdByTitle['Palazzo Reale tra Ottocento e Avanguardia'],
      },
      productTitle: 'Palazzo Reale tra Ottocento e Avanguardia',
      amountCents: 900,
      status: 'paid' as const,
    },
    {
      user: userIdByEmail['luca@example.com'],
      target: {
        relationTo: 'contents' as const,
        value: contentIdByTitle['Galileo e la nascita della scienza moderna'],
      },
      productTitle: 'Galileo e la nascita della scienza moderna',
      amountCents: 499,
      status: 'paid' as const,
    },
    {
      user: userIdByEmail['anna@example.com'],
      target: { relationTo: 'tours' as const, value: tourIdByTitle['Pompei al MANN'] },
      productTitle: 'Pompei al MANN',
      amountCents: 1500,
      status: 'refunded' as const,
    },
    {
      user: userIdByEmail['paolo@example.com'],
      target: {
        relationTo: 'contents' as const,
        value: contentIdByTitle['Venezia e il mito della Serenissima'],
      },
      productTitle: 'Venezia e il mito della Serenissima',
      amountCents: 299,
      status: 'paid' as const,
    },
  ]
  for (const [index, purchase] of purchaseSeed.entries()) {
    const stripeSessionID = `cs_seed_demo_${index + 1}`
    const foundId = await findId('purchases', 'stripeSessionID', stripeSessionID)
    if (foundId) continue
    await payload.create({
      collection: 'purchases',
      data: {
        ...purchase,
        stripeSessionID,
        stripePaymentIntentID: `pi_seed_demo_${index + 1}`,
        currency: 'eur',
        email: demoUsers[index].email,
        purchasedAt: '2026-04-01T10:00:00.000Z',
      },
    })
    console.log(`Purchase ${stripeSessionID} created`)
  }

  console.log('Database seeded successfully. Closing connection...')
  await payload.destroy()
  console.log('Payload connection closed. Exiting process.')
  process.exit(0)
} catch (e) {
  console.error('Error seeding database:', e)
  process.exit(1)
}
