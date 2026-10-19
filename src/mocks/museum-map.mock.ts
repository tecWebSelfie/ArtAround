import {
  BlockNode,
  BuildingNode,
  DoorNode,
  LevelNode,
  SceneMaterial,
  SiteNode,
  SlabNode,
  WallNode,
  WindowNode,
  ZoneNode,
  createBoxBlockTopology,
  type AnyNode,
  type AnyNodeId,
  type ParsedBuildJson,
} from '@pascal-app/core'
import { ExitEntranceNode as MuseumExitEntranceNode } from '@/lib/pascal/museum-plugin/ExitEntranceNode'
import { ServiceNode, type ServiceType } from '@/lib/pascal/museum-plugin/ServiceNode'

type Point = [number, number]

const rectangle = (x: number, z: number, width: number, depth: number): Point[] => [
  [x, z],
  [x + width, z],
  [x + width, z + depth],
  [x, z + depth],
]

/** Fictional 720 m² museum, open at the roof so its circulation is visible. */
export function createRealisticMuseumMap(
  museumId: string,
  options: { unplacedService?: ServiceType } = {},
): ParsedBuildJson {
  const key = museumId.replace(/[^a-zA-Z0-9_]/g, '_')
  const siteId = `site_${key}` as const
  const buildingId = `building_${key}` as const
  const levelId = `level_${key}` as const
  const nodes: Record<AnyNodeId, AnyNode> = {}
  const levelChildren: AnyNodeId[] = []
  const materials: Record<string, SceneMaterial> = {}

  function material(name: string, color: string, glass = false) {
    const id = `mat_${key}_${name}`
    materials[id] = SceneMaterial.parse({
      id,
      name,
      material: {
        preset: 'custom',
        properties: {
          color,
          roughness: glass ? 0.15 : 0.7,
          transparent: glass,
          opacity: glass ? 0.3 : 1,
        },
      },
    })
    return `scene:${id}`
  }

  const palette = {
    wall: material('Intonaco avorio', '#eee8dd'),
    stone: material('Pietra chiara', '#d8cebb'),
    wood: material('Rovere', '#9e714b'),
    dark: material('Metallo antracite', '#343b3e'),
    glass: material('Vetro delle vetrine', '#b4d7df', true),
    garden: material('Verde della corte', '#6f8c67'),
    blue: material('Sala pittura', '#a6bac5'),
    rose: material('Sala moderna', '#c7a397'),
    ochre: material('Sala archeologia', '#c8b694'),
    bronze: material('Scultura in bronzo', '#8c7850'),
  }

  function add<T extends AnyNode>(node: T): T {
    nodes[node.id] = node
    if (node.parentId === levelId) levelChildren.push(node.id)
    return node
  }

  function wall(name: string, start: Point, end: Point, exterior = false) {
    return add(
      WallNode.parse({
        id: `wall_${key}_${name}`,
        name,
        parentId: levelId,
        start,
        end,
        height: 3.4,
        thickness: exterior ? 0.3 : 0.18,
        slots: { interior: palette.wall, exterior: palette.wall },
      }),
    )
  }

  function door(host: WallNode, along: number, name: string, width = 1.6, opening = true) {
    const node = add(
      DoorNode.parse({
        id: `door_${key}_${name}`,
        name,
        parentId: host.id,
        wallId: host.id,
        position: [along, 1.2, 0],
        width,
        height: 2.4,
        openingKind: opening ? 'opening' : 'door',
        doorType: width > 1.2 ? 'double' : 'hinged',
        leafCount: width > 1.2 ? 2 : 1,
        threshold: false,
        slots: { panel: palette.wood, glass: palette.glass },
      }),
    )
    host.children.push(node.id)
  }

  function window(host: WallNode, along: number, name: string, width = 1.8) {
    const node = add(
      WindowNode.parse({
        id: `window_${key}_${name}`,
        name,
        parentId: host.id,
        wallId: host.id,
        position: [along, 2, 0],
        width,
        height: 1.6,
        slots: { frame: palette.dark, glass: palette.glass },
      }),
    )
    host.children.push(node.id)
  }

  function block(
    name: string,
    x: number,
    y: number,
    z: number,
    width: number,
    height: number,
    depth: number,
    finish: string,
  ) {
    add(
      BlockNode.parse({
        id: `block_${key}_${name}`,
        name,
        parentId: levelId,
        position: [x, y, z],
        topology: createBoxBlockTopology(width, height, depth),
        slots: { body: finish },
      }),
    )
  }

  function room(
    name: string,
    number: string,
    x: number,
    z: number,
    width: number,
    depth: number,
    finish: string,
  ) {
    add(
      ZoneNode.parse({
        id: `zone_${key}_${number}`,
        name,
        parentId: levelId,
        polygon: rectangle(x, z, width, depth),
        spaceRole: 'room',
        roomNumber: number,
        ceilingHeight: 3.4,
        floorFinish: 'Pavimento museale',
        wallFinish: 'Intonaco avorio',
      }),
    )
    add(
      SlabNode.parse({
        id: `slab_${key}_${number}`,
        name: `Pavimento — ${name}`,
        parentId: levelId,
        polygon: rectangle(x + 0.1, z + 0.1, width - 0.2, depth - 0.2),
        elevation: 0.05,
        thickness: 0.05,
        slots: { surface: finish },
      }),
    )
  }

  const south = wall('Facciata ingresso', [0, 0], [30, 0], true)
  const east = wall('Facciata est', [30, 0], [30, 24], true)
  const north = wall('Facciata nord', [30, 24], [0, 24], true)
  const west = wall('Facciata ovest', [0, 24], [0, 0], true)
  door(south, 15, 'Ingresso principale', 2.8, false)
  door(north, 5.5, 'Uscita di sicurezza est', 1.4, false)
  door(west, 12, 'Uscita di sicurezza ovest', 1.4, false)
  for (const [index, offset] of [3, 6, 24, 27].entries())
    window(south, offset, `Vetrata foyer ${index}`)
  for (const [index, offset] of [11, 14, 19, 22].entries())
    window(east, offset, `Vetrata est ${index}`)
  for (const [index, offset] of [3, 6, 18, 21].entries())
    window(west, offset, `Vetrata ovest ${index}`)

  const foyer = wall('Foyer e distribuzione', [0, 6], [30, 6])
  door(foyer, 4, 'Accesso bookshop')
  door(foyer, 15, 'Accesso alle collezioni', 3)
  door(foyer, 24, 'Accesso servizi', 1.1, false)
  door(foyer, 28, 'Accesso caffetteria', 1.2)
  wall('Bookshop e ingresso', [8, 0], [8, 6])
  wall('Ingresso e servizi', [22, 0], [22, 6])
  wall('Servizi e caffetteria', [26, 0], [26, 6])

  const westAccess = wall('Accesso ala ovest', [0, 9], [11, 9])
  const eastAccess = wall('Accesso ala est', [19, 9], [30, 9])
  door(westAccess, 5.5, 'Ingresso archeologia', 2)
  door(eastAccess, 5.5, 'Ingresso pittura', 2)
  const westRooms = wall('Archeologia e scultura', [0, 16], [11, 16])
  const eastRooms = wall('Pittura e arte moderna', [19, 16], [30, 16])
  door(westRooms, 5.5, 'Passaggio scultura', 2)
  door(eastRooms, 5.5, 'Passaggio arte moderna', 2)

  const courtSouth = wall('Corte sud', [11, 9], [19, 9])
  const courtNorth = wall('Corte nord', [11, 17], [19, 17])
  const courtWest = wall('Corte ovest', [11, 9], [11, 24])
  const courtEast = wall('Corte est', [19, 9], [19, 24])
  door(courtSouth, 4, 'Ingresso corte', 2.4, false)
  door(courtNorth, 4, 'Ingresso mostra temporanea', 2.4, false)
  door(courtWest, 11, 'Scultura e mostra temporanea', 2)
  door(courtEast, 11, 'Arte moderna e mostra temporanea', 2)
  window(courtWest, 4, 'Vetrata corte ovest', 5)
  window(courtEast, 4, 'Vetrata corte est', 5)

  room('Bookshop', '01', 0, 0, 8, 6, palette.wood)
  room('Foyer e biglietteria', '02', 8, 0, 14, 6, palette.stone)
  room('Servizi accessibili', '03', 22, 0, 4, 6, palette.stone)
  room('Caffetteria', '04', 26, 0, 4, 6, palette.wood)
  room('Galleria di distribuzione', '05', 0, 6, 30, 3, palette.stone)
  room('Archeologia', '06', 0, 9, 11, 7, palette.ochre)
  room('Scultura', '07', 0, 16, 11, 8, palette.stone)
  room('Pittura italiana', '08', 19, 9, 11, 7, palette.blue)
  room('Arte moderna', '09', 19, 16, 11, 8, palette.rose)
  room('Mostre temporanee', '10', 11, 17, 8, 7, palette.stone)
  room('Corte delle sculture', '11', 11, 9, 8, 8, palette.garden)

  block('Banco biglietteria', 14, 0.05, 3, 5, 1.1, 0.9, palette.wood)
  block('Banco informazioni', 17, 0.05, 3.7, 0.9, 1.1, 2.3, palette.wood)
  block('Espositore bookshop A', 2, 0.05, 3, 0.5, 1.8, 3, palette.wood)
  block('Espositore bookshop B', 6, 0.05, 3, 0.5, 1.8, 3, palette.wood)
  block('Lavabi', 24, 0.05, 1, 2, 0.85, 0.6, palette.stone)
  block('Cabina servizi', 25, 0.05, 3, 1.6, 2.2, 1.8, palette.wall)

  for (const [index, x] of [2.5, 5.5, 8.5].entries()) {
    block(`Vetrina ${index} base`, x, 0.05, 12.5, 1.5, 0.85, 0.9, palette.wood)
    block(`Vetrina ${index} vetro`, x, 0.9, 12.5, 1.5, 0.7, 0.9, palette.glass)
    block(`Reperto ${index}`, x, 0.9, 12.5, 0.3, 0.4, 0.3, palette.bronze)
  }
  for (const [index, [x, z]] of [
    [3, 20],
    [8, 20],
    [15, 13],
    [15, 21],
  ].entries()) {
    block(`Piedistallo ${index}`, x, 0.05, z, 1.3, 0.8, 1.3, palette.stone)
    block(`Scultura ${index}`, x, 0.85, z, 0.5, 1.4, 0.65, palette.bronze)
  }
  for (const [index, z] of [10.8, 13.4, 18, 21].entries()) {
    block(`Cornice ${index}`, 29.7, 1.25, z, 0.1, 1.2, 1.8, palette.wood)
    block(
      `Opera ${index}`,
      29.63,
      1.32,
      z,
      0.04,
      1.06,
      1.66,
      index < 2 ? palette.bronze : palette.blue,
    )
  }
  for (const [index, [x, z]] of [
    [5.5, 14.8],
    [24.5, 13],
    [24.5, 20],
    [15, 7.5],
  ].entries()) {
    block(`Panca ${index} seduta`, x, 0.45, z, 2.6, 0.12, 0.65, palette.wood)
    for (const dx of [-0.9, 0.9])
      block(`Panca ${index} gamba ${dx}`, x + dx, 0.05, z, 0.12, 0.4, 0.5, palette.dark)
  }
  for (const [index, z] of [2, 4.5].entries()) {
    block(`Tavolino bar ${index}`, 28, 0.75, z, 1.2, 0.08, 0.8, palette.wood)
    block(`Tavolino bar ${index} base`, 28, 0.05, z, 0.12, 0.7, 0.12, palette.dark)
  }
  block('Fioriera corte A', 12.2, 0.05, 10.2, 1.4, 0.45, 1.4, palette.stone)
  block('Fioriera corte B', 17.8, 0.05, 15.8, 1.4, 0.45, 1.4, palette.stone)

  add(
    LevelNode.parse({
      id: levelId,
      name: 'Piano terra',
      parentId: buildingId,
      level: 0,
      height: 3.8,
      children: levelChildren,
    }),
  )
  add(
    BuildingNode.parse({
      id: buildingId,
      name: 'Museo civico — corte centrale',
      parentId: siteId,
      children: [levelId],
    }),
  )
  add(
    SiteNode.parse({
      id: siteId,
      name: 'Lotto del museo',
      children: [buildingId],
      polygon: { type: 'polygon', points: rectangle(-3, -4, 36, 31) },
    }),
  )

  // Keep navigation and service fixtures in the same scene graph as geometry.
  // Marker kinds are root nodes and their plugin id makes them render in Pascal.
  const markers = [
    ServiceNode.parse({
      id: `service_${key}_bathrooms`,
      name: 'Bagni accessibili',
      position: [24, 0, 3],
      service: 'bathrooms',
      placed: true,
    }),
    ServiceNode.parse({
      id: `service_${key}_food`,
      name: 'Caffetteria',
      position: [28, 0, 3],
      service: 'food',
      placed: true,
      openingHours: {
        monday: [{ opening: '09:00', closing: '17:30' }],
        tuesday: [{ opening: '09:00', closing: '17:30' }],
        wednesday: [{ opening: '09:00', closing: '17:30' }],
        thursday: [{ opening: '09:00', closing: '19:00' }],
        friday: [{ opening: '09:00', closing: '17:30' }],
        saturday: [{ opening: '10:00', closing: '18:00' }],
        sunday: [{ opening: '10:00', closing: '18:00' }],
        notes: 'La cucina chiude mezz’ora prima.',
      },
    }),
    ServiceNode.parse({
      id: `service_${key}_shop`,
      name: 'Bookshop',
      position: [4, 0, 3],
      service: 'shop',
      placed: true,
    }),
    ServiceNode.parse({
      id: `service_${key}_infoPoint`,
      name: 'Biglietteria e informazioni',
      position: [16, 0, 3],
      service: 'infoPoint',
      placed: true,
    }),
    MuseumExitEntranceNode.parse({
      id: `exitEntrance_${key}_main`,
      name: 'Ingresso principale',
      position: [15, 0, 0.5],
      direction: 'entrance',
      placed: true,
    }),
    MuseumExitEntranceNode.parse({
      id: `exitEntrance_${key}_north`,
      name: 'Uscita di sicurezza',
      position: [5.5, 0, 23.5],
      direction: 'exit',
      placed: true,
    }),
  ]
  if (options.unplacedService) {
    markers.push(
      ServiceNode.parse({
        id: `service_${key}_unplaced_${options.unplacedService}`,
        name: 'Servizio da posizionare',
        service: options.unplacedService,
        placed: false,
      }),
    )
  }
  // Plugin marker kinds are not part of Pascal's AnyNode union.
  for (const marker of markers) (nodes as Record<string, unknown>)[marker.id] = marker

  return {
    nodes,
    rootNodeIds: [siteId, ...markers.map((marker) => marker.id)],
    materials,
    installedPlugins: ['artaround:museum-plugin'],
  }
}
