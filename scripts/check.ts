import { execSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const contract = process.argv.includes("--contract");
type Step = { name: string; run: () => string | null; fix: string; /** true: a non-null result is a note, not a failure */ soft?: boolean };
const results: { name: string; ok: boolean; detail: string; fix: string }[] = [];
const notes: string[] = [];

const sh = (cmd: string): { ok: boolean; out: string } => {
  const r = spawnSync(cmd, { cwd: root, shell: true, encoding: "utf8", env: { ...process.env, FORCE_COLOR: "0" } });
  return { ok: r.status === 0, out: `${r.stdout ?? ""}${r.stderr ?? ""}`.trim() };
};
const tail = (s: string, n = 25) => s.split("\n").slice(-n).join("\n");

const steps: Step[] = [
  {
    name: "declaration is valid",
    run: () => {
      const r = sh("npx tsx -e \"import('./src/core/define.js').then(async (d) => { const { api } = await import('./src/resources/index.js'); d.validate(api); })\"");
      if (r.ok) return null;
      let msg = r.out.replace(/^[\s\S]*?Error: /, "").replace(/\n\s+at [\s\S]*$/, "").replace(/\n\nNode\.js v[\s\S]*$/, "");
      msg = msg.replace(/src\/\*\.ts \(resource "(\w+)"\)/g, (_, r: string) => {
        const hit = sh(`grep -l 'singular: "${r}"' src/resources/*.ts`).out.split("\n")[0];
        return hit || `src/resources/*.ts (resource "${r}")`;
      });
      return msg;
    },
    fix: "Each line above names the file and the field. Fix those; nothing else.",
  },
  {
    name: "generated client is up to date",
    run: () => {
      const r = sh("npm run -s gen");
      if (!r.ok) return tail(r.out);
      const d = sh("git diff --stat -- src/generated docs");
      return d.out ? `Regenerated; these differ from the last commit:\n${d.out}` : null;
    },
    fix: "The generator has already rewritten them. Commit src/generated and docs together with your change.",
    soft: true,
  },
  {
    name: "types check",
    run: () => {
      const r = sh("npx tsc -p tsconfig.json --noEmit");
      return r.ok ? null : tail(r.out);
    },
    fix: "A type error in a declaration usually means a missing `description` or a misspelled builder (str/int/num/bool/json/list/obj/ref). Read the first error only; the rest are usually the same one.",
  },
  {
    name: "unit tests pass",
    run: () => {
      const r = sh("npx vitest run --reporter=dot");
      return r.ok ? null : tail(r.out, 40);
    },
    fix: "If the failing test is in test/api.test.ts or test/semver.test.ts and you changed src/core/define.ts or scripts/generate.ts, the test may need updating. If it is test/runtime.test.ts, src/core/runtime.ts broke; it is hand-written and small.",
  },
  {
    name: "package version matches the size of the change",
    run: () => {
      const base = sh("git show origin/main:src/generated/api.json");
      const basePkg = sh("git show origin/main:package.json");
      if (!base.ok || !basePkg.ok) return null; // no origin yet
      const tmp = join(root, "node_modules", ".cache");
      execSync(`mkdir -p ${tmp}`);
      execSync(`git show origin/main:src/generated/api.json > ${tmp}/base-api.json`, { cwd: root });
      execSync(`git show origin/main:package.json > ${tmp}/base-package.json`, { cwd: root });
      const r = sh(`npx tsx scripts/semver.ts ${tmp}/base-api.json --enforce ${tmp}/base-package.json`);
      return r.ok ? null : r.out;
    },
    fix: "Change `version` in package.json as the last line above says (major = first number +1, minor = second number +1, reset the rest to 0).",
  },
  {
    name: "build works",
    run: () => {
      const r = sh("npm run -s build");
      return r.ok ? null : tail(r.out);
    },
    fix: "The published client did not compile. This is almost always the same as the type error above.",
  },
];
if (contract) {
  steps.push({
    name: "declaration matches api-dev (contract test)",
    run: () => {
      const r = sh("BT_CONTRACT=1 npx vitest run test/contract.test.ts --reporter=dot");
      return r.ok ? null : tail(r.out, 40);
    },
    fix: "The backend returned something different from the declaration. The failing assertion names the action; open api-dev in a browser or curl it, and change the declaration to match what it really returns. If a single row on dev is broken, record it in test/known-drift.json with a reason.",
  });
}

for (const s of steps) {
  if (process.stdout.isTTY) process.stdout.write(`… ${s.name}`);
  const detail = s.run();
  const ok = detail === null || !!s.soft;
  if (detail !== null && s.soft) notes.push(`${s.name}:\n${detail.split("\n").map((l) => `    ${l}`).join("\n")}\n  → ${s.fix}`);
  results.push({ name: s.name, ok, detail: detail ?? "", fix: s.fix });
  process.stdout.write(`${process.stdout.isTTY ? "\r" : ""}${ok ? (detail !== null ? "•" : "✓") : "✗"} ${s.name}\n`);
  if (!ok) break; // later steps usually fail for the same reason; do not bury the cause
}

const failed = results.filter((r) => !r.ok);
console.log();
for (const n of notes) console.log(`• ${n}\n`);
if (!failed.length) {
  console.log(`All green.${contract ? "" : " (Run `npm run check -- --contract` to also verify against api-dev; it needs the network and is read-only.)"}`);
  console.log("If you changed a declaration, commit src/generated and docs along with it.");
  process.exit(0);
}
for (const f of failed) {
  console.log(f.detail.split("\n").map((l) => `    ${l}`).join("\n"));
  console.log(`\n  → ${f.fix}\n`);
}
if (!existsSync(join(root, "CONTRIBUTING.md"))) process.exit(1);
console.log(`Stuck? CONTRIBUTING.md has a worked example of every kind of change. ${readFileSync(join(root, "package.json"), "utf8").includes('"new"') ? "`npm run new -- <singular> <plural>` scaffolds a resource." : ""}`);
process.exit(1);
