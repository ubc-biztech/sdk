/**
 * Classifies the change between two ontology snapshots as major / minor / none and, with
 * `--enforce <base-package.json>`, refuses when package.json's version bump is smaller
 * than the change requires. Usage:
 *
 *   tsx src/check/semver.ts <base-ontology.json> [--enforce <base-package.json>]
 *
 * Rules (deliberately mechanical):
 *   major — removed role/entity/field/resource/action/link; resource key changed; field kind
 *           changed; output field went required→optional; input field went optional→required
 *           or was added as required; auth, method or path changed; error removed
 *   minor — anything else added; input field went required→optional; descriptions changed
 */
import { readFileSync } from "node:fs";
import { flatten, validate, type FieldSpec, type Fields, type Ontology } from "../ontology/dsl.js";
import { ontology } from "../ontology/index.js";

type Bump = "none" | "minor" | "major";
type Side = "input" | "output";
const rank: Record<Bump, number> = { none: 0, minor: 1, major: 2 };

export function classify(base: Ontology, next: Ontology): { bump: Bump; reasons: { bump: Bump; why: string }[] } {
  const reasons: { bump: Bump; why: string }[] = [];
  const note = (bump: Bump, why: string) => reasons.push({ bump, why });

  function fields(b: Fields, n: Fields, at: string, side: Side) {
    for (const k of Object.keys(b)) if (!(k in n)) note("major", `${at}.${k} removed`);
    for (const [k, f] of Object.entries(n)) {
      const bf = b[k];
      if (!bf) note(side === "input" && !f.optional ? "major" : "minor", `${at}.${k} added`);
      else field(bf, f, `${at}.${k}`, side);
    }
  }
  function field(b: FieldSpec, n: FieldSpec, at: string, side: Side) {
    if (b.kind !== n.kind) note("major", `${at} kind ${b.kind} → ${n.kind}`);
    if (!!b.optional !== !!n.optional) {
      const loosened = !!n.optional;
      note((side === "output") === loosened ? "major" : "minor", `${at} ${loosened ? "became optional" : "became required"}`);
    }
    if (!!b.nullable !== !!n.nullable) note((side === "output") === !!n.nullable ? "major" : "minor", `${at} ${n.nullable ? "became nullable" : "stopped being nullable"}`);
    if (b.kind === "enum" && n.kind === "enum") {
      for (const v of b.values) if (!n.values.includes(v)) note("major", `${at} enum value "${v}" removed`);
      for (const v of n.values) if (!b.values.includes(v)) note(side === "output" ? "major" : "minor", `${at} enum value "${v}" added`);
    }
    if (b.kind === "object" && n.kind === "object") fields(b.fields, n.fields, at, side);
    if (b.kind === "array" && n.kind === "array") field(b.items, n.items, `${at}[]`, side);
    if (b.kind === "record" && n.kind === "record") field(b.values, n.values, `${at}{}`, side);
    if (b.kind === "ref" && n.kind === "ref" && b.entity !== n.entity) note("major", `${at} ref ${b.entity} → ${n.entity}`);
  }

  for (const r of Object.keys(base.roles)) if (!(r in next.roles)) note("major", `role ${r} removed`);
  for (const r of Object.keys(next.roles)) if (!(r in base.roles)) note("minor", `role ${r} added`);

  for (const [name, e] of Object.entries(base.entities)) {
    const n = next.entities[name];
    if (!n) note("major", `entity ${name} removed`);
    else fields(e.fields, n.fields, name, "output");
  }
  for (const name of Object.keys(next.entities)) if (!(name in base.entities)) note("minor", `entity ${name} added`);

  for (const [name, r] of Object.entries(base.resources)) {
    const n = next.resources[name];
    if (!n) {
      note("major", `resource ${name} removed`);
      continue;
    }
    if (r.plural !== n.plural) note("major", `${name} plural ${r.plural} → ${n.plural}`);
    if (JSON.stringify(Object.keys(r.key)) !== JSON.stringify(Object.keys(n.key))) note("major", `${name} key changed`);
    else fields(r.key, n.key, `${name}.key`, "input");
    for (const l of Object.keys(r.links)) if (!(l in n.links)) note("major", `${name}.links.${l} removed`);
    for (const [l, ls] of Object.entries(n.links)) {
      if (!(l in r.links)) note("minor", `${name}.links.${l} added`);
      else if (r.links[l]!.via !== ls.via) note("major", `${name}.links.${l} via changed`);
    }
  }
  for (const name of Object.keys(next.resources)) if (!(name in base.resources)) note("minor", `resource ${name} added`);

  const bActs = new Map(flatten(base).map((a) => [a.key, a]));
  const nActs = new Map(flatten(next).map((a) => [a.key, a]));
  for (const [k, a] of bActs) {
    const n = nActs.get(k);
    if (!n) {
      if (k.split(".")[0]! in next.resources || Object.values(next.resources).some((r) => r.plural === k.split(".")[0])) note("major", `action ${k} removed`);
      continue;
    }
    if (a.spec.auth !== n.spec.auth) note("major", `${k} auth ${a.spec.auth} → ${n.spec.auth}`);
    if (a.spec.route.method !== n.spec.route.method || a.spec.route.path !== n.spec.route.path) note("major", `${k} route changed`);
    fields(a.spec.input ?? {}, n.spec.input ?? {}, `${k}.input`, "input");
    field(a.spec.output, n.spec.output, `${k}.output`, "output");
    for (const e of Object.keys(a.spec.errors)) if (!(e in n.spec.errors)) note("major", `${k} error ${e} removed`);
    for (const e of Object.keys(n.spec.errors)) if (!(e in a.spec.errors)) note("minor", `${k} error ${e} added`);
  }
  for (const k of nActs.keys()) if (!bActs.has(k)) note("minor", `action ${k} added`);

  const bump = reasons.reduce<Bump>((b, r) => (rank[r.bump] > rank[b] ? r.bump : b), "none");
  return { bump, reasons };
}

function requiredBump(from: string, to: string): Bump {
  const [a, b] = [from, to].map((v) => v.split(".").map(Number) as [number, number, number]);
  if (b![0] > a![0]) return "major";
  if (b![1] > a![1]) return "minor";
  return "none";
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop()!)) {
  const [basePath, flag, basePkgPath] = process.argv.slice(2);
  if (!basePath) {
    console.error("usage: semver.ts <base-ontology.json> [--enforce <base-package.json>]");
    process.exit(2);
  }
  validate(ontology);
  const base = JSON.parse(readFileSync(basePath, "utf8")) as Ontology;
  const { bump, reasons } = classify(base, ontology);
  console.log(`ontology change: ${bump}`);
  for (const r of reasons) console.log(`  ${r.bump.padEnd(5)} ${r.why}`);
  if (flag === "--enforce" && basePkgPath) {
    const from = (JSON.parse(readFileSync(basePkgPath, "utf8")) as { version: string }).version;
    const to = (JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as { version: string }).version;
    const got = requiredBump(from, to);
    console.log(`package version: ${from} → ${to} (${got}); required: ${bump}`);
    if (rank[got] < rank[bump]) {
      console.error(`✗ @ubcbiztech/sdk needs at least a ${bump} bump`);
      process.exit(1);
    }
  }
}
