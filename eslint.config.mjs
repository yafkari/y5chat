import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import convexPlugin from "@convex-dev/eslint-plugin";
import * as reactHooks from 'eslint-plugin-react-hooks';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends(
    // "next/core-web-vitals", See: https://github.com/vercel/next.js/issues/78813
    "next/typescript"),
  ...convexPlugin.configs.recommended,
  reactHooks.configs["recommended-latest"],
];

export default eslintConfig;
