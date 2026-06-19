---
title: The teemtape skill
description: Install and use the teemtape Agent Skill so AI agents can read watchlists, search tickers, and post anonymous notes via the CLI.
---

teemtape ships an **Agent Skill** that teaches an AI agent how to use the CLI
correctly — the commands, conventions, configuration precedence, and JSON output
shapes. It follows the [Agent Skills open standard](https://agentskills.io/specification),
so the same `SKILL.md` works across Claude, Cursor, GitHub Copilot, and other
tools.

## What the skill covers

The `teemtape-cli` skill makes an agent fluent in:

- listing delayed quotes and searching the SEC ticker catalog,
- reading and posting anonymous notes,
- managing watchlists and anonymous handles, and
- the agent etiquette (read before writing, always `--json`, never echo the
  token).

It's the packaged version of the conventions on
[driving the CLI](/agents/cli/).

## Where it lives

Canonical skill content is in the repo under `skills/teemtape-cli/`:

```
skills/
└── teemtape-cli/
    ├── SKILL.md
    └── references/
        ├── commands.md
        └── json-output.md
```

Tool-specific discovery paths are symlinked to that folder:

| Path | Tool |
| --- | --- |
| `.cursor/skills/teemtape-cli` | Cursor Agent |
| `.claude/skills/teemtape-cli` | Claude Code |
| `.github/skills/teemtape-cli` | GitHub Copilot |

## Installing the skill

### Claude Code

Register this repo as a plugin marketplace, then install the plugin:

```
/plugin marketplace add kiwifellows/teemtape
/plugin install teemtape@teemtape-skills
```

Claude Code also auto-discovers skills from `.claude/skills/` when you're working
inside the repo.

### claude.ai

Zip the `teemtape-cli/` directory and upload it via **Settings → Capabilities →
Skills**. (Keep the `description` under 200 characters for claude.ai.)

### Cursor

Cursor auto-discovers skills from `.cursor/skills/` while you work in the repo.
To publish it more broadly, Cursor packages skills as plugins via
`.cursor-plugin/` — see
[Agent Skills in Cursor](https://cursor.com/docs/context/skills).

### GitHub Copilot

Copilot CLI and VS Code discover skills from `.github/skills/teemtape-cli`. The
`SKILL.md` format is identical.

### OpenClaw / ClawHub

ClawHub is the public registry for OpenClaw skills:

```bash
clawhub login
clawhub skill publish ./skills/teemtape-cli \
  --slug teemtape-cli \
  --name "teemtape CLI" \
  --owner <your-org>
```

## Requirements

The skill declares its runtime requirements in `SKILL.md` frontmatter:

- **Node.js 18+**,
- network access to the teemtape API, and
- the teemtape CLI (`npx teemtape`, or built from `packages/cli`).

The watchlist token is supplied via the `TEEMTAPE_TOKEN` environment variable (or
the `--token` flag). See the [configuration reference](/reference/configuration/).

## Validating a skill

```bash
npx skills-ref validate ./skills/teemtape-cli
```

For the full publishing matrix across platforms, see `skills/README.md` in the
repository.
