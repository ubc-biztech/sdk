/**
 * Entry point: validate the ontology, emit the client, report size.
 * Runs in CI; nobody should need to run it locally to get a working SDK.
 */
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { flatten, validate } from "../ontology/dsl.js";
import { ontology } from "../ontology/index.js";
import { emitClient, emitDocs, emitErrors, emitSchemas, snapshot } from "./emit.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const outDir = process.argv[2] ?? join(root, "src", "client", "generated");
const docsDir = process.argv[3] ?? join(root, "docs");

validate(ontology);

for (const d of [outDir, docsDir]) {
  rmSync(d, { recursive: true, force: true });
  mkdirSync(d, { recursive: true });
}
const files: Record<string, string> = {
  "schemas.ts": emitSchemas(ontology),
  "errors.ts": emitErrors(ontology),
  "client.ts": emitClient(ontology),
  "ontology.json": snapshot(ontology),
};
for (const [name, content] of Object.entries(files)) writeFileSync(join(outDir, name), content);
for (const [name, content] of Object.entries(emitDocs(ontology))) writeFileSync(join(docsDir, name), content);

const nLinks = Object.values(ontology.resources).reduce((n, r) => n + Object.keys(r.links).length, 0);
console.log(
  `sdk: ${Object.keys(ontology.entities).length} entities, ${Object.keys(ontology.resources).length} resources, ${flatten(ontology).length} actions, ${nLinks} links → ${readdirSync(outDir).length} files in ${outDir}, ${readdirSync(docsDir).length} docs`,
);
