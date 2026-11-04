import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig([
  globalIgnores([
    'dist',
    'public/mockServiceWorker.js',
    'src/routeTree.gen.ts',
    'playwright-report',
    'test-results',
    '.lighthouseci',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: { globals: globals.browser },
    rules: {
      // Leading underscore marks values dropped on purpose (e.g. omitting fields via destructuring)
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
    },
  },
  {
    // Route files export `Route`, shadcn files export variants next to components, and the
    // mock dev panel mounts itself (it is not hot-reloaded app code)
    files: ['src/routes/**/*.tsx', 'src/components/ui/**/*.tsx', 'src/mocks/**/*.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
])
