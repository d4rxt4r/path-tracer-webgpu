import globals from 'globals';
import pluginJs from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

export default [
    { ignores: ['lib/**', 'node_modules/**', 'artifacts/**', '.worktrees/**'] },
    { files: ['scripts/**/*.mjs', 'tests/**/*.mjs'], languageOptions: { globals: globals.node } },
    { languageOptions: { globals: globals.browser } },
    pluginJs.configs.recommended,
    eslintPluginPrettierRecommended,
    {
        rules: {
            'prettier/prettier': [
                'error',
                {
                    printWidth: 140,
                    singleQuote: true,
                    tabWidth: 4,
                    endOfLine: 'auto',
                    trailingComma: 'all',
                },
            ],
        },
    },
];
