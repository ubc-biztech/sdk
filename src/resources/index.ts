import type { Api } from "../core/define.js";
import { roles } from "./roles.js";
import * as judging from "./judging/index.js";

export const api: Api = {
  roles,
  entities: { ...judging.entities },
  resources: { ...judging.resources },
};
