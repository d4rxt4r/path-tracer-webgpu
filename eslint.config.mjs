import globals from 'globals';
import pluginJs from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

export default [
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
