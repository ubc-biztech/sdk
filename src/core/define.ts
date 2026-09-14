/**
 * The builders every declaration file in src/resources/ is written with.
 * They carry data only, so generate.ts can walk the result with plain loops.
 * Every field requires a `description`; that text becomes the JSDoc on the client.
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

export type Credential = "none" | "code" | "token";

export type RoleSpec = {
  description: string;
  /**
   * What the runtime sends for actions with this role: nothing, the `X-Judging-Code` header
   * (`ClientConfig.getCode`), or `Authorization: Bearer` with the Cognito ID token (`ClientConfig.getToken`).
   */
  credential: Credential;
  /** Roles this one satisfies. `judge` implies `judgingCode` means a judge may call any `judgingCode` action. Transitive. */
  implies?: readonly string[];
};

/** Every role `role` satisfies, including itself, following `implies` transitively. */
export function rolesSatisfiedBy(roles: Roles, role: string): Set<string> {
  const out = new Set<string>();
  const walk = (r: string) => {
    if (out.has(r)) return;
    out.add(r);
    for (const i of roles[r]?.implies ?? []) walk(i);
  };
  walk(role);
  return out;
}
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
  /** A key of `roles` in roles.ts. Checked by the validator. */
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
 * Inside a scope, a keyless resource whose singular is the scope name sits on the scope
 * itself: `bt.judging(eventID, year).get()`.
 */
export type ResourceSpec = {
  singular: string;
  plural?: string;
  description: string;
  /** The entity an instance represents, if any. Documentation only. */
  entity?: string;
  /**
   * Groups this resource under a keyed prefix: `bt.<scope.name>(...scope.key).<plural>…`.
   * Every action's route may use the scope's key fields as path params. Resources that
   * share a scope name must declare identical scope keys.
   */
  scope?: { name: string; key: Fields; description: string };
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
  scope?: { name: string; key: Fields; description: string };
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
    scope: spec.scope,
    key: spec.key ?? {},
    collection: spec.collection ?? {},
    instance: spec.instance ?? {},
    links: spec.links ?? {},
  };
}

// ─── The whole API ────────────────────────────────────────────────────

export type Api = {
  roles: Roles;
  entities: Record<string, EntitySpec>;
  resources: Record<string, ResourceSpec>;
};

/** Every action with its full key, resource, and merged input (scope key + resource key + own). */
export type FlatAction = {
  /** `[scope.]<plural|singular>.<name>` */
  key: string;
  resource: ResourceSpec;
  level: "collection" | "instance";
  name: string;
  spec: ActionSpec;
  /** Scope key, then resource key (instance only), then the action's own input. */
  fullInput: Fields;
  /** Fields that arrive positionally through the chain rather than in `input`. */
  chainFields: Fields;
};

export function flatten(o: Api): FlatAction[] {
  const out: FlatAction[] = [];
  for (const r of Object.values(o.resources)) {
    const prefix = r.scope ? `${r.scope.name}.` : "";
    const scopeKey = r.scope?.key ?? {};
    for (const [name, spec] of Object.entries(r.collection))
      out.push({ key: `${prefix}${r.plural ?? r.singular}.${name}`, resource: r, level: "collection", name, spec, chainFields: { ...scopeKey }, fullInput: { ...scopeKey, ...(spec.input ?? {}) } });
    // A keyless resource named after its scope sits on the scope itself: `judging.get`, not `judging.judging.get`.
    const own = r.scope && r.singular === r.scope.name && !Object.keys(r.key).length ? "" : `${r.singular}.`;
    for (const [name, spec] of Object.entries(r.instance))
      out.push({ key: `${prefix}${own}${name}`, resource: r, level: "instance", name, spec, chainFields: { ...scopeKey, ...r.key }, fullInput: { ...scopeKey, ...r.key, ...(spec.input ?? {}) } });
  }
  return out;
}

/**
 * Structural checks the type system cannot express. Throws with every problem at once.
 *
 * Messages are written for someone who has never seen this repo: each one says what is
 * wrong, what the valid options are, and which file to edit. If you are reading a message
 * from here and it does not tell you what to do, that is a bug in this function.
 */
