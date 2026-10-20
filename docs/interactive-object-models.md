# Interactive object models

The map editor's Mantine button opens Pascal's existing ItemsPanel. Ready objects
use Pascal's built-in cards and placement tool. Objects without models appear in
an adjacent collapsible list with Generate actions. Create and Generate open the
same Mantine modal, using useForm, Dropzone, and notifications.

## Flow

1. TanStack Query reads objects through the Payload SDK. `objectAsset()` adapts
   saved models to `AssetInput` with `source: 'library'`.
2. For a new object, the create command saves its title and description while
   suppressing automatic model generation for that request. Image uploads use
   Mint's generated SDK and stable upload idempotency keys.
3. The generation command queues `interactiveObjectModel` and returns the job
   immediately. The browser starts Payload's built-in jobs runner and polls the
   job document with the ordinary Payload SDK.
4. The workflow loads the object, starts Mint in review mode, and waits until
   `preview_ready`. Its task output stores the operation and preview assets.
   A completed preview job means the preview can be reviewed.
5. The modal shows Mint's preview image. Revise queues another preview workflow
   with feedback. Approve queues `finalizeObjectModel`, referencing the completed
   preview job. The endpoint derives the Mint operation ID from that job.
6. Finalization approves Mint, waits for the final model and settled credits,
   then reuses `persistMintModelAssets` to save the GLB and link `Object.model`.
7. When the final job completes, the client invalidates the object and catalog
   queries. Position calls Pascal's `activateCatalogItem()` with the saved asset.
   Pascal owns cursor placement, commit, cancel, undo, and scene-node creation.
   The editor's existing save callback persists the museum map.

Both workflows use Payload's `interactive-models` queue and the same per-object
concurrency key. Mint polling uses asynchronous timers, bounded to thirty minutes.
The first job completes at preview; no job waits on a human decision.

## Default model (info standee)

Every object is placeable, even without a Mint model (generation failed, still
pending, or never started). `placeableObjectAsset()` in
`src/lib/pascal/object-assets.ts` returns the object's Mint asset when it has
one and otherwise the bundled default: a matte exhibition info standee
(`public/models/default-standee.glb`, ~10 KB, 0.35 × 1.09 × 0.26 m, origin at
the floor centre, +Y up, reading side facing +Z). Its catalog thumbnail is the
object's own thumbnail, or `public/models/default-standee.svg`. The asset keeps
the Payload object ID and the `museum-objects` category, so `museumObjectId()`,
`syncMuseumObjects` and the curator map guard treat it like any other object.
Objects on the default model also stay in the "Needs a model" list.

Placed nodes store the model URL, so a model generated later does not change
them immediately. On the next save of the museum map, `syncMuseumObjects`
replaces the standee's `src`, `thumbnail` and `dimensions` with the object's
Mint asset (`upgradeDefaultModelNode()`), keeping the node ID, position and
rotation. Until then, editors and visitors still see the standee.

Pascal renders item GLBs at native size, so the model is in real metres.
Regenerate it with `pnpm models:standee` (`scripts/generate-default-standee.mjs`,
three.js `GLTFExporter` in Node with a small `FileReader` polyfill). The script
reloads the file with `GLTFLoader` and prints its bounding box; if the size
changes, update `DEFAULT_MODEL_DIMENSIONS` in `object-assets.ts`.

## Existing APIs and contracts

- `src/lib/model-generation-client.ts` exposes TanStack query/mutation options.
  The UI uses `useQuery` and `useMutation` rather than a separate status store.
- Generated Hey API Zods validate Mint generation, revision, uploads, and returned
  operations on both sides. `payloadMintJSONField()` derives Payload JSON Schema
  from those Zods. Job types come from regenerated Payload input/output schemas.
- `POST /api/objects/create-for-model` saves a new object without the automatic
  generation hook. `POST /api/objects/:id/generate-model` validates start, revise,
  or approve commands and queues the corresponding workflow.
- There is no custom generation-status endpoint. Native `payload-jobs` reads are
  restricted to the requesting user's interactive jobs.
- The installed browser SDK has no `jobs.queue()` method. Its `request()` calls
  the command endpoint and built-in `GET /api/payload-jobs/run`. The latter runs
  queued work; it cannot create a job from arbitrary workflow input.
- The narrow `/api/mint/v1` bridge uses generated SDK calls with server-only
  credentials for reference uploads and fresh operation/model reads.

## Runtime and retry behavior

Payload's existing in-process autoRun checks the interactive queue every five
seconds as a backup to the browser's immediate runner request. The deployed
Next.js process must stay running. Closing the modal does not cancel server work;
reopening restores the latest job. At preview, Mint waits for user approval.
After approval, finalization can finish while the editor is closed.

Stable command IDs deduplicate retries; Mint idempotency keys protect remote
submissions. Per-object concurrency coordinates executing interactive jobs.
These safeguards do not provide exactly-once persistence across arbitrary server
failures: the existing persistence task retains a crash window between media
creation and linking the object. Museum-specific authorization remains separate.

No Pascal patch or new dependency is needed for this feature. The asset adapter
converts Payload upload URLs to absolute URLs so Pascal does not send them to
its own CDN. Dimensions retain
Pascal's one-metre defaults because Payload has no physical-size fields. Catalog
reads currently use source-English titles; future localized reads should use the
project's existing localized endpoint contract.

## Verification

Focused integration tests mock Mint and cover preview waiting, revisions,
approval recovery, persistence, settled credits, duplicate submissions,
server-owned operation references, generated validation, and the asset adapter.
Storybook covers creation, approval, saved-model placement, resumed work, errors,
and the catalog. No test starts paid generation.
