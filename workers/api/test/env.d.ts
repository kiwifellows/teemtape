import type { D1Migration } from "cloudflare:test";
import type { Env as WorkerEnv } from "../src/env.js";

// The pool types `env` (from "cloudflare:test") as `Cloudflare.Env`. Make that
// include our Worker bindings plus the migrations binding used in test setup.
declare global {
  namespace Cloudflare {
    interface Env extends WorkerEnv {
      TEST_MIGRATIONS: D1Migration[];
    }
  }
}

export {};
