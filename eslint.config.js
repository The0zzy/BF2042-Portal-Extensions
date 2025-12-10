const { defineConfig, globalIgnores } = require("eslint/config");

const globals = require("globals");
const typescriptEslint = require("@typescript-eslint/eslint-plugin");
const tsParser = require("@typescript-eslint/parser");
const js = require("@eslint/js");

const { FlatCompat } = require("@eslint/eslintrc");

const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all,
});

module.exports = defineConfig([
    {
        extends: compat.extends("eslint:recommended"),

        languageOptions: {
            globals: {
                ...globals.browser,
            },
        },

        rules: {
            indent: [
                "warn",
                4,
                {
                    SwitchCase: 1,
                },
            ],

            semi: ["error", "always"],

            quotes: [
                "error",
                "double",
                {
                    avoidEscape: true,
                },
            ],

            eqeqeq: ["error", "always"],
            "no-var": "error",
        },
    },
    {
        files: ["**/*.ts"],

        plugins: {
            "@typescript-eslint": typescriptEslint,
        },

        extends: compat.extends(
            "eslint:recommended",
            "plugin:@typescript-eslint/recommended"
        ),

        languageOptions: {
            parser: tsParser,

            parserOptions: {
                project: ["./tsconfig.json"],
            },
        },

        rules: {
            "@typescript-eslint/typedef": [
                "error",
                {
                    arrayDestructuring: true,
                    arrowParameter: true,
                    memberVariableDeclaration: true,
                    objectDestructuring: true,
                    parameter: true,
                    propertyDeclaration: true,
                    variableDeclaration: false,
                    variableDeclarationIgnoreFunction: true,
                },
            ],

            "@typescript-eslint/explicit-function-return-type": "error",
        },
    },
    globalIgnores([
        "**/dist",
        "**/vendors",
        "**/res",
        "**/temp",
        "**/eslint.config.js",
        "**/vite.config.ts",
    ]),
]);
