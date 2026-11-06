import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypeScript from 'eslint-config-next/typescript'
import storybook from 'eslint-plugin-storybook'

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypeScript,

  {
    rules: {
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',

      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          args: 'after-used',
          ignoreRestSiblings: false,
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^(_|ignore)',
        },
      ],
    },
  },

  {
    // Vendored LiveKit agents-ui components, kept as published so they can be
    // re-copied: these React Compiler rules flag intentional patterns there
    // (state that follows the agent state, module-level icon components).
    files: ['src/components/agents-ui/**', 'src/hooks/agents-ui/**'],
    rules: {
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/static-components': 'off',
    },
  },

  {
    // `.claude/**`: the nested git worktrees of Claude sessions (full copies of
    // the project, with their own node_modules, that made `eslint .` run out of
    // memory) and the skill copies of `.agents/skills`, linted at their source.
    //
    // `storybook-static/**` and the test reports are generated output (ignored
    // by git, but ESLint doesn't read .gitignore): the built Storybook alone is
    // tens of MB of minified bundles, enough to exhaust the heap.
    ignores: [
      '.next/**',
      '.claude/**',
      'storybook-static/**',
      'test-results/**',
      'playwright-report/**',
      'coverage/**',
      'src/payload-types.ts',
      'src/payload-generated-schema.ts',
    ],
  },

  ...storybook.configs['flat/recommended'],
]

export default eslintConfig
