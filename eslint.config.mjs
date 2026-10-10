import { defineConfig } from "eslint/config";
import tsParser from "@typescript-eslint/parser";

export default defineConfig([
  {
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts"],
  },
  {
    files: ["**/*.{ts,tsx,js,jsx,mjs,cjs}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      "no-unused-vars": "off",
    },
  },
]);
