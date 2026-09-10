/**
 * The declaration vocabulary. Everything else in `src/ontology/` is written with these
 * builders and nothing else. The builders carry *data* only — no behaviour — so the
 * generator can walk the result with plain loops and template strings.
 *
 * Every builder that produces a field requires a `description`. A field without prose
 * is invisible to the primary consumer, so it is a type error.
 */

// ─── Fields ───────────────────────────────────────────────────────────

type Common = { description: string; optional?: boolean; nullable?: boolean };

export type FieldSpec =
  | ({ kind: "string" } & Common)
  | ({ kind: "integer" } & Common)
  | ({ kind: "number" } & Common)
  | ({ kind: "boolean" } & Common)
  | ({ kind: "enum"; values: readonly string[] } & Common)
  /** Unknown / free-form JSON. Use sparingly; it is a confession that the shape is not declared. */
  | ({ kind: "json" } & Common)
  | ({ kind: "array"; items: FieldSpec } & Common)
  | ({ kind: "object"; fields: Fields } & Common)
  /** Map from string keys to one value shape. */
  | ({ kind: "record"; values: FieldSpec } & Common)
  /** Embed a declared entity's shape (not a link). */
  | ({ kind: "ref"; entity: string } & Common);

export type Fields = Record<string, FieldSpec>;

export const str = (o: Common): FieldSpec => ({ kind: "string", ...o });
export const int = (o: Common): FieldSpec => ({ kind: "integer", ...o });
export const num = (o: Common): FieldSpec => ({ kind: "number", ...o });
export const bool = (o: Common): FieldSpec => ({ kind: "boolean", ...o });
export const json = (o: Common): FieldSpec => ({ kind: "json", ...o });
export const oneOf = (values: readonly string[], o: Common): FieldSpec => ({ kind: "enum", values, ...o });
export const list = (items: FieldSpec, o: Common): FieldSpec => ({ kind: "array", items, ...o });
export const obj = (fields: Fields, o: Common): FieldSpec => ({ kind: "object", fields, ...o });
export const record = (values: FieldSpec, o: Common): FieldSpec => ({ kind: "record", values, ...o });
export const ref = (entity: EntitySpec, o: Common): FieldSpec => ({ kind: "ref", entity: entity.name, ...o });

// ─── Roles ────────────────────────────────────────────────────────────

export type RoleSpec = { description: string };
export type Roles = Record<string, RoleSpec>;

// ─── Entities ─────────────────────────────────────────────────────────

export type EntitySpec = {
  name: string;
  description: string;
  fields: Fields;
  /** Where it lives today. Descriptive only; the SDK never creates tables. */
  storage?: { table: string; pk: string; sk?: string };
};

export const entity = (spec: EntitySpec): EntitySpec => spec;

// ─── Actions ──────────────────────────────────────────────────────────

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/**
 * Binding to an existing hand-written handler. Fields named in `{braces}` in `path`
 * (from the resource key or the action input) become path parameters; fields listed in
 * `query` become query parameters; everything else is the JSON body. `fixedQuery` is
 * appended verbatim (e.g. `count=true`).
 */
export type RouteSpec = {
  method: HttpMethod;
  path: string;
  query?: readonly string[];
  fixedQuery?: Record<string, string>;
};

export type ErrorSpec = { status: number; description: string };

export type ActionSpec = {
  description: string;
  /** A key of the ontology's `roles`. Checked by the validator. */
  auth: string;
  /** What the caller passes. For instance actions the resource key is NOT repeated here. */
  input?: Fields;
  output: FieldSpec;
  errors: Record<string, ErrorSpec>;
  route: RouteSpec;
};

export function action(spec: Omit<ActionSpec, "errors"> & { errors?: Record<string, ErrorSpec> }): ActionSpec {
  return { errors: {}, ...spec };
}

// ─── Links ────────────────────────────────────────────────────────────

/**
 * A declared, traversable relationship from a resource instance to another resource's
 * action. `bt.event(id, year).registrations()` is one HTTP call to `registrations.list`
 * with `map` applied to the instance key. Never a client-side loop.
 */
export type LinkSpec = {
  description: string;
  /** `<plural-or-singular>.<action>` of the resolving action. */
  via: string;
  /** action input field ← this resource's key field */
  map: Record<string, string>;
};

export const link = (spec: LinkSpec): LinkSpec => spec;

// ─── Resources ────────────────────────────────────────────────────────

/**
 * The unit of the chained client surface.
 *
 *   bt.<plural>.<collectionAction>(input)            e.g. bt.events.list()
 *   bt.<singular>(...key).<instanceAction>(input)    e.g. bt.event("blueprint", 2026).get()
 *   bt.<singular>(...key).<link>()                   e.g. bt.event("blueprint", 2026).registrations()
 *
 * A resource with an empty key is a singleton: `bt.<singular>.<instanceAction>()`.
 */
export type ResourceSpec = {
  singular: string;
  plural?: string;
  description: string;
  /** The entity an instance represents, if any. Documentation only. */
  entity?: string;
  /** Ordered: becomes the positional parameters of `bt.<singular>(...)`. */
  key: Fields;
  collection: Record<string, ActionSpec>;
  instance: Record<string, ActionSpec>;
  links: Record<string, LinkSpec>;
};

export function resource(spec: {
  singular: string;
  plural?: string;
  description: string;
  entity?: EntitySpec;
  key?: Fields;
  collection?: Record<string, ActionSpec>;
  instance?: Record<string, ActionSpec>;
  links?: Record<string, LinkSpec>;
}): ResourceSpec {
  return {
    singular: spec.singular,
    plural: spec.plural,
    description: spec.description,
    entity: spec.entity?.name,
    key: spec.key ?? {},
    collection: spec.collection ?? {},
    instance: spec.instance ?? {},
    links: spec.links ?? {},
  };
}

