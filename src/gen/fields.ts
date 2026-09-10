import type { FieldSpec, Fields } from "../ontology/dsl.js";

/** `Foo bar` → `/** Foo bar *\/` on its own line at the given indent. */
export function jsdoc(text: string, indent: string): string {
  const lines = text.trim().split("\n");
  if (lines.length === 1) return `${indent}/** ${lines[0]} */\n`;
  return `${indent}/**\n${lines.map((l) => `${indent} * ${l}`).join("\n")}\n${indent} */\n`;
}

/** Property key, quoted when not an identifier (e.g. `"eventID;year"`). */
export const key = (k: string): string => (/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k));

export const pascal = (s: string): string => s.replace(/(^|[^A-Za-z0-9])([a-z0-9])/g, (_, __, c: string) => c.toUpperCase());

// ─── TypeScript ───────────────────────────────────────────────────────

export function tsType(f: FieldSpec, indent = ""): string {
  const t = tsBase(f, indent);
  return f.nullable ? `${t} | null` : t;
}

function tsBase(f: FieldSpec, indent: string): string {
  switch (f.kind) {
    case "string":
      return "string";
    case "integer":
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "json":
      return "unknown";
    case "enum":
      return f.values.map((v) => JSON.stringify(v)).join(" | ");
    case "ref":
      return f.entity;
    case "array": {
      const inner = tsType(f.items, indent);
      return f.items.kind === "object" || f.items.kind === "enum" || f.items.nullable ? `Array<${inner}>` : `${inner}[]`;
    }
    case "record":
      return `Record<string, ${tsType(f.values, indent)}>`;
    case "object":
      return `{\n${tsFields(f.fields, indent + "  ")}${indent}}`;
  }
}

export function tsFields(fields: Fields, indent: string): string {
  let out = "";
  for (const [k, f] of Object.entries(fields)) {
    out += jsdoc(f.description, indent);
    out += `${indent}${key(k)}${f.optional ? "?" : ""}: ${tsType(f, indent)};\n`;
  }
  return out;
}

// ─── Zod ──────────────────────────────────────────────────────────────

export function zodExpr(f: FieldSpec, indent = ""): string {
  const base = (() => {
    switch (f.kind) {
      case "string":
        return "z.string()";
      case "integer":
        return "z.number().int()";
      case "number":
        return "z.number()";
      case "boolean":
        return "z.boolean()";
      case "json":
        return "z.unknown()";
      case "enum":
        return `z.enum([${f.values.map((v) => JSON.stringify(v)).join(", ")}])`;
      case "ref":
        return `z.lazy(() => ${f.entity}Schema)`;
      case "array":
        return `z.array(${zodExpr(f.items, indent)})`;
      case "record":
        return `z.record(z.string(), ${zodExpr(f.values, indent)})`;
      case "object":
        return `z.object({\n${zodFields(f.fields, indent + "  ")}${indent}})`;
    }
  })();
  return `${base}${f.nullable ? ".nullable()" : ""}${f.optional ? ".optional()" : ""}`;
}

export function zodFields(fields: Fields, indent: string): string {
  let out = "";
  for (const [k, f] of Object.entries(fields)) out += `${indent}${key(k)}: ${zodExpr(f, indent)},\n`;
  return out;
}
