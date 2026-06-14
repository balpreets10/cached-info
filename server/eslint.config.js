import js from '@eslint/js';
import globals from 'globals';

/**
 * Flat ESLint config (ESLint 9+/10). Backend is ESM Node — no build step.
 */
export default [
  js.configs.recommended,
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'off',
    },
  },
  {
    files: ['src/**/*.test.js', 'src/**/*.spec.js'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
];
