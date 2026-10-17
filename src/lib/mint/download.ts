/**
 * Downloads an artifact (GLB, thumbnail, preview…) from a Mint CDN URL into
 * memory and returns the bytes plus the server-asserted content type.
 *
 * ⚠️ SERVER-ONLY by convention (do not add the `server-only` package import:
 * it throws under tsx-run Payload CLIs, see mint-server-client.ts).
 *
 * The Mint SDK returns short-lived signed *URLs* only — bytes always come
 * from a plain HTTP GET. Kept dependency-free on purpose: the whole helper
 * is smaller than any download library's install size, and the throw-on-!ok
 * contract is what makes failed (or truncated) downloads visible to the
 * job retries instead of persisting corrupt files.
 */
export async function downloadMintArtifact(
  url: string,
): Promise<{ buffer: Buffer; mimetype: string }> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to download artifact (${res.status}) from ${url}`)
  }
  return {
    buffer: Buffer.from(await res.arrayBuffer()),
    mimetype: res.headers.get('content-type') ?? 'application/octet-stream',
  }
}
