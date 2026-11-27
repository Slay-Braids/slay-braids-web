import next from "eslint-config-next";

const config = [
  {
    ignores: [
      ".next/**",
      "out/**",
      "dist-preview/**",
      "node_modules/**",
      "test-results/**",
      "playwright-report/**",
      "next-env.d.ts",
    ],
  },
  ...next,
];

export default config;
