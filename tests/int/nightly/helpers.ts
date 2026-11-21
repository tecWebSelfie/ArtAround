/**
 * Shared helpers of the nightly QA regression specs (`tests/int/nightly/`).
 *
 * These specs drive a RUNNING server over REST (`NIGHTLY_BASE_URL`, default
 * http://localhost:3000, e.g. `AI_MOCK=true pnpm start` with `pnpm seed:e2e`
 * data), the way an attacker or a hostile client would, so they exercise the
 * real access rules, hooks and route handlers rather than mocks. Every doc a
 * spec creates is registered in a `Sandbox` and removed by `sandbox.cleanup()`
 * (as the seeded super admin) in `afterAll`.
 */

export const BASE = process.env.NIGHTLY_BASE_URL ?? 'http://localhost:3000'

export type Reply = {
  status: number
  // oxlint-disable-next-line typescript/no-explicit-any -- raw REST bodies, asserted field by field
  json: any
  headers: Headers
}

export async function call(
  method: string,
  path: string,
  options: {
    token?: string
    body?: unknown
    cookie?: string
    headers?: Record<string, string>
  } = {},
): Promise<Reply> {
  const headers: Record<string, string> = { 'content-type': 'application/json', ...options.headers }
  if (options.token) headers.authorization = `JWT ${options.token}`
  if (options.cookie) headers.cookie = options.cookie
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    redirect: 'manual',
  })
  const text = await res.text()
  let json: unknown = text
  try {
    json = JSON.parse(text)
  } catch {
    // Not JSON (an HTML page): callers only look at the status then.
  }
  return { status: res.status, json, headers: res.headers }
}

const random = () => Math.random().toString(36).slice(2, 9)

export const richText = (text: string) => ({
  root: {
    type: 'root',
    format: '',
    indent: 0,
    version: 1,
    direction: 'ltr',
    children: [
      {
        type: 'paragraph',
        format: '',
        indent: 0,
        version: 1,
        direction: 'ltr',
        children: [
          { type: 'text', text, version: 1, format: 0, detail: 0, mode: 'normal', style: '' },
        ],
      },
    ],
  },
})

export type Account = { id: string; token: string; email: string }

/** Creates docs for a spec and deletes them, newest first, when it ends. */
export class Sandbox {
  private created: { collection: string; id: string }[] = []
  private adminToken: string | null = null

  async admin() {
    if (!this.adminToken) {
      const login = await call('POST', '/api/users/login', {
        body: { email: 'dev@payloadcms.com', password: 'test' },
      })
      this.adminToken = login.json.token as string
    }
    return this.adminToken
  }

  track(collection: string, id: string) {
    this.created.push({ collection, id })
  }

  /** A fresh public-signup account, logged in. */
  async user(prefix = 'qa'): Promise<Account> {
    const username = `${prefix}${random()}`
    const email = `${username}@qa.test`
    const password = 'Passw0rd!x'
    const signup = await call('POST', '/api/users', {
      body: { email, password, username, name: { firstName: 'Q', lastName: username } },
    })
    if (signup.status !== 201) throw new Error(`signup failed: ${signup.status}`)
    const login = await call('POST', '/api/users/login', { body: { email, password } })
    this.track('users', login.json.user.id)
    return { id: login.json.user.id, token: login.json.token, email }
  }

  /** Any museum of the seeded database and one of its objects (to hang contents on). */
  async anchors() {
    const museum = (await call('GET', '/api/museums?limit=1&depth=0')).json.docs[0].id as string
    const object = (await call('GET', '/api/objects?limit=1&depth=0')).json.docs[0].id as string
    return { museum, object }
  }

  /** A public content of `account` about `object`, optionally made private afterwards. */
  async content(account: Account, object: string, { priv = false } = {}) {
    const title = `qa-${random()}`
    const res = await call('POST', '/api/contents', {
      token: account.token,
      body: {
        title,
        body: richText(`secret body of ${title}`),
        difficulty: 'easy',
        rightsDeclaredAt: new Date().toISOString(),
        attachToObject: object,
      },
    })
    if (res.status !== 201) throw new Error(`content create failed: ${res.status}`)
    const id = res.json.doc.id as string
    this.track('contents', id)
    // A private content is saved public first, then flipped: see the
    // `private-content-create` spec for why a direct private create fails.
    if (priv) {
      const flip = await call('PATCH', `/api/contents/${id}`, {
        token: account.token,
        body: { visibility: 'private' },
      })
      if (flip.status !== 200) throw new Error(`content flip failed: ${flip.status}`)
    }
    return { id, title }
  }

  async tour(
    account: Account,
    museum: string,
    contents: string[],
    extra: Record<string, unknown> = {},
  ) {
    const res = await call('POST', '/api/tours', {
      token: account.token,
      body: { title: `qa-tour-${random()}`, museum, contents, ...extra },
    })
    if (res.status === 201) this.track('tours', res.json.doc.id)
    return res
  }

  async cleanup() {
    const token = await this.admin()
    // Tours first: a content used by a tour can't leave it dangling.
    const order = ['tours', 'contents', 'users']
    for (const collection of order) {
      for (const doc of this.created.filter((item) => item.collection === collection).reverse()) {
        await call('DELETE', `/api/${doc.collection}/${doc.id}`, { token })
      }
    }
    this.created = []
  }
}
