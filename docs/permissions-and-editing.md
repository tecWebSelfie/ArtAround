# Permissions and frontend editing

How ArtAround decides who may read and change museums, objects, contents,
tours and users, and how the frontend exposes editing. Server rules are
implemented, and so is the editing UI described below.

## Roles

Roles are **per museum** and stored as one `user-museum-memberships` row per
(user, museum) with a `role` select (`director` | `curator` | `verified`,
type `MuseumRole`). It is independent of the RBAC plugin's global roles:

| Role       | Rank | Granted by                        | Powers in that museum                                                                                                     |
| ---------- | ---- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `director` | 3    | creating the museum / super admin | everything on the museum (incl. structure, services, entrances/exits on the map), delete its tours, moderate contents     |
| `curator`  | 2    | the director                      | place/move/remove catalog objects on the map, create objects (owning them), moderate non-staff contents, grant `verified` |
| `verified` | 1    | curators and the director         | sell contents belonging to the museum                                                                                     |

- One director per museum; the seat moves only through a super admin.
- Whoever may grant a role may revoke it; nobody manages their own row or
  someone at/above their rank (`canManage` in `src/access/museumRoles.ts`).
- The RBAC plugin's global `users.roles` matrix is no longer used for app
  collections; it still adds `createdBy` (`targetCollections`) and powers the
  admin panel for super admins. Its `roles.museumFunction` field is now unused
  by any rule (candidate for removal).

Code map:

- `src/access/museumRoles.ts` — memberships cached in `req.context`, rank
  helpers, museum⇄object⇄content lookups.
- `src/access/entitlements.ts` — **purchase seam** (`getOwnedContentIds`,
  `ownsContent`), backed by the Stripe `purchases` collection through
  `src/lib/entitlements.ts` (memoized on `req.context`).
- `user-museum-memberships` access (`src/collections/Users.ts`) — staff
  management is plain collection CRUD guarded by `canManage`, so the UI uses
  the SDK's typed `payloadSdk.create/update/delete`.

## Rules per collection

| Collection  | Read                           | Create                                | Update                                                                                                       | Delete                                                              |
| ----------- | ------------------------------ | ------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| `museums`   | anyone                         | any signed-in user (becomes director) | curator+ of it; non-map fields director-only (field access); curators' map saves limited to object placement | director                                                            |
| `objects`   | anyone                         | curator+ of any museum                | owner (creator) only — museums manage objects through their map, not the object                              | super admin only (the catalog is a lasting object database)         |
| `contents`  | anyone; paid `body` restricted | any signed-in user                    | author                                                                                                       | author, or staff above the author's rank in a museum of the content |
| `tours`     | anyone                         | any signed-in user                    | author                                                                                                       | author, or director of `tour.museum`                                |
| `users`     | anyone (email only to self)    | anyone (sign-up)                      | self                                                                                                         | self                                                                |
| `purchases` | own rows; super admin all      | super admin (rows come from Stripe)   | super admin                                                                                                  | super admin                                                         |
| memberships | anyone                         | roles below the actor's rank          | roles below the actor's rank, never own row                                                                  | roles below the actor's rank, never own row                         |

Super admins bypass all of the above.

### Relations (who owns the link)

- `tours.museum` (relationship) ⇄ `museums.tours` (join).
- `contents.author` / `tours.author` (relationship, set from the caller on
  create) ⇄ `users.authoredContents` / `users.authoredTours` (joins).
- `museums.objects` is a **derived index** of the Pascal map: on every map
  save, `syncMuseumObjects` stores the ids of placed `museum-objects` items.
  `objects.museums` is its join. An object can exist without a museum and be
  exhibited by several; removing it from a map only un-exhibits it, it is
  never deleted. Exhibits were removed.
- Map ownership: curators may only add, move or remove `museum-objects`
  items. `guardCuratorMapEdits` diffs the stored and incoming scenes
  (`src/lib/pascal/map-permissions.ts`) and rejects any other node change
  with a 403 listing the nodes. The editor hides the structure and services
  tools for curators (`canManageStructure`).
- `objects.contents` stays the authored object → content relation (tour
  navigation reads it). Creating a content with the write-only
  `attachToObject: <objectId>` links it there without object-edit rights.
  A content belongs to one object only: `objects.contents` rejects a content
  already attached to another object (`validateExclusiveContents`).
- Object ownership: `createdBy` (RBAC plugin) is the owner. Only the owner
  edits the object's data. Objects without `createdBy` (seeded/legacy) are
  editable by super admins only.
