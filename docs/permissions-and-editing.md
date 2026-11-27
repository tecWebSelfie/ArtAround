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

| Collection  | Read                                                  | Create                                | Update                                                                                                       | Delete                                                              |
| ----------- | ----------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| `museums`   | anyone                                                | any signed-in user (becomes director) | curator+ of it; non-map fields director-only (field access); curators' map saves limited to object placement | director                                                            |
| `objects`   | anyone                                                | curator+ of any museum                | owner (creator) only — museums manage objects through their map, not the object                              | super admin only (the catalog is a lasting object database)         |
| `contents`  | anyone; paid `body` restricted                        | any signed-in user                    | author                                                                                                       | author, or staff above the author's rank in a museum of the content |
| `tours`     | anyone                                                | any signed-in user                    | author                                                                                                       | author, or director of `tour.museum`                                |
| `users`     | anyone (email only to self or super admin, see below) | anyone (sign-up)                      | self                                                                                                         | self                                                                |
| `purchases` | own rows; super admin all                             | super admin (rows come from Stripe)   | super admin                                                                                                  | super admin                                                         |
| memberships | anyone                                                | roles below the actor's rank          | roles below the actor's rank, never own row                                                                  | roles below the actor's rank, never own row                         |

Super admins bypass all of the above.

### Relations (who owns the link)

- `tours.museum` (relationship) ⇄ `museums.tours` (join).
- `contents.author` / `tours.author` (relationship, set from the caller on
  create by `assignAuthor`; only a super admin may pick another author, and
  one left empty is theirs, so a signed-in create is never ownerless) ⇄
  `users.authoredContents` / `users.authoredTours` (joins).
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
  `canUpdateDoc` in `src/lib/doc-access.ts`) may **steer** it. For non-owners the endpoint drops the
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
  (`src/lib/price.ts`). A tour's price = sum of its locked visitable contents.
- Display: `formatPrice(cents, lng)` (`Intl.NumberFormat`, EUR). Choosing and
  converting a local currency needs region + exchange rates → payments work.

### User emails (private to self and super admins)

The auth-injected `email` (and `sessions`) is redeclared in
`src/collections/Users.ts` with field-level `read` access
(`selfOrAdminField`). Payload merges it with its base field, so `unique`, the
index and the lowercase/trim hook stay. Field access removes the value from
every access-checked response and makes Payload reject `where`/`sort` on it
(REST, GraphQL, count, relation paths), which closes the "does this address
have an account" oracle. Because that validation has no document to compare
with, only super admins may filter by email; a visitor reads their own address
from `/api/users/me` or their own document.
`hidePrivateFields` stays as a second layer for Local API reads that skip field
access (`overrideAccess` defaults to true). Spec:
`tests/int/nightly/email-enumeration.int.spec.ts`, `user-email-privacy.int.spec.ts`.

### Purchases (Stripe, sandbox)

- `POST /api/checkout { collection: 'contents' | 'tours', id }` prices the
  purchase for the signed-in buyer with `quoteCheckout`
  (`src/lib/checkout-quote.ts`), reading the document _as the buyer_: a
  content costs its `price` while locked; a tour costs the sum of its
  **visitable** contents locked for the buyer (the stored
  `tours.visitableContents` through `withVisitableStops`, the list the tour page
  prices with: an unavailable stop is neither charged nor unlocked). Nothing
  locked → 409, also when the tour's only locked stops are unavailable. The
  quote's content ids travel in the Checkout Session metadata (`unlocks`, at
  most 20, counted on visitable stops).
- `checkout.session.completed` (webhook, `src/hooks/onCheckoutCompleted.ts`)
  and the success page (reconciliation) both call `recordPurchaseFromSession`,
  idempotent on `stripeSessionID`. The row stores `target` (what was bought)
  and `unlockedContents` (a snapshot of the visitable locked contents at
  purchase time: paid contents added to a tour later, or a stop that becomes
  available later, are not unlocked for free).
- Ownership (`ownsContent`) = a `paid` purchase whose target is the content or
  whose `unlockedContents` contains it. Refunded/failed rows unlock nothing.
- UI: the tour page's "Unlock" modal starts checkout for the tour; the sandbox
  shop `/[lng]/stripe-test` lists every paid content and the tours with a paid
  visitable stop (priced like the checkout). Success/cancel pages return to the tour (`?collection=&id=`).

### Reading on behalf of a visitor

Local API bypasses access unless told otherwise. Server pages use
`src/lib/session.ts`:

