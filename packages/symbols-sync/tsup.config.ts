import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/cli.ts"],
  format: ["esm"],
  dts: false,
  clean: true,
  sourcemap: true,
  // Keep dependencies external; the package is run from the repo, not published.
  external: ["@teemtape/api-client", "commander"],
});
