import * as esbuild from "esbuild";
const watch = process.argv.includes("--watch");
const opts = {
  entryPoints: ["src/main.ts"],
  bundle: true,
  format: "cjs",
  platform: "node",
  target: "node18",
  external: ["obsidian"],   // provided by Obsidian host; everything else bundled
  outfile: "main.js",
  logLevel: "info",
  sourcemap: false,
};
if (watch) { const ctx = await esbuild.context(opts); await ctx.watch(); }
else { await esbuild.build(opts); }
