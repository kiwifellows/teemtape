# teemtape — CLI Scaffolding Options

> Status: **for approval.** This lists the realistic options for building the
> teemtape CLI (milestone **M1** in [`docs/roadmap.md`](roadmap.md)). Once you pick
> one, we scaffold it. The CLI is a *thin client* over the same Cloudflare Worker
> API that the web app uses — it does not talk to Polygon/Massive or D1 directly.

## What the CLI actually has to do

Small surface, on purpose ([feature-development]: smallest viable feature first):

- `teemtape list` — print the watchlist table (delayed quotes).
- `teemtape notes <SYMBOL>` — print notes for a symbol.
- `teemtape note <SYMBOL> --message "…"` — post an anonymous note (`source: "cli"`).
- `teemtape share` — print the anonymous MD5 watchlist link.
- Config/flags: `--token` (which watchlist), API base URL, JSON output for agents.

That's ~4 commands and a couple of flags. This should steer us toward the
**simplest** tool that does the job, not the most powerful one.

## Decision 1 — Language / runtime

The rest of the stack is **TypeScript on Cloudflare** (Workers + React web +
React Native later). The strongest way to *reduce wastage* is to stay in that
ecosystem so the CLI can reuse the shared `@teemtape/api-client` package and types,
one toolchain, one lint/test setup ([architecture]: minimize technology diversity;
prefer what the team already knows).

| Option | Pros | Cons | Fit |
| ------ | ---- | ---- | --- |
| **Node + TypeScript** (recommended) | Reuses shared API client + types; one toolchain; `npx` distribution; huge ecosystem | Needs Node installed (fine for devs/agents) | ✅ Best fit |
| Go (cobra) | Single static binary, easy distribution | New language → duplicate API client/types; more wastage | ❌ Tech diversity |
| Rust (clap) | Fast single binary | New language; steeper; duplicate client | ❌ Tech diversity |
| Python (Typer/Click) | Quick to write | New runtime; duplicate client; another lint/test stack | ❌ Tech diversity |
| Bun / Deno | Modern, TS-native, can compile to binary | Newer runtime to standardize on; smaller ecosystem; some Cloudflare tooling assumes Node | ⚠️ Possible later, not now |

**Recommendation: Node + TypeScript**, in a `packages/cli` workspace alongside
`apps/web`, sharing `@teemtape/api-client`. This is the lowest-wastage path.

## Decision 2 — CLI framework (within Node + TypeScript)

Ordered roughly from lightest to heaviest. For a ~4-command tool, lighter is
better ([code-quality]/[architecture]: simplicity first, no enterprise patterns
without enterprise problems).

| Framework | Weight | Style | Pros | Cons |
| --------- | ------ | ----- | ---- | ---- |
| **Commander.js** ⭐ | Light | Declarative arg parser | Ubiquitous, battle-tested, tiny, great TS support, near-zero learning curve | Not a full "framework" (we add help/test conventions ourselves — fine for our size) |
| **citty** (UnJS) | Light | Modern declarative | Lovely DX, TS-first, lazy subcommands, pairs with `unbuild` | Younger/smaller community than Commander |
| **cac** | Very light | Minimal parser | Tiny, simple | Fewer features; smaller community |
| **yargs** | Medium | Parser + helpers | Powerful parsing, mature | More API surface than we need |
| **oclif** (Salesforce) | Heavy | Full framework | Plugins, generators, auto-docs, used by Heroku/Salesforce CLIs | Overkill for 4 commands; more structure/boilerplate = wastage now |
| **Ink** (React for CLIs) | Heavy | Interactive TUI | Reuses React mental model; rich interactive UI | We don't need a TUI; adds React render runtime to a simple printer |

**Recommendation: Commander.js** as the safe default — it's the most widely used,
smallest-risk option and matches our "start simple" principle. **citty** is a
strong modern alternative if you prefer its DX and the UnJS toolchain; happy to go
that way instead. We can always graduate to **oclif** later *if* the command set
grows enough to justify it (and only then).

## Decision 3 — Build & distribution

- **Bundler:** `tsup` (esbuild-based) → fast, zero-config ESM/CJS + shebang bin.
  (Alternatively `unbuild` if we choose citty.)
- **Distribution:** publish to npm as `teemtape`, runnable via `npx teemtape …`
  with a global install option. No native binaries to start ([infrastructure]:
  start minimal; add binary packaging only if users ask).
- **Config:** read `--token`/base URL from flags → env vars (`TEEMTAPE_TOKEN`,
  `TEEMTAPE_API_URL`) → a small `~/.config/teemtape/config.json`. Never log the
  token ([security]).
- **Agent-friendly:** support `--json` so AI agents get structured output.

## Recommended stack (for approval)

```
packages/cli/
├── package.json            # bin: teemtape ; deps: commander, the shared client
├── tsconfig.json
├── tsup.config.ts          # bundle to dist/ with shebang
└── src/
    ├── index.ts            # program setup (Commander)
    ├── commands/
    │   ├── list.ts
    │   ├── notes.ts
    │   ├── note.ts
    │   └── share.ts
    └── config.ts           # flags > env > config file
```

- **Language:** Node + TypeScript
- **Framework:** Commander.js (citty as the alternative)
- **Build:** tsup → `npx teemtape`
- **Shared:** `@teemtape/api-client` (also used by the web app)

## Open questions for you

1. **Framework:** Commander.js (recommended) or citty?
2. **Monorepo tooling:** plain npm workspaces (simplest) vs pnpm workspaces vs
   Turborepo — recommend **npm/pnpm workspaces** to start, no Turborepo yet.
3. **Priority confirmation:** build the CLI *before* desktop (M1 then M2), or keep
   desktop strictly first? (See the note in [`docs/roadmap.md`](roadmap.md).)

Once you approve a row from each decision above, we'll scaffold `packages/cli` in a
follow-up PR.

[feature-development]: https://github.com/kiwifellows/ai/blob/main/docs/practices/feature-development.md
[architecture]: https://github.com/kiwifellows/ai/blob/main/docs/practices/architecture.md
[code-quality]: https://github.com/kiwifellows/ai/blob/main/docs/practices/code-quality.md
[security]: https://github.com/kiwifellows/ai/blob/main/docs/practices/security.md
[infrastructure]: https://github.com/kiwifellows/ai/blob/main/docs/practices/infrastructure.md
