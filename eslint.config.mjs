import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

export default [
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      // No 'any' type
      '@typescript-eslint/no-explicit-any': 'error',
      
      // No console.log (only allow warn and error)
      'no-console': ['error', { allow: ['warn', 'error'] }],
      
      // No unused variables
      '@typescript-eslint/no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_' 
      }],
    },
  },
  {
    files: ['src/logger/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
];