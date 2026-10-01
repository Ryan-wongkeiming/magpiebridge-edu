import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './test/setup.ts',
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: [
      'node_modules/**',
      '.next/**',
      // 'test/**',  // Allow test files in test directory
      '**/*.config.{ts,tsx}',
      '**/*.d.ts',
      'outputs/**',
      'prisma/**',
      'scripts/**',
      'context/**',
      'docs/**',
      'HANDOFF_AI_AGENT_HARNESS_2026-09-04.md',
      'README.md',
      'AGENTS.md',
      'agents/**',
      'app/**',
      'components/**',
      'lib/**',
      'types/**',
      'middleware.ts',
      'next-env.d.ts',
      'next.config.js',
      'package.json',
      'package-lock.json',
      'postcss.config.js',
      'tailwind.config.ts',
      'tsconfig.json',
      'vitest.config.ts'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'test/**',
        '**/*.config.{ts,tsx}',
        '**/*.d.ts',
        'outputs/**',
        'prisma/**',
        'scripts/**',
        'context/**',
        'docs/**',
        'HANDOFF_AI_AGENT_HARNESS_2026-09-04.md',
        'README.md',
        'AGENTS.md',
        'agents/**',
        'app/**',
        'components/**',
        'lib/**',
        'types/**',
        'middleware.ts',
        'next-env.d.ts',
        'next.config.js',
        'package.json',
        'package-lock.json',
        'postcss.config.js',
        'tailwind.config.ts',
        'tsconfig.json',
        'vitest.config.ts'
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
    },
  },
  // Use the automatic JSX runtime so components that use JSX without an
  // explicit `import React from 'react'` (the Next.js 14 default) render
  // correctly under Vitest's esbuild transform.
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
});