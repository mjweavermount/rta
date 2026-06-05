import { defineConfig } from "tsup"

export default defineConfig([
  {
    entry: ["src/index.ts"],
    format: ["esm"],
    dts: true,
    clean: true,
    sourcemap: true,
  },
  {
    entry: ["bin/rta.ts"],
    format: ["esm"],
    dts: false,
    clean: false,
    sourcemap: true,
    banner: {
      js: "#!/usr/bin/env node",
    },
    outExtension: () => ({ js: ".js" }),
  },
])
