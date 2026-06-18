# teemtape Agent Skills

Canonical skill content for teemtape lives in this folder, following the
[Agent Skills open standard](https://agentskills.io/specification). Each skill is a
directory with a `SKILL.md` file.

```
skills/
└── teemtape-cli/          # CLI interaction skill for agents
    ├── SKILL.md
    └── references/
```

Tool-specific discovery paths in this repo (symlinks to `skills/`):

| Path | Tool |
| ---- | ---- |
| `.cursor/skills/teemtape-cli` | Cursor Agent |
| `.claude/skills/teemtape-cli` | Claude Code |
| `.github/skills/teemtape-cli` | GitHub Copilot |

## Skills

| Skill | Description |
| ----- | ----------- |
| [teemtape-cli](teemtape-cli/SKILL.md) | Read watchlists, search tickers, and post anonymous stock notes via the CLI |

## Publishing to marketplaces

All major agent platforms converge on the same `SKILL.md` format. Write once in
`skills/`, publish through each platform's registry.

### Cursor Marketplace

Cursor packages skills into **plugins** with a `.cursor-plugin/plugin.json` manifest.

1. This repo includes `.cursor-plugin/marketplace.json` pointing at `skills/teemtape-cli`.
2. Test locally: skills are auto-discovered from `.cursor/skills/`.
3. Submit for review: [cursor.com/marketplace/publish](https://cursor.com/marketplace/publish)
   with the public Git repository URL.

Docs: [cursor.com/docs/plugins](https://cursor.com/docs/plugins),
[Agent Skills in Cursor](https://cursor.com/docs/context/skills)

### OpenClaw / ClawHub

ClawHub is the public registry for OpenClaw skills.

```bash
# Install the ClawHub CLI (see https://docs.openclaw.ai/clawhub)
clawhub login

# Publish from the skill folder
clawhub skill publish ./skills/teemtape-cli \
  --slug teemtape-cli \
  --name "teemtape CLI" \
  --owner <your-org>
```

OpenClaw reads `metadata.openclaw` from frontmatter for env/binary requirements.
The default CI workflow scans immediate children of `skills/` — this layout matches.

Docs: [docs.openclaw.ai/clawhub/publishing](https://docs.openclaw.ai/clawhub/publishing)

**CI in this repo:** `.github/workflows/publish-skills.yml` publishes all skills under
`skills/` to ClawHub when they change on `main`. Add a `CLAWHUB_TOKEN` repository
secret (from `clawhub login`) before enabling real publishes. Manual runs default to
`dry_run: true`; pushes to `main` publish for real.

### Claude (Claude Code + claude.ai)

**Claude Code** discovers skills from `.claude/skills/` or installed plugins.

Register this repo as a plugin marketplace inside Claude Code:

```
/plugin marketplace add kiwifellows/teemtape
/plugin install teemtape@teemtape-skills
```

For **claude.ai**: zip the skill directory (`teemtape-cli/`) and upload via
Settings → Capabilities → Skills. Keep `description` under 200 characters for claude.ai.

**Claude API**: upload custom skills via the Skills API (`/v1/skills`).

Docs: [claude.com/docs/skills](https://claude.com/docs/skills/how-to),
[anthropics/skills](https://github.com/anthropics/skills)

### GitHub Copilot

Copilot CLI and VS Code discover skills from `.github/skills/teemtape-cli` (symlinked
to `skills/teemtape-cli` in this repo). The `SKILL.md` format is identical.

Plugin marketplaces use `.github/plugin.json`. See
[Copilot plugin docs](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/create-copilot-extensions).

### Codex CLI / Gemini CLI

| Tool | Discovery path |
| ---- | -------------- |
| OpenAI Codex | `.agents/skills/` |
| Gemini CLI | `.gemini/skills/` |

Same `SKILL.md` format. Symlink from `skills/` as needed.

### Validate locally

```bash
# Agent Skills reference validator (optional)
npx skills-ref validate ./skills/teemtape-cli
```

## Adding a new skill

1. Create `skills/<skill-name>/SKILL.md` with `name` and `description` frontmatter.
2. Add symlinks under `.cursor/skills/` and `.claude/skills/`.
3. Register the skill in marketplace manifests (`.cursor-plugin/`, `.claude-plugin/`).
4. Document it in the table above.