export function validate(o: Api): void {
  const problems: string[] = [];
  const flat = flatten(o);
  const roleList = Object.keys(o.roles).map((r) => `"${r}"`).join(", ");
  const file = (r: ResourceSpec) => `src/resources/*.ts (resource "${r.singular}")`;

  const seen = new Map<string, FlatAction>();
  for (const a of flat) {
    const dup = seen.get(a.key);
    if (dup) problems.push(`Two actions are both called "${a.key}". A resource's singular must not equal another resource's plural. Rename one in ${file(a.resource)}.`);
    seen.set(a.key, a);
  }

  for (const a of flat) {
    const s = a.spec;
    const at = `${a.key} in ${file(a.resource)}`;
    if (/^\/TODO/.test(s.route.path) || s.route.path.includes("/TODO")) problems.push(`${at}: route.path is still "${s.route.path}". Use the exact path from the service's serverless.yml.`);
    if (!(s.auth in o.roles))
      problems.push(`${at}: auth is "${s.auth}" but the declared roles are ${roleList}. Pick one, or add the role in src/resources/roles.ts .`);
    for (const k of Object.keys(s.input ?? {}))
      if (k in a.chainFields) problems.push(`${at}: input field "${k}" is already provided by the chain (${Object.keys(a.chainFields).join(", ")}). Remove it from input.`);
    const pathParams = [...s.route.path.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!);
    const available = Object.keys(a.fullInput);
    for (const p of pathParams) {
      if (!a.fullInput[p]) problems.push(`${at}: route.path has {${p}} but no field named "${p}" exists. Available: ${available.length ? available.join(", ") : "(none)"}. Add it to input, or to the resource key if every instance action needs it.`);
      else if (a.fullInput[p]!.optional) problems.push(`${at}: {${p}} is in route.path so it cannot be optional. Remove \`optional: true\` from "${p}".`);
    }
    for (const q of s.route.query ?? []) if (!a.fullInput[q]) problems.push(`${at}: route.query lists "${q}" but no input field has that name. Available: ${available.join(", ") || "(none)"}.`);
    if (s.route.method === "GET") {
      const body = available.filter((k) => !pathParams.includes(k) && !(s.route.query ?? []).includes(k));
      if (body.length) problems.push(`${at}: GET has no body, but these fields are neither in route.path nor route.query: ${body.join(", ")}. Add them to route.query, or change the method.`);
    }
    if (!s.route.path.startsWith("/")) problems.push(`${at}: route.path must start with "/" (it is "${s.route.path}").`);
    if (s.route.path.length > 1 && s.route.path.endsWith("/")) problems.push(`${at}: route.path must not end with "/" (it is "${s.route.path}"). Trailing-slash variants are the drift this repo exists to end.`);
    if (!s.description.trim()) problems.push(`${at}: description is empty. Write one sentence saying what the call does and one saying anything surprising about it.`);
    walk(s.output, `${at}: output`);
    for (const [k, f] of Object.entries(a.fullInput)) walk(f, `${at}: input.${k}`);
    for (const [en, e] of Object.entries(s.errors)) {
      if (!/^[A-Z]\w*$/.test(en)) problems.push(`${at}: error name "${en}" must be PascalCase without the word Error (it becomes the class ${en}Error).`);
      else if (e.status < 400) problems.push(`${at}: error ${en} has status ${e.status}; errors must be 4xx or 5xx.`);
    }
  }
  const scopes = new Map<string, string>();
  const topNames = new Map<string, string>();
  const claim = (name: string, by: string) => {
    const prev = topNames.get(name);
    if (prev) problems.push(`bt.${name} is claimed twice: by ${prev} and by ${by}. Rename one (singular, plural, or scope name).`);
    else topNames.set(name, by);
  };
  for (const [rk, r] of Object.entries(o.resources)) {
    if (!r.scope && rk !== r.singular) problems.push(`src/resources/index.ts: resources.${rk} has singular "${r.singular}". For unscoped resources the key must equal the singular; write \`${r.singular}: …\`.`);
    if (!r.scope) {
      claim(r.singular, `resource "${r.singular}"`);
      if (r.plural) claim(r.plural, `resource "${r.singular}"`);
    } else {
      const inScope = Object.values(o.resources).filter((x) => x.scope?.name === r.scope!.name && x !== r);
      for (const x of inScope) if (x.singular === r.singular || (r.plural && x.plural === r.plural)) problems.push(`scope "${r.scope.name}" has two resources named "${r.singular}"/"${r.plural}". Rename one.`);
    }
    if (r.scope) {
      const sig = JSON.stringify(Object.entries(r.scope.key).map(([k, f]) => [k, f.kind]));
      const prev = scopes.get(r.scope.name);
      if (prev && prev !== sig) problems.push(`${file(r)}: scope "${r.scope.name}" declares different key fields than another resource using the same scope. All resources in a scope must share one \`scope\` object; export it from one file and import it.`);
      scopes.set(r.scope.name, sig);
      if (!prev) claim(r.scope.name, `scope "${r.scope.name}"`);
      for (const k of Object.keys(r.key)) if (k in r.scope.key) problems.push(`${file(r)}: key field "${k}" is already a scope key field.`);
    }
    if (r.entity && !(r.entity in o.entities)) problems.push(`${file(r)}: entity "${r.entity}" is not in src/resources/index.ts \`entities\`. Add it there.`);
    if (Object.keys(r.collection).length && !r.plural) problems.push(`${file(r)}: has collection actions but no \`plural\`. Add plural: "…" (it becomes bt.<plural>).`);
    if (!r.description.trim()) problems.push(`${file(r)}: description is empty.`);
    for (const [k, f] of Object.entries(r.key)) if (f.optional) problems.push(`${file(r)}: key field "${k}" cannot be optional; keys are positional arguments.`);
    for (const [lk, l] of Object.entries(r.links)) {
      const target = seen.get(l.via);
      const atl = `${file(r)}: links.${lk}`;
      if (!target) problems.push(`${atl}: via "${l.via}" is not an action. Actions are named "<plural>.<name>" or "<singular>.<name>": ${flat.map((x) => x.key).join(", ")}.`);
      if (lk in r.instance) problems.push(`${atl}: a link and an instance action are both called "${lk}". Rename one.`);
      for (const [inF, keyF] of Object.entries(l.map)) {
        if (target && !target.fullInput[inF]) problems.push(`${atl}: map has "${inF}" but ${l.via} has no such input. Its inputs: ${Object.keys(target.fullInput).join(", ") || "(none)"}.`);
        const chainKeys = { ...(r.scope?.key ?? {}), ...r.key };
        if (!chainKeys[keyF]) problems.push(`${atl}: map reads "${keyF}" but the chain only knows ${Object.keys(chainKeys).join(", ") || "(none)"}. A link can only use scope and key fields.`);
      }
      if (target) for (const [inF, f] of Object.entries(target.fullInput)) if (!f.optional && !(inF in l.map)) problems.push(`${atl}: ${l.via} requires "${inF}" but map does not provide it. Add \`${inF}: "<key field>"\` to map.`);
    }
  }
  for (const [name, r] of Object.entries(o.roles)) {
    if (!["none", "code", "token"].includes(r.credential)) problems.push(`src/resources/roles.ts: role ${name} has credential "${r.credential}"; it must be "none", "code" or "token".`);
    for (const i of r.implies ?? []) {
      if (!(i in o.roles)) problems.push(`src/resources/roles.ts: role ${name} implies "${i}", which is not a role. Declared: ${roleList}.`);
      else if (o.roles[i]!.credential !== r.credential) problems.push(`src/resources/roles.ts: role ${name} (${r.credential}) implies ${i} (${o.roles[i]!.credential}); a role can only imply roles that send the same credential.`);
    }
  }
  for (const [name, e] of Object.entries(o.entities)) {
    if (e.name !== name) problems.push(`src/resources/index.ts: entities.${name} has name "${e.name}". The key must equal the name.`);
    if (!e.description.trim()) problems.push(`entity ${name}: description is empty.`);
    for (const [k, f] of Object.entries(e.fields)) walk(f, `entity ${name}: field ${k}`);
  }
  // Anything that carries a description goes through here, so "TODO" left by the scaffold is caught in one place.
  const descriptions: [string, string][] = [
    ...flat.flatMap((a): [string, string][] => [[`${a.key} in ${file(a.resource)}`, a.spec.description], ...Object.entries(a.spec.errors).map(([en, e]): [string, string] => [`${a.key}: error ${en}`, e.description])]),
    ...Object.values(o.resources).map((r): [string, string] => [file(r), r.description]),
    ...Object.values(o.entities).map((e): [string, string] => [`entity ${e.name}`, e.description]),
    ...Object.entries(o.roles).map(([r, s]): [string, string] => [`role ${r} in src/resources/roles.ts`, s.description]),
  ];
  for (const [at, d] of descriptions) if (/\bTODO\b/.test(d)) problems.push(`${at}: description still says TODO. Replace it with what this really is.`);

  function walk(f: FieldSpec, at: string) {
    if (!f.description?.trim()) problems.push(`${at}: description is empty. Say what the value means, its unit or format, and when it is absent.`);
    else if (/\bTODO\b/.test(f.description)) problems.push(`${at}: description still says TODO. Replace it with what the value means, its unit or format, and when it is absent.`);
    if (f.kind === "ref" && !(f.entity in o.entities)) problems.push(`${at}: ref to "${f.entity}", which is not in src/resources/index.ts \`entities\`. Declared: ${Object.keys(o.entities).join(", ")}.`);
    if (f.kind === "array") walk(f.items, `${at}[]`);
    if (f.kind === "record") walk(f.values, `${at}{}`);
    if (f.kind === "object") for (const [k, c] of Object.entries(f.fields)) walk(c, `${at}.${k}`);
  }
  if (problems.length) throw new Error(`The declaration has ${problems.length} problem${problems.length === 1 ? "" : "s"}. Fix them in the files named; nothing else needs to change.\n\n  - ${problems.join("\n\n  - ")}\n`);
}