- 3D model generation (`POST /api/objects/:id/generate-model`): any signed-in
  user may start it, but only the owner (same update rule, via
  `docAccessOperation`) may **steer** it. For non-owners the endpoint drops the
  client `generation` body (prompt, reference images) and rebuilds it from the
  object document: prompt from its name and description
  (`objectGenerationPrompt`), reference image from its stored thumbnail,
  uploaded to Mint as base64 through the generated SDK
  (`uploadReferenceImage`, best effort, text-only on failure). It rejects `revise`
  (feedback) with 403; `approve` is allowed. The editor mirrors this
  (`canSteerObject` in `src/lib/pascal/editor-viewer.ts`).

### Paid contents

- `contents.price` is integer **euro cents**; empty/0 = free.
- Setting or changing a price requires `verified`+ in a museum the content
  belongs to (`guardPaidContent`); keeping an existing price is always allowed.
- `body` read access (`canReadPaidBody`): free, or super admin, author,
  curator+ of one of its museums, or `ownsContent`.
- Locked = `price > 0 && body == null` as returned to the viewer
  (`src/lib/price.ts`). A tour's price = sum of its locked contents.
- Display: `formatPrice(cents, lng)` (`Intl.NumberFormat`, EUR). Choosing and
  converting a local currency needs region + exchange rates → payments work.

### Purchases (Stripe, sandbox)

- `POST /api/checkout { collection: 'contents' | 'tours', id }` prices the
  purchase for the signed-in buyer with `quoteCheckout`
  (`src/lib/checkout-quote.ts`), reading the document _as the buyer_: a
  content costs its `price` while locked; a tour costs the sum of its contents
  locked for the buyer. Nothing locked → 409. The quote's content ids travel in
  the Checkout Session metadata (`unlocks`, at most 20).
- `checkout.session.completed` (webhook, `src/hooks/onCheckoutCompleted.ts`)
  and the success page (reconciliation) both call `recordPurchaseFromSession`,
  idempotent on `stripeSessionID`. The row stores `target` (what was bought)
  and `unlockedContents` (a snapshot: paid contents added to a tour later are
  not unlocked for free).
- Ownership (`ownsContent`) = a `paid` purchase whose target is the content or
  whose `unlockedContents` contains it. Refunded/failed rows unlock nothing.
- UI: the tour page's "Unlock" modal starts checkout for the tour; the sandbox
  shop `/[lng]/stripe-test` lists every paid content and the tours containing
  one. Success/cancel pages return to the tour (`?collection=&id=`).

### Reading on behalf of a visitor

Local API bypasses access unless told otherwise. Server pages use
`src/lib/session.ts`:

- `getSession()` — Payload + current user from request cookies.
- `asViewer()` — spread into Local API calls (`user`, `overrideAccess: false`).
- `can(collection, id, 'update' | 'delete', field?)` — Payload's own
  `docAccessOperation`, so edit buttons follow the exact server rules.

`resolveLocalized()` takes `user` and always reads with access control.

## Frontend editing