// ─── The ontology ─────────────────────────────────────────────────────

export type Ontology = {
  roles: Roles;
  entities: Record<string, EntitySpec>;
  resources: Record<string, ResourceSpec>;
};

/** Every action in the ontology with its full key, resource, and merged input (key + own). */
export type FlatAction = {
  key: string;
  resource: ResourceSpec;
  level: "collection" | "instance";
  name: string;
  spec: ActionSpec;
  /** Resource key fields (instance only) followed by the action's own input. */
  fullInput: Fields;
};

export function flatten(o: Ontology): FlatAction[] {
  const out: FlatAction[] = [];
  for (const r of Object.values(o.resources)) {
    for (const [name, spec] of Object.entries(r.collection))
      out.push({ key: `${r.plural ?? r.singular}.${name}`, resource: r, level: "collection", name, spec, fullInput: { ...(spec.input ?? {}) } });
    for (const [name, spec] of Object.entries(r.instance))
      out.push({ key: `${r.singular}.${name}`, resource: r, level: "instance", name, spec, fullInput: { ...r.key, ...(spec.input ?? {}) } });
  }
  return out;
}

/** Structural checks the type system cannot express. Throws with every problem at once. */
export function validate(o: Ontology): void {
  const problems: string[] = [];
  const flat = flatten(o);
  const byKey = new Map(flat.map((a) => [a.key, a]));
  if (byKey.size !== flat.length) problems.push("duplicate action keys (a singular and plural collide)");

  for (const a of flat) {
    const s = a.spec;
    if (!(s.auth in o.roles)) problems.push(`${a.key}: auth "${s.auth}" is not a declared role`);
    if (a.level === "instance") for (const k of Object.keys(s.input ?? {})) if (k in a.resource.key) problems.push(`${a.key}: input "${k}" shadows the resource key`);
    const pathParams = [...s.route.path.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!);
    for (const p of pathParams) {
      if (!a.fullInput[p]) problems.push(`${a.key}: path param {${p}} is neither a key field nor an input field`);
      else if (a.fullInput[p]!.optional) problems.push(`${a.key}: path param {${p}} cannot be optional`);
    }
    for (const q of s.route.query ?? []) if (!a.fullInput[q]) problems.push(`${a.key}: query field "${q}" is not an input field`);
    if (s.route.method === "GET") {
      const body = Object.keys(a.fullInput).filter((k) => !pathParams.includes(k) && !(s.route.query ?? []).includes(k));
      if (body.length) problems.push(`${a.key}: GET cannot carry body fields: ${body.join(", ")}`);
    }
    walk(s.output, `${a.key}.output`);
    for (const [k, f] of Object.entries(a.fullInput)) walk(f, `${a.key}.input.${k}`);
    for (const [en, e] of Object.entries(s.errors)) if (!/^[A-Z]\w*$/.test(en)) problems.push(`${a.key}: error "${en}" must be PascalCase`); else if (e.status < 400) problems.push(`${a.key}: error ${en} status ${e.status} is not an error status`);
  }
  for (const [rk, r] of Object.entries(o.resources)) {
    if (rk !== r.singular) problems.push(`resources.${rk}: key must equal singular "${r.singular}"`);
    if (r.entity && !(r.entity in o.entities)) problems.push(`${r.singular}: entity "${r.entity}" is not declared`);
    if (Object.keys(r.collection).length && !r.plural) problems.push(`${r.singular}: has collection actions but no plural`);
    if (!r.description.trim()) problems.push(`${r.singular}: description is empty`);
    for (const [k, f] of Object.entries(r.key)) if (f.optional) problems.push(`${r.singular}.key.${k}: key fields cannot be optional`);
    for (const [lk, l] of Object.entries(r.links)) {
      const target = byKey.get(l.via);
      if (!target) problems.push(`${r.singular}.links.${lk}: via "${l.via}" is not a declared action`);
      if (lk in r.instance) problems.push(`${r.singular}.links.${lk}: name collides with an instance action`);
      for (const [inF, keyF] of Object.entries(l.map)) {
        if (target && !target.fullInput[inF]) problems.push(`${r.singular}.links.${lk}: map targets unknown input "${inF}" on ${l.via}`);
        if (!r.key[keyF]) problems.push(`${r.singular}.links.${lk}: map reads "${keyF}", which is not a key field`);
      }
      if (target) for (const [inF, f] of Object.entries(target.fullInput)) if (!f.optional && !(inF in l.map)) problems.push(`${r.singular}.links.${lk}: required input "${inF}" of ${l.via} is not mapped`);
    }
  }
  for (const [name, e] of Object.entries(o.entities)) {
    if (e.name !== name) problems.push(`entities.${name}: entity.name is "${e.name}"`);
    if (!e.description.trim()) problems.push(`${name}: description is empty`);
    for (const [k, f] of Object.entries(e.fields)) walk(f, `${name}.${k}`);
  }
  function walk(f: FieldSpec, at: string) {
    if (!f.description?.trim()) problems.push(`${at}: description is empty`);
    if (f.kind === "ref" && !(f.entity in o.entities)) problems.push(`${at}: ref to unknown entity "${f.entity}"`);
    if (f.kind === "array") walk(f.items, `${at}[]`);
    if (f.kind === "record") walk(f.values, `${at}{}`);
    if (f.kind === "object") for (const [k, c] of Object.entries(f.fields)) walk(c, `${at}.${k}`);
  }
  if (problems.length) throw new Error(`Ontology is invalid:\n  - ${problems.join("\n  - ")}`);
}
