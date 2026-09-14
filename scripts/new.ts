import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const [service, singular, plural] = process.argv.slice(2);
const ident = /^[a-z][A-Za-z0-9]*$/;
if (!service || !singular || !ident.test(service) || !ident.test(singular)) {
  console.error("usage: npm run new -- <service> <singular> [plural]\n  e.g. npm run new -- events sticker stickers\n  service is the folder under src/resources/ (the backend service); names are camelCase");
  process.exit(2);
}
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "src", "resources", service);
const file = join(dir, `${singular}.ts`);
if (existsSync(file)) {
  console.error(`${file} already exists. Edit it instead.`);
  process.exit(1);
}
const Entity = singular[0]!.toUpperCase() + singular.slice(1);
const resourceName = plural ?? singular;
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

mkdirSync(dir, { recursive: true });
writeFileSync(
  file,
  `import { entity, resource, action, str, int, num, bool, json, list, obj, ref } from "../../core/define.js";

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

export const ${resourceName} = resource({
  singular: "${singular}",${plural ? `\n  plural: "${plural}",` : ""}
  entity: ${Entity},
  description: "TODO: what bt.${resourceName} / bt.${singular}(…) is for.",
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

const serviceIndex = join(dir, "index.ts");
const importLine = `import { ${Entity}, ${resourceName} } from "./${singular}.js";\n`;
if (!existsSync(serviceIndex)) {
  writeFileSync(serviceIndex, `${importLine}\nexport const entities = { ${Entity} };\nexport const resources = { ${singular}: ${resourceName} };\n`);
  const registry = join(root, "src", "resources", "index.ts");
  let reg = readFileSync(registry, "utf8");
  reg = reg.replace(/(import \* as \w+ from "\.\/\w+\/index\.js";\n)(?![\s\S]*^import \* as)/m, `$1import * as ${service} from "./${service}/index.js";\n`);
  reg = reg.replace(/(entities: \{[^}]*?)\s*\}/, `$1, ...${service}.entities }`).replace(/(resources: \{[^}]*?)\s*\}/, `$1, ...${service}.resources }`);
  writeFileSync(registry, reg);
} else {
  let idx = readFileSync(serviceIndex, "utf8");
  idx = idx.replace(/(import[^\n]*\n)(?![\s\S]*^import)/m, `$1${importLine}`);
  idx = idx.replace(/(export const entities = \{[^}]*?)\s*\}/, `$1, ${Entity} }`).replace(/(export const resources = \{[^}]*?)\s*\}/, `$1, ${singular}: ${resourceName} }`);
  writeFileSync(serviceIndex, idx);
}

console.log(`Created ${file.replace(root + "/", "")} and registered it in src/resources/${service}/index.ts.
Next: replace every TODO, then run  npm run check  — it will list anything still missing.`);
