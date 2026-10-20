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
import { ItemNode, LevelNode, type ParsedBuildJson, ZoneNode } from '@pascal-app/core'
import { mockMuseumFull } from './mocks/museum.mock'
import { createRealisticMuseumMap } from './mocks/museum-map.mock'

const editorDefaultConfig = await editorConfigFactory.default({
  config: await config, // Your Payload Config
})

const htmlToRichText = (html: string) =>
  convertHTMLToLexical({
    editorConfig: editorDefaultConfig,
    JSDOM,
    html,
  })

/**
 * Stands catalog objects in the scene, one per room of the realistic map, so
 * the museum exhibits them: `museums.objects` is derived from the placed
 * `museum-objects` items when the museum is saved (`syncMuseumObjects`).
 */
function placeObjects(map: ParsedBuildJson, objects: { id: string; name: string }[]) {
  const nodes = map.nodes as Record<string, unknown>
  const level = Object.values(nodes).find((node) => LevelNode.safeParse(node).success) as
    { id: string; children?: string[] } | undefined
  const rooms = Object.values(nodes).flatMap((node) => {
    const zone = ZoneNode.safeParse(node)
    return zone.success && zone.data.spaceRole === 'room' ? [zone.data] : []
  })
  if (!level || !rooms.length) return map
  objects.forEach((object, index) => {
    const polygon = rooms[index % rooms.length]!.polygon
    const x = polygon.reduce((sum, [px]) => sum + px, 0) / polygon.length
    const z = polygon.reduce((sum, [, pz]) => sum + pz, 0) / polygon.length
    const item = ItemNode.parse({
      parentId: level.id,
      position: [x, 0, z],
      asset: {
        id: object.id,
        name: object.name,
        category: 'museum-objects',
        // Placeholder model: demo objects have no generated 3D model yet.
        src: 'http://localhost:3000/models/Avatar.glb',
        thumbnail: '',
      },
    })
    nodes[item.id] = item
    level.children = [...(level.children ?? []), item.id]
  })
  return map
}

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
  // users → categories → contents → objects → museums (objects placed on
  // their maps) → tours → memberships → purchases. Reverse sides (authored
  // contents/tours, museum tours/objects) are joins or derived, never written.
  // Every lookup is by natural key, so re-running the seed only adds what is
  // missing. Five documents per editorial collection keeps the catalog demo
  // realistic while staying small enough to inspect by hand.
  const findId = async (
    collection:
      'users' | 'museums' | 'objects' | 'contents' | 'tours' | 'museumCategories' | 'purchases',
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
  // `author` is set explicitly (the seed runs without a user); `objects` is
  // the join over `objects.contents`, filled when the objects are created.
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
          {
            label: 'Galleria Borghese — collezione permanente',
            url: 'https://galleriaborghese.beniculturali.it',
          },
        ],
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
        // Paid content: exercises the checkout/entitlement path in the app.
        price: 499,
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
        price: 299,
      },
    },
  ] satisfies {
    authorEmail: string
    data: Omit<RequiredDataFromCollectionSlug<'contents'>, 'objects'>
  }[]
  const contentIdByTitle: Record<string, string> = {}
  for (const content of demoContents) {
    const foundId = await findId('contents', 'title', content.data.title)
    if (foundId) {
      contentIdByTitle[content.data.title] = foundId
      console.log(`Content "${content.data.title}" already exists, skipping`)
      continue
    }
    const created = await payload.create({
      collection: 'contents',
      // `objects: {}` satisfies the generated type of the (read-only) join.
      data: { ...content.data, objects: {}, author: userIdByEmail[content.authorEmail] },
    })
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
      condition: {
        state: 'good' as const,
        notes: 'Piccole ritocchi precedenti; vernice uniforme.',
      },
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
  // The full story fixture first: a complete editable scene with services and
  // entrances/exits. Story mocks use synthetic ids for related records, so
  // those relations are omitted and MongoDB creates real Payload records.
  const {
    id: _mockId,
    createdAt: _mockCreatedAt,
    updatedAt: _mockUpdatedAt,
    thumbnails: _mockThumbnails,
    tours: _mockTours,
    staff: _mockStaff,
    objects: _mockObjects,
    ...fullMuseumSeed
  } = mockMuseumFull
  if (!(await findId('museums', 'name', fullMuseumSeed.name))) {
    await payload.create({ collection: 'museums', data: fullMuseumSeed })
    console.log(`Museum "${fullMuseumSeed.name}" created`)
  }

  // A museum exhibits an object by placing it on its map (`museums.objects`
  // is derived from the saved scene), so each demo museum gets the realistic
  // scene with its signature object standing in the first room.
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
      map: placeObjects(
        createRealisticMuseumMap(`seed-${museum.key}`),
        objectId ? [{ id: objectId, name: museum.object }] : [],
      ),
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

  // Persist the tour mock scenarios as connected Payload records. Story mocks
  // use placeholder IDs, so create their contents and objects before tours.
  console.log('Seeding demo tour content and objects...')
  const demoMuseum = await payload.find({
    collection: 'museums',
    where: { name: { equals: 'Museo Civico di Esempio' } },
    limit: 1,
    depth: 0,
  })
  const demoMuseumId = demoMuseum.docs[0]?.id
  if (!demoMuseumId || !superAdminId) {
    throw new Error('The demo museum and super admin are required to seed tours')
  }

  const tourStops = [
    {
      objectName: 'Anfora a figure rosse',
      objectDescription: 'Anfora attica con scena di banchetto, databile al V secolo a.C.',
      contentTitle: '[DEV] Storia della ceramica attica',
      contentBody: 'Introduzione alla ceramica attica a figure rosse e alle sue tecniche.',
      difficulty: 'easy' as const,
      copyright: '© Museo Civico di Esempio',
    },
    {
      objectName: 'Statua in marmo di atleta',
      objectDescription: 'Statua in marmo pario raffigurante un atleta in movimento.',
      contentTitle: '[DEV] Il restauro del bronzo',
      contentBody: 'Come si restaura una statua: pulitura, consolidamento e integrazione.',
      difficulty: 'medium' as const,
      copyright: '© Museo Civico di Esempio',
    },
    {
      objectName: 'Mosaico pavimentale',
      objectDescription: 'Frammento di mosaico romano con motivi geometrici.',
      contentTitle: '[DEV] Leggere un dipinto rinascimentale',
      contentBody: 'Iconografia, prospettiva e committenza nella pittura del Rinascimento.',
      difficulty: 'hard' as const,
      copyright: '© Museo Civico di Esempio',
    },
  ]
  const seededStops: { objectId: string; contentId: string }[] = []
  for (const stop of tourStops) {
    const foundContent = await payload.find({
      collection: 'contents',
      where: { title: { equals: stop.contentTitle } },
      locale: 'en',
      limit: 1,
      depth: 0,
    })
    const content =
      foundContent.docs[0] ??
      (await payload.create({
        collection: 'contents',
        locale: 'en',
        data: {
          title: stop.contentTitle,
          body: htmlToRichText(`<p>${stop.contentBody}</p>`),
          copyright: stop.copyright,
          difficulty: stop.difficulty,
          objects: {},
          author: superAdminId,
        },
      }))

    const foundObject = await payload.find({
      collection: 'objects',
      where: { name: { equals: stop.objectName } },
      locale: 'en',
      limit: 1,
      depth: 0,
    })
    const object =
      foundObject.docs[0] ??
      (await payload.create({
        collection: 'objects',
        locale: 'en',
        context: { skipMintModelGeneration: true },
        data: {
          name: stop.objectName,
          description: stop.objectDescription,
          contents: [content.id],
        },
      }))
    seededStops.push({ objectId: String(object.id), contentId: String(content.id) })
  }

  // Objects join a museum only by being placed on its map (museums.objects is
  // derived from the saved scene), so the seeded stops stay catalog-only until
  // staff position them in the map editor.

  console.log('Seeding demo tours of the example museum...')
  const tourSeeds = [
    {
      title: '[DEV] Capolavori del museo civico',
      description: 'Un percorso tra tre opere e le loro storie.',
      contents: seededStops.map(({ contentId }) => contentId),
    },
    {
      title: '[DEV] Il restauro del bronzo',
      description: 'Una visita breve dedicata alle tecniche di restauro.',
      contents: [seededStops[1]!.contentId],
    },
    {
      title: '[DEV] Mosaici e geometrie antiche',
      description: 'Motivi geometrici e tecniche dell’arte antica.',
      contents: [seededStops[2]!.contentId],
    },
  ]
  for (const tour of tourSeeds) {
    const found = await payload.find({
      collection: 'tours',
      where: { title: { equals: tour.title } },
      limit: 1,
      depth: 0,
    })
    const doc =
      found.docs[0] ??
      (await payload.create({
        collection: 'tours',
        data: {
          ...tour,
          museum: demoMuseumId,
          author: superAdminId,
        },
      }))
    console.log(`Tour "${tour.title}" ready (${doc.id})`)
  }

  console.log('Seeding demo tours...')
  // A tour's price is not stored: it is what its paid contents cost the
  // visitor (`src/lib/price.ts`), so only the museum and author are linked.
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
      },
    },
  ] satisfies {
    museumKey: string
    authorEmail: string
    data: Omit<RequiredDataFromCollectionSlug<'tours'>, 'museum'>
  }[]
  const tourIdByTitle: Record<string, string> = {}
  for (const tour of demoTours) {
    const foundId = await findId('tours', 'title', tour.data.title)
    if (foundId) {
      tourIdByTitle[tour.data.title] = foundId
      console.log(`Tour "${tour.data.title}" already exists, skipping`)
      continue
    }
    const created = await payload.create({
      collection: 'tours',
      data: {
        ...tour.data,
        museum: museumIdByKey[tour.museumKey],
        author: userIdByEmail[tour.authorEmail],
      },
    })
    tourIdByTitle[tour.data.title] = String(created.id)
    console.log(`Tour "${tour.data.title}" created`)
  }

  console.log('Seeding user-museum memberships...')
  // One membership per demo user: alternating Director/Curator roles. The
  // unique (user, museum) index keeps re-seeds idempotent.
  const membershipSeed = demoUsers.map((user, index) => ({
    user: userIdByEmail[user.email],
    museum: museumIdByKey[demoMuseums[index].key],
    role: index % 2 === 0 ? MUSEUM_FUNCTION_DIRECTOR : MUSEUM_FUNCTION_CURATOR,
  }))
  for (const membership of membershipSeed) {
    const existingMembership = await payload.find({
      collection: 'user-museum-memberships',
      where: {
        and: [{ user: { equals: membership.user } }, { museum: { equals: membership.museum } }],
      },
      limit: 1,
      depth: 0,
    })
    if (existingMembership.docs.length > 0) continue
    await payload.create({ collection: 'user-museum-memberships', data: membership })
    console.log('Membership created')
  }

  console.log('Seeding demo purchases...')
  // Receipts that exercise the entitlement paths without hitting Stripe
  // (`src/access/entitlements.ts`): a direct content purchase, a tour purchase
  // that unlocks the tour's paid content, and a refund that unlocks nothing.
  // Buyers are not the authors, who can always read their own contents.
  const galileoContent = contentIdByTitle['Galileo e la nascita della scienza moderna']
  const veniceContent = contentIdByTitle['Venezia e il mito della Serenissima']
  const purchaseSeed = [
    {
      buyer: 'davide@example.com',
      target: { relationTo: 'contents' as const, value: galileoContent },
      unlockedContents: [galileoContent],
      productTitle: 'Galileo e la nascita della scienza moderna',
      amountCents: 499,
      status: 'paid' as const,
    },
    {
      buyer: 'chiara@example.com',
      target: {
        relationTo: 'tours' as const,
        value: tourIdByTitle['Itinerario del potere a Palazzo Ducale'],
      },
      unlockedContents: [veniceContent],
      productTitle: 'Itinerario del potere a Palazzo Ducale',
      amountCents: 299,
      status: 'paid' as const,
    },
    {
      buyer: 'anna@example.com',
      target: {
        relationTo: 'tours' as const,
        value: tourIdByTitle['Galileo: strumenti e scoperte'],
      },
      unlockedContents: [galileoContent],
      productTitle: 'Galileo: strumenti e scoperte',
      amountCents: 499,
      status: 'refunded' as const,
    },
  ]
  for (const [index, { buyer, ...purchase }] of purchaseSeed.entries()) {
    const stripeSessionID = `cs_seed_demo_${index + 1}`
    const foundId = await findId('purchases', 'stripeSessionID', stripeSessionID)
    if (foundId) continue
    await payload.create({
      collection: 'purchases',
      data: {
        ...purchase,
        user: userIdByEmail[buyer],
        stripeSessionID,
        stripePaymentIntentID: `pi_seed_demo_${index + 1}`,
        currency: 'eur',
        email: buyer,
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
