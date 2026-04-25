/**
 * build.js - HArvest widget build script.
 *
 * Bundles all widget source files into two output files:
 *   dist/harvest.min.js              - stable alias, always latest build
 *   dist/harvest.min.{hash}.js       - content-addressed, changes only when
 *                                      content changes (for cache-busting)
 *
 * Both files are committed to the repository so HACS users and jsDelivr
 * consumers do not need a build toolchain.
 *
 * Build steps:
 *   1. Bundle src/harvest-entry.js with esbuild (ESM -> IIFE, minified)
 *   2. Compute a short content hash from the output bytes
 *   3. Write dist/harvest.min.{hash}.js
 *   4. Write dist/harvest.min.js (identical content, stable filename)
 *
 * Run:  node build.js
 * Watch: node build.js --watch
 */

import * as esbuild from "esbuild";
import { createHash } from "node:crypto";
import { writeFileSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_ENTRY = resolve(__dirname, "src/harvest-entry.js");
const DIST_DIR  = resolve(__dirname, "dist");
const PACK_ENTRY = resolve(__dirname, "src/packs/examples-pack.js");
const PACK_OUT   = resolve(__dirname, "../custom_components/harvest/packs/examples.js");

const isWatch = process.argv.includes("--watch");

/** @type {import("esbuild").BuildOptions} */
const buildOptions = {
  entryPoints: [SRC_ENTRY],
  bundle:      true,
  minify:      true,
  format:      "iife",
  target:      ["es2020"],
  charset:     "utf8",
  // Tree-shake unused renderer exports.
  treeShaking: true,
  write:       false,  // we handle writing ourselves for hash computation
  logLevel:    "info",
};

async function build() {
  const result = await esbuild.build(buildOptions);

  if (result.errors.length > 0) {
    console.error("Build failed:", result.errors);
    process.exit(1);
  }

  const outputBytes = result.outputFiles[0].contents;

  // Compute 8-character content hash (first 8 hex chars of SHA-256).
  const hash = createHash("sha256")
    .update(outputBytes)
    .digest("hex")
    .slice(0, 8);

  const hashedPath = resolve(DIST_DIR, `harvest.min.${hash}.js`);
  const stablePath = resolve(DIST_DIR, "harvest.min.js");

  writeFileSync(hashedPath, outputBytes);
  writeFileSync(stablePath, outputBytes);

  const kb = (outputBytes.byteLength / 1024).toFixed(1);
  console.log(`Built ${kb} KB`);
  console.log(`  dist/harvest.min.${hash}.js`);
  console.log(`  dist/harvest.min.js`);

  // Build renderer packs
  const packResult = await esbuild.build({
    entryPoints: [PACK_ENTRY],
    bundle:      false,
    minify:      true,
    format:      "iife",
    target:      ["es2020"],
    charset:     "utf8",
    write:       false,
    logLevel:    "info",
  });

  if (packResult.errors.length > 0) {
    console.error("Pack build failed:", packResult.errors);
    process.exit(1);
  }

  const packBytes = packResult.outputFiles[0].contents;
  writeFileSync(PACK_OUT, packBytes);
  const pkb = (packBytes.byteLength / 1024).toFixed(1);
  console.log(`Pack: ${pkb} KB  packs/examples.js`);
}

if (isWatch) {
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
  console.log("Watching for changes...");
} else {
  await build();
}
