/* eslint-disable @typescript-eslint/no-require-imports */
const eslint = require('@eslint/js')
const tseslint = require('typescript-eslint')
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended')
const reactPlugin = require('eslint-plugin-react')
const reactHooksPlugin = require('eslint-plugin-react-hooks')
const globals = require('globals')

module.exports = [
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser
      }
    }
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off'
    },
    settings: {
      react: { version: 'detect' }
    }
  },
  eslintPluginPrettierRecommended,
  {
    ignores: ['dist/*', 'node_modules/*']
  }
]