Building blocks in `src/components/editing/` (Mantine + `@mantine/form` +
TanStack Query; writes through the typed `payloadSdk`, then `router.refresh()`):
`EditableSection` (view ⇄ form in place), `FormActions`, `useSave` +
`errorMessage` (`saving.ts`), `RichTextInput`, `PriceInput`, `ObjectPicker`,
`DeleteDocumentButton`, `LinkButton`, `MembersManager`, and `forms/*`.
Edit affordances are shown only when `can(...)` (Payload's own rules) allows.

1. **Inline metadata editing** (`EditableSection` on detail pages):
   - museum (Info tab): name, short description, description (rich text),
     email, address — director (`can('museums', id, 'update', 'name')`);
   - object: name, description — owner;
   - content: title, difficulty, copyright, price — author;
   - own profile: first/last name, bio (+ sign out).
2. **Dedicated pages** (complex relations):
   - `/[lng]/content/new?object=<id>` — full content form; sends
     `attachToObject`. The query param is just a shareable prefill.
   - `/[lng]/content/[id]/edit` — text (body) editing.
   - `/[lng]/tour/new?museum=<id>` | `?from=<tourId>` (customize a copy) and
     `/[lng]/tour/[id]/edit` — `TourForm`: vertical timeline of stops,
     reordered by drag (grip handle, `@dnd-kit/react`, auto-scroll + keyboard)
     or up/down buttons (precise on long tours, WCAG 2.5.7 alternative);
     locked stops are flagged so they can be replaced.
   - `/[lng]/museum/new` — creates a museum (creator becomes director).
   - `/[lng]/museum/[id]/members` — staff list with typed CRUD on memberships.
   - Museum page actions: "Add objects to the map" (map editor, curator+),
     "Add tour", "Add content", "Staff".
   - NavBar: account entry and a "My museums" menu for directors, curators
     and verified creators.
3. **Rich text**: Mantine `RichTextEditor` (`@mantine/tiptap`) edits HTML,
   seeded with `lexicalToHTML` (`src/lib/richtext.ts`); forms submit
   `bodyHTML` / `descriptionHTML`, converted server-side to Lexical by
   `richTextFromHtml` (`src/fields/richTextHtml.ts`, Payload's converter;
   jsdom is imported lazily — a top-level import breaks the Next bundle).
4. **Delete** — `DeleteDocumentButton` (confirm modal) when
   `can(collection, id, 'delete')`; contents and tours only.
5. **Auth** — Payload's own REST auth (`/api/users/{login,logout,me}`,
   `POST /api/users`) through `src/lib/auth-client.ts`, mirrored into React by
   `AuthProvider` (frontend layout):
   - server pages still read the session with `getSession()` (Local API
     `payload.auth({ headers })`); the tabs layout passes it to `NavBar` so the
     account entry renders before the client `/me` probe answers;
   - `/[lng]/login` and `/[lng]/signup` (`LoginForm`, `SignupForm`): email
     **or** username (`loginWithUsername.allowEmailLogin`); after success they
     go to `?next=` when it is a same-site path (`useReturnTo`), else the
     navigator. Signed-in visitors are redirected to their profile;
   - sign-up is a public `POST /api/users`; `sanitizePublicSignup` strips
     privileged fields on REST creates, `protectPrivilegedFields` on updates;
   - sign out (NavBar menu, profile `SignOutButton`) goes through
     `AuthProvider.logout()` then `router.refresh()`, so client and server
     views of the session change together;
   - the Payload admin panel is for super admins only (`Users.access.admin`);
     staff edit from the frontend.

### Editing localized fields

Editorial fields are lazily AI-translated **from `en`**, so frontend forms
always read and write the source locale (`SOURCE_LOCALE` in
`src/components/editing/saving.ts`): editing changes the original text and
the other translations go stale and refresh on their next read. Open
decision: whether user-generated contents should record their original
language (`sourceLocale`) and translate from it instead of `en`.

## Tests to run

Verified so far: typecheck/lint on the touched files and a unit-style check of
`curatorForbiddenChanges` with real Pascal nodes (add/move/remove an object
allowed, any other node change rejected). Not yet run against a database:

1. **Curator map save in the real editor** (priority). Sign in as a curator
   (not director) of a museum, open `/museum/:id/edit/mapeditor`, place, move
   and remove an object, save. Expected 200. If Pascal rewrites other nodes on
   save (levels, walls, metadata) the save gets a 403 whose `data.nodes` lists
   them. **Fallback if this gets complicated:** curators manage the whole map —
   remove `guardCuratorMapEdits` from `Museums.hooks.beforeChange` (the field
   access already limits curators to the map fields) and keep the editor's
   `canManageStructure` hiding as a soft UI rule.
2. Director save with services/entrances changes → 200; same change as curator → 403.
3. Paid content: anonymous and non-owner get no `body` via REST, `/localized`,
   the content page and tour navigation; author, curator/director of an
   exhibiting museum and super admin get it.
4. Price guard: a non-verified user setting `price` → 403; verified in the
   content's museum → 200.
5. Memberships (staff page / REST CRUD): director grants/revokes curator and verified; curator
   grants/revokes verified only; nobody edits their own row; non-staff → 403.
6. Museum creation makes the creator director (needs the seeded Director role).
7. Objects: non-owner update and `generate-model` → 403; delete by anyone but
   a super admin → 403; removing an object from a map un-exhibits it
   (`museums.objects`) without deleting it.
8. Users: another user's profile has no `email`; self-update cannot set
   `isSuperAdmin`/`roles`.
9. Purchases: anonymous → 401 at checkout; a tour whose contents the buyer can
   already read → 409; a paid tour purchase makes its contents' `body` readable
   to the buyer only; a refunded row unlocks nothing; users read only their
   own `purchases`. Public REST sign-up with `isSuperAdmin: true` is stripped.
10. Data migration for existing databases: tours need `museum`, contents and
    tours `author`, museums a map re-save to fill `objects`.
