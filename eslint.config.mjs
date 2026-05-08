import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Server Components / event handlers in this app legitimately call
      // Date.now() and setSavedAt(Date.now()) after an await — neither is
      // during a synchronous React render. These rules over-trigger.
      "react-hooks/purity": "off",
      // The "show then hide" timer pattern in SavedBadge is a clear use of
      // useEffect and setState; the new rule flags it but it is fine here.
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
