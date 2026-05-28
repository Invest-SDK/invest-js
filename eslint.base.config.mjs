import nx from '@nx/eslint-plugin';
import stylistic from '@stylistic/eslint-plugin';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: ['**/dist', '**/compiled'],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: [
            '^.*/eslint(\\.base)?\\.config\\.[cm]?js$',
            '^@t-tech/invest-sdk-node$',
            '^@ttech-pub/invest-sdk-node$',
            '^@ttech-pub/grpc-node-client$',
            '^@ttech-pub/invest-core$',
            '^@ttech-pub/invest-engine-node$',
            '^@ttech-pub/grpc-web-client$',
            '^@ttech-pub/grpc$',
            '^@ttech-pub/invest-rest-client$',
            '^@ttech-pub/invest-sdk-web$'
          ],
          depConstraints: [
            {
              sourceTag: '*',
              onlyDependOnLibsWithTags: ['*'],
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs',
    ],
    plugins: {
      '@stylistic': stylistic,
    },
    rules: {
      '@stylistic/eol-last': ['error', 'always'],
      '@stylistic/no-trailing-spaces': ["error", { "ignoreComments": true }],
      '@typescript-eslint/no-unused-vars': ["error", { "argsIgnorePattern": "^_" }]
    },
  },
];
