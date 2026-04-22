/**
 * increment-build.js
 *
 * Increments the build counter in src/buildVersion.json.
 * Run automatically via the `prebuild` npm lifecycle hook before every build.
 */

import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { join, dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const versionPath = join(__dirname, "../src/buildVersion.json");
const panelVersionPath = join(__dirname, "../../custom_components/harvest/panel/panel_version.txt");

const data = JSON.parse(readFileSync(versionPath, "utf8"));
data.build += 1;
writeFileSync(versionPath, JSON.stringify(data, null, 2) + "\n");

// Write the build number to the panel directory so panel.py can read it
// and append it as a query string to js_url, busting the browser cache.
writeFileSync(panelVersionPath, String(data.build));

console.log(`Build #${data.build}`);
