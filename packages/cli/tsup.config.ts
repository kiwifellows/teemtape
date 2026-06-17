import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  clean: true,
  sourcemap: true,
  // Bundle the workspace client so the published CLI is self-contained.
  noExternal: ["@teemtape/api-client"],
});