- `getSession()` — Payload + current user from request cookies.
- `asViewer()` — spread into Local API calls (`user`, `overrideAccess: false`).
- `can(collection, id, 'update' | 'delete', field?)` — Payload's own
  `docAccessOperation` (through `docPermissions` in `src/lib/doc-access.ts`,
  shared with custom endpoints), so edit buttons follow the exact server rules.

`resolveLocalized()` takes `user` and always reads with access control.

Lists of tours go through `findListedTours(payload, options)`
(`src/lib/listed-tours.ts`) instead of `payload.find({ collection: 'tours' })`:
it ANDs the list rule (`LISTED_TOURS`: no planned visits, no visit copies)
with the caller's `where` and reads as the visitor (`asViewer()`) unless the
caller passes `overrideAccess` itself. The navigator rails, a work's and a
content's tours and `/search/tours` use it; the museum page's `tours` join
takes `LISTED_TOURS` directly, and in-memory filters use `isPersonalTour`.
`LISTED_TOURS` also leaves out tours with no visitable stop (next section;
in-memory: `isEmptyTour`), and the planned visits and visit copies stay
reachable by link as before.

### Visitable stops (derived, server-written)

Product rule: a stop a visitor can't visit (its content is gone or unreadable,
is about no object, or its object isn't placed on the museum map:
`unavailableStops`) is never shown to visitors; only its author's editor lists
it, flagged. Navigation applies the rule live (`visitableTour`); lists, cards,
counts and search need it in a query or on tours read without the museum map,
so tours store it: `tours.visitableStops` (count, indexed) and
`tours.visitableContents` (the ids in tour order, `maxDepth: 0`). Both are
read-only in the admin and denied to every client write (field access
`create`/`update: false`, and the `syncVisitableStops` hook drops whatever a
save carries first), so only the server writes them.

- **One definition.** `computeVisitableContentIds`
  (`src/lib/visitable-stops.ts`) builds navigation's own inputs (placed objects
  `museumPlacedObjects`, the objects that list each stop, readable stops) and
  calls `visitableTour`. Readable = public, or authored by the tour's author
  (the group-cookie rule of `readContents`; other authors' private stops can't
  be added since `guardTourContents`, and legacy ones count as unavailable).
  Paid locked stops are visitable (only their body is withheld). A museum with
  no usable map drops only the stops whose content is gone, as in navigation.
- **When it is recomputed:** the tour's own save (`beforeChange`, only when its
  stops, museum or author change, or it has no value yet); a museum's map save
  when the placed objects changed (`Museums.ts`, that museum's tours); an
  object's `contents` change or deletion (`Objects.ts`, the tours including
  those contents); a content's visibility/author change (`Contents.ts`, the
  tours including it). A content's deletion removes it from its tours instead
  (next bullet), which recomputes them in the same write.
- **A deleted content leaves its tours** (`removeContentsFromTours`,
  `src/lib/tour-stop-cleanup.ts`, from `Contents.afterDelete` after
  `detachDeletedContentFromQuestions`, same transaction). Only a hard delete:
  an object leaving the map or a detached content stays derived and
  reversible. Per tour it drops the id from `contents`, the stop's `directions`
  and the `quiz.questions` that no longer concern a stop, recomputes the
  visitable stops and the search row (price included), and leaves purchases
  alone. It writes through the adapter (`db.updateOne`, no hooks), which is how
  it passes `validateTourStops` (minimum stops), `required`/`minRows` and
  `validateQuizQuestions`: a system cleanup must not be refused. A tour whose
  last stop is deleted is KEPT with empty `contents` (never deleted
  automatically): 0 visitable stops, hidden by `LISTED_TOURS`, still readable
  by its author, whose next save asks for stops again.
