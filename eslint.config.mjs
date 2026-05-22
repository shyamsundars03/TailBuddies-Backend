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
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
  // Allowed `any` (per project policy)
  {
    files: [
      'src/errors/app-error.ts',
      'src/middleware/error-handler.middleware.ts',
      'src/middleware/upload.middleware.ts',
      'src/repositories/**/*.ts',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    files: ['src/logger/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['src/utils/test-slot-generation.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
];
