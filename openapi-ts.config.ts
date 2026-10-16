import { defineConfig } from '@hey-api/openapi-ts'

export default defineConfig({
  input: 'https://api.mint.gg/openapi.json',
  output: {
    path: 'src/lib/pascal/mint/client',
    postProcess: ['prettier'],
  },
  plugins: [
    '@hey-api/client-next',
    {
      name: '@tanstack/react-query',
      // Typed `...Options` for every GET (typed params + responses).
      queryOptions: {
        meta: (operation) => ({ id: operation.id }),
      },
      // Stable `...QueryKey` fns — needed to invalidate the library
      // list after a generation/optimization finishes.
      queryKeys: true,
      // Mint library endpoints (`GET /v1/models`, `/v1/assets`) use
      // cursor pagination (`pagination.nextCursor`).
      infiniteQueryOptions: {
        meta: (operation) => ({ id: operation.id }),
      },
      infiniteQueryKeys: true,
      // Typed `...Mutation` for every POST (`:generate`, `:approve`,
      // `:optimize`, `:retopologize`, …).
      mutationOptions: {
        meta: (operation) => ({ id: operation.id }),
      },
      mutationKeys: true,
    },
    'zod',
  ],
})
