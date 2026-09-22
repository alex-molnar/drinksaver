import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'coverage']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  {
    /**
     * Keep colour literals out of the shell and section layouts. The palette and
     * glassware editors are exempt because editing literal values is their job.
     */
    files: ['src/components/**/*.{ts,tsx}', 'src/sections/**/*.{ts,tsx}'],
    ignores: [
      '**/*.test.{ts,tsx}',
      'src/sections/palettes/**',
      'src/sections/glassware/**',
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/]',
          message:
            'No colour literals here. Read a token instead: var(--ds-*). Tokens live in src/theme.',
        },
      ],
    },
  },
])
