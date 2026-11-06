// pnpm hook that rewrites the manifests of installed packages before
// resolution. Each fix states why it exists and when to remove it.

/**
 * @hey-api/openapi-ts (`pnpm openapi-ts`, the Mint SDK generator) builds the
 * generated code with TypeScript's JavaScript API (`ts.factory`), which
 * TypeScript 7.0 doesn't ship. It declares `typescript` as a peer dependency,
 * and pnpm resolves a peer from the project, which is on TypeScript 7: adding
 * a regular dependency (`packageExtensions`) is not enough, because the peer
 * still wins. So the peer is dropped and replaced by a private TypeScript 5.9.
 *
 * Remove this with the first openapi-ts release after 0.99.0: its main branch
 * (and the `next` dist-tag) already prints code with its own `ts-compiler`
 * and no longer depends on `typescript` at all
 * (`npm view @hey-api/openapi-ts peerDependencies` comes back empty).
 */
function readPackage(pkg) {
  if (pkg.name === '@hey-api/openapi-ts') {
    delete pkg.peerDependencies?.typescript
    pkg.dependencies = { ...pkg.dependencies, typescript: '~5.9.3' }
  }
  return pkg
}

module.exports = { hooks: { readPackage } }
