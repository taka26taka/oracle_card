import { FlatCompat } from '@eslint/eslintrc';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const compat = new FlatCompat({ baseDirectory: path.dirname(fileURLToPath(import.meta.url)) });
const config = [
  { ignores: ['.next/**', 'node_modules/**', 'out/**'] },
  ...compat.extends('next/core-web-vitals'),
  { rules: { 'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }], 'react-hooks/exhaustive-deps': 'error' } }
];

export default config;
