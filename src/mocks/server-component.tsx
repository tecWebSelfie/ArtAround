/**
 * Stories for async Server Components.
 *
 * Storybook's `experimentalRSC` only wraps stories in Suspense; React then
 * renders async components on the client, where every re-render starts a new
 * promise. In Vitest that never settles (the next story in the page times out
 * at 15s), and even when it does, play functions can run against the empty
 * Suspense fallback.
 *
 * Instead, `serverComponentStory` resolves the component in a Storybook
 * loader, the way the server would before streaming: the component is awaited,
 * then every nested element whose type is an async function (e.g.
 * `MuseumPage` → `<ObjectsCarousel>`, also inside props like `tabs[].panel`) is
 * awaited and replaced by its output. Client components are left for React.
 * Loaders finish before render and play, and rerun when args change.
 *
 *   const meta = {
 *     title: 'Search/Tours Results',
 *     ...serverComponentStory(ToursSearchResults),
 *   } satisfies Meta<typeof story.component>   // with const story = serverComponentStory(…)
 */
import type { Meta } from '@storybook/nextjs-vite'
import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react'

type AsyncComponent = (props: unknown) => Promise<ReactNode>

const isAsyncComponent = (type: unknown): type is AsyncComponent =>
  typeof type === 'function' && type.constructor.name === 'AsyncFunction'

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' &&
  value !== null &&
  Object.getPrototypeOf(value) === Object.prototype

/**
 * Await every async Server Component in `value`, depth-first. Elements can sit
 * in any prop, not just `children`, so arrays and plain objects are walked
 * too; anything else (mock data leaves, class instances, functions) is
 * returned untouched, and unchanged objects keep their identity.
 */
async function resolveServerTree<T>(value: T, seen = new WeakSet<object>()): Promise<T> {
  if (isValidElement(value)) {
    const element = value as ReactElement<Record<string, unknown>>
    if (isAsyncComponent(element.type)) {
      return resolveServerTree((await element.type(element.props)) as T, seen)
    }
    const props = await resolveServerTree(element.props, seen)
    if (props === element.props) return value
    // `Children.toArray` keys a children list, so the rebuilt list stays keyed.
    const { children, ...rest } = props
    return (
      Array.isArray(children)
        ? cloneElement(element, rest, ...Children.toArray(children as ReactNode))
        : cloneElement(element, props)
    ) as T
  }
  if (typeof value !== 'object' || value === null || seen.has(value)) return value
  seen.add(value)

  if (Array.isArray(value)) {
    const items = await Promise.all(value.map((item) => resolveServerTree(item, seen)))
    return (items.some((item, i) => item !== value[i]) ? items : value) as T
  }
  if (!isPlainObject(value)) return value
  const entries = await Promise.all(
    Object.entries(value).map(async ([k, v]) => [k, await resolveServerTree(v, seen)] as const),
  )
  return (entries.some(([k, v]) => v !== value[k]) ? Object.fromEntries(entries) : value) as T
}

/**
 * Meta fields for a story of an async Server Component, or of an async
 * function that composes one (e.g. maps flat args to its props).
 */
export function serverComponentStory<P extends object>(render: (props: P) => Promise<ReactNode>) {
  const meta: Pick<Meta<(props: P) => ReactNode>, 'component' | 'loaders' | 'render'> = {
    // The real reference keeps docgen prop tables; Storybook never renders it
    // because `render` below returns the loaded tree.
    component: render as unknown as (props: P) => ReactNode,
    loaders: [
      async ({ args }) => ({ serverTree: await resolveServerTree(await render(args as P)) }),
    ],
    render: (_args, { loaded }) => <>{loaded.serverTree as ReactNode}</>,
  }
  return meta as Required<typeof meta>
}
