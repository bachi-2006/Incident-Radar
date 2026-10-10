import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      ".firebase/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "public_firebase/**",
      "public/**",
      "test-cases-repo/**",
      "sdk/**",
      "workato/**",
    ],
  },
  ...compat.extends("next/core-web-vitals"),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-this-alias": "off",
      "@typescript-eslint/no-require-imports": "off",
      "no-unused-vars": "off",
      "prefer-const": "warn",
    },
  },
];

export default eslintConfig;
