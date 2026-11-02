'use strict';
const globals = require('globals');

module.exports = [
  {
    ignores: ['node_modules/**', 'transcripts/**'],
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none' }],
      'no-dupe-keys': 'error',
      'no-unreachable': 'error',
      'no-const-assign': 'error',
      'no-func-assign': 'error',
      'no-self-assign': 'error',
      'no-unsafe-finally': 'error',
      'no-unexpected-multiline': 'error',
      'require-atomic-updates': 'off',
    },
  },
];