- **Cost and loops.** `refreshVisitableStops` reads the affected tours, writes
  only the ones whose value actually changed, one after the other (a MongoDB
  session doesn't take concurrent operations), through `req` so it joins the
  caller's transaction and rolls back with it. The write is a direct adapter
  `db.updateOne`: no tour hooks run (no validation of the whole tour, quiz
  cleanup, `updatedAt` bump), so it can't loop back into the collections that
  trigger it and needs no `context` flag. It then refreshes the search rows of
  the changed tours. Derived data: a failure is logged, never fails the save.
- **Lists.** `LISTED_TOURS` requires `visitableStops` missing (not backfilled
  yet: fail open, so a database that hasn't run the backfill doesn't empty
  every list) or greater than 0. Readers outside navigation read a tour through
  `withVisitableStops` (`src/lib/tour-summary.ts`), which keeps only
  `visitableContents`; `summarizeTour` does it itself.
- **Backfill.** `pnpm tours:backfill-visitable`
  (`src/scripts/backfill-visitable-stops.ts`, idempotent) first drops ids of
  contents that no longer exist from the tours listing them (deleted before the
  cleanup above), then fills tours saved before the field; `pnpm seed` does it for the tours it finds again.
- **Direct link to a tour with no visitable stop:** still opens (404 would
  tell nothing the author doesn't already know, and a shared link shouldn't
  turn into an error when a stop is removed from the map): its page shows a
  notice instead of stops and has no "Start tour", and its start page sends
  the visitor back to the tour page. Its author keeps the editor, which lists
  every stop and flags the unavailable ones (it opens even with `contents: []`
  and asks for stops on save). Nothing else is offered either (`hasNoStopsToVisit`,
  `src/lib/tour-stops.ts`): every page of the tour's navigation branch
  redirects to the tour page (its layout), the quiz and its results are a 404
  (`getTourQuiz`), `POST /api/rooms` answers 422 `empty`, a room whose tour
  emptied afterwards shows as ended, and checkout has nothing to unlock (409).
  Spec: `tests/e2e/empty-tour.e2e.spec.ts`.

Tests: `tests/int/visitable-stops.int.spec.ts`, `tests/int/tour-stop-cleanup.int.spec.ts`.

## Private contents and tours

`visibility` (`public` | `private`) on contents and tours (`src/lib/visibility.ts`,
`VisibilityInput` in the forms). Read access returns a query: public documents,
the caller's own, and — for group-visit guests — the tour named by the signed
`aa-group-tour` cookie and those of its contents that are public or authored by
the tour's author, never another user's private content the tour lists
(see [group tours](group-tours.md)).
Private documents are never indexed (`skipSync`, `hideFromSearch` hooks,
`refreshSearchDocs`). Save rules: a private content can't be sold
(`guardVisibility`), nor made private once bought or used in another author's
tour; a public tour can't include private contents (`guardTourContents`), and
no tour (public or private) can list another author's private content: only
that author can read it, so everyone else would meet an unavailable stop. The
rule follows the tour's author (a super admin gets no exception) and refuses
only stops the save adds (not in `originalDoc.contents`), so a tour saved
before it still saves and its author's editor flags the stops to fix.
Tests: `tests/int/visibility.int.spec.ts`.

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
   - museum color (Info tab, `MuseumAppearanceForm`): `brandColor`, director
     only (field access like the other metadata). The hook `syncMuseumPalette`
     derives the read-only `palette` on save and the field `validate` refuses
     saturated red and orange (DESIGN.md → The Museum Primary Rule);
   - object: name, description — owner;
   - content: title, difficulty, price, rights holder, licence and the body
     (rich text, TipTap loaded on demand) — author (`ContentEditForm`, fields
     shared with `ContentForm` through `ContentFields`). Rights
     (`src/lib/content-rights.ts`, hooks `guardRights` on contents and
     `guardNonCommercialContents` on tours): the holder is the author or a
     museum where the author is curator or director (`rightsMuseum`); a new
     content needs the author's declaration that the text is theirs
     (`rightsDeclaredAt`, stamped by the server); a paid content is always
     "all rights reserved"; a tour that sells contents can't include another
     author's NC content. The credit line ("© holder year · licence") is
     computed, never typed;
   - own profile: first/last name, bio (+ sign out).
2. **Dedicated pages** (complex relations):
   - `/[lng]/content/new?object=<id>` — full content form; sends
     `attachToObject`. The query param is just a shareable prefill.
   - `/[lng]/content/[id]/edit` — redirects to the content page (the body
     is edited inline there now).
   - `/[lng]/tour/new?museum=<id>` | `?from=<tourId>` (customize a copy) |
     `?from=<tourId>&visit=1` ("Edit" on the tour's start page,
     `tourCopyPath(…, { visit: true })`: the visitor's own copy for this
     visit, never the original. The copy records its provenance in
     `tours.visitCopyOf` (set on create, never reassigned); the
     `keepVisitCopyPrivate` hook keeps it private (an anonymous copy, below,
     excepted), `LISTED_TOURS` (through
     `findListedTours`) keeps it
     out of every list like a planned visit, and the editor opens its start
     page once saved. "Edit" again — on the original or on the copy — reopens
     the visitor's copy (`existingVisitCopy`) instead of copying again. Saved
     on the server rather than on the device so a group can follow it: the
     room, the guests' cookie and every navigation page read tours by id) and
     `/[lng]/tour/[id]/edit` — `TourForm`: vertical timeline of stops,
     reordered by drag (grip handle, `@dnd-kit/react`, auto-scroll + keyboard)
     or up/down buttons (precise on long tours, WCAG 2.5.7 alternative);
     locked stops are flagged so they can be replaced. Stops that can no longer
     be visited (object off the map, or content gone; `getTourEditorData(museumId, stopIds)`) stay
     in the list, flagged "No longer on show, visitors skip it", with a summary
     alert offering to remove them all; they are never dropped on save. That
     is the author's own tour. A copy (`?from=`, customize or visit) starts
     with no such stops and no notice (`getNewTourEditorData`,
     `src/lib/tour-copy.ts`): it drops stops that are unavailable, unreadable
     by the visitor or another author's private content (the copy's author is
     the visitor), and their directions. With none (or fewer than
     `minStopsFor`) left, the form just asks for more stops.
     Adding stops: a quick select, or "Browse contents" → `/[lng]/search/contents`
     in picker mode (`?pick=tour&museum=&returnTo=&have=`: only the museum's
     exhibited contents, each with "Add to tour" or "In the tour", locked ones
     priced) and "Write a new content" → `/[lng]/content/new?museum=&returnTo=`
     (object limited to the museum's exhibited ones). Both come back to the
     editor with `?draft=1&add=<id>`; the unsaved draft waits in sessionStorage.
     URL helpers and `returnTo` validation (tour editors only, no open
     redirect) live in `src/lib/tour-picker.ts`.
     **Without an account**, anyone can customize a tour they can read
     ("Customize tour" on the tour page, "Replace the paid contents" in its
     purchase modal, "Edit" on the start page, "Customize the stops" in the
     "Plan my visit" preview): `/tour/new?from=` opens `TourForm` in its
     `anonymous` mode, always a visit copy. Only the stops, their order and
     the start entrance change (no title, texts, directions, cover, quiz or
     "Write a new content", neither in the editor nor in the contents
     picker), and `/api/tour-copy` saves it: rate limited,
     refused to signed-in callers (their copy stays owned and private,
     through REST), the original read as the visitor (a private one is not
     found and the page asks to sign in), every stop checked against the
     candidates the editor offered (`anonymousCopyStops`), the title and
     texts copied from the original. The copy has no author, so
     `keepVisitCopyPrivate` leaves it public: a private authorless tour would
     be readable by nobody. Like a planned visit it is unlisted and
     unsearchable, reachable by its link, and nobody can edit it: "Edit" on
     it makes a new copy. A blank `/tour/new` still needs a session.
     The editor sums the stops' reading time plus the planner's walk per
     stop, so a planned visit's budget stays visible; a removed stop can be undone from its toast; a copy of a planned tour goes back to its planner preview.
   - `/[lng]/museum/new` — creates a museum (creator becomes director).
   - `/[lng]/museum/[id]/members` — staff list with typed CRUD on memberships.
   - Museum page actions: "Add objects to the map" (map editor, curator+),
     "Add tour", "Add content", "Staff".
   - Adding objects to a museum = placing them on its map. Besides the
     editor's own catalog panel, "Browse the catalog" opens
     `/[lng]/search/objects?pick=museum&museum=<id>` (map editors only): the
     whole catalog with filters, objects already on the map marked "On show",
     the others with "Place on the map" → back to the editor with
     `?place=<objectId>`, the object in hand for one click on the map; "Create
     a new object" → `?create=1` opens the model-generation modal. Pascal's
     autosave (with an exit flush) keeps unsaved map edits across the trip;
     the editor drops the params with `history.replaceState` (a
     `router.replace` would reload the scene). See `src/lib/museum-picker.ts`.
   - "Your museums" (`/[lng]/my-museums`): directors, curators and verified
     creators reach it from their own profile; one row per museum with the
     tools their role opens there (map, staff, QR labels; or a new tour or
     content). The navigation bars carry no museums menu.
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
8. Users: another user's profile has no `email` and a `where`/`sort` on it is
   refused (400), also through relations (`author.email`); a signed-in user
   may still filter by their own; self-update cannot set
   `isSuperAdmin`/`roles`.
9. Purchases: anonymous → 401 at checkout; a tour whose contents the buyer can
   already read → 409; a paid tour purchase makes its contents' `body` readable
   to the buyer only; a refunded row unlocks nothing; users read only their
   own `purchases`. Public REST sign-up with `isSuperAdmin: true` is stripped.
10. Data migration for existing databases: tours need `museum`, contents and
    tours `author`, museums a map re-save to fill `objects`.
