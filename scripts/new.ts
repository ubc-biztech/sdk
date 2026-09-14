import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const [singular, plural] = process.argv.slice(2);
if (!singular || !/^[a-z][A-Za-z0-9]*$/.test(singular)) {
  console.error("usage: npm run new -- <singular> [plural]\n  e.g. npm run new -- sticker stickers\n  singular must be camelCase, e.g. judgingRound");
  process.exit(2);
}
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const file = join(root, "src", "resources", `${singular}.ts`);
if (existsSync(file)) {
  console.error(`${file} already exists. Edit it instead.`);
  process.exit(1);
}
const Entity = singular[0]!.toUpperCase() + singular.slice(1);
const collection = plural
  ? `  collection: {
    list: action({
      description: "TODO: what does this return? Say anything surprising (sorting, filtering, who sees what).",
      auth: "public",   // one of: public, judgingCode, judge, admin  (src/resources/roles.ts)
      output: list(ref(${Entity}, { description: "One ${singular}." }), { description: "TODO" }),
      route: { method: "GET", path: "/TODO" },   // exact path from the service's serverless.yml, leading slash, no trailing slash
    }),
  },
`
  : "";

writeFileSync(
  file,
  `import { entity, resource, action, str, int, num, bool, json, list, obj, ref } from "../core/define.js";

// Before filling this in: call the endpoint on https://api-dev.ubcbiztech.com and look at the
// real response. Declare what it returns, not what it should return. Then \`npm run check\`.

export const ${Entity} = entity({
  name: "${Entity}",
  description: "TODO: one sentence on what this is and how it is identified.",
  // storage: { table: "biztech${Entity}s", pk: "id" },   // optional, documentation only
  fields: {
    id: str({ description: "TODO" }),
    // name: str({ optional: true, description: "TODO" }),
    // count: int({ description: "TODO" }),
    // enabled: bool({ optional: true, description: "TODO" }),
    // extra: json({ optional: true, description: "TODO — use json() only when the shape is genuinely unknown" }),
  },
});

export const ${plural ?? singular} = resource({
  singular: "${singular}",${plural ? `\n  plural: "${plural}",` : ""}
  entity: ${Entity},
  description: "TODO: what bt.${plural ?? singular} / bt.${singular}(…) is for.",
  key: { id: str({ description: "TODO — positional argument of bt.${singular}(id)" }) },   // remove for a singleton
${collection}  instance: {
    get: action({
      description: "TODO",
      auth: "public",
      output: ref(${Entity}, { description: "The ${singular}." }),
      errors: { ${Entity}NotFound: { status: 404, description: "TODO — only declare statuses the backend really returns" } },
      route: { method: "GET", path: "/TODO/{id}" },
    }),
  },
  // links: {
  //   things: link({ description: "TODO", via: "things.list", map: { ownerId: "id" } }),
  // },
});
`,
);

const indexPath = join(root, "src", "resources", "index.ts");
let index = readFileSync(indexPath, "utf8");
const importLine = `import { ${Entity}, ${plural ?? singular} } from "./${singular}.js";\n`;
index = index.replace(/(import[^\n]*\n)(?![\s\S]*^import)/m, `$1${importLine}`);
index = index.replace(/(entities: \{[^}]*?)\s*(\})/, `$1, ${Entity} $2`);
index = index.replace(/(resources: \{[^}]*?)(\n  \},)/, `$1\n    ${singular}${plural ? `: ${plural}` : ""},$2`);
writeFileSync(indexPath, index);

console.log(`Created ${file.replace(root + "/", "")} and registered it in src/resources/index.ts.
Next: replace every TODO, then run  npm run check  — it will list anything still missing.`);
