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
     * No colour literals in the shell or in a section's layout. Same rule and same
     * reasoning as web/eslint.config.js: a second theme stays a token file only while
     * every component reads var(--ds-*).
     *
     * The palette and glassware editors are exempt by path. Their job is to show and
     * edit literal colour and path values, and a preview that read a token instead of
     * the value being edited would not be a preview.
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