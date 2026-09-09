# agency-agents-sdk

A TypeScript SDK, CLI, and GitHub Action for loading [Agency Agents](https://github.com/msitarzewski/agency-agents) personalities programmatically and building multi-agent swarm prompts — without cloning the source repo or copying `.md` files by hand.

> **What this is:** a companion package to [msitarzewski/agency-agents](https://github.com/msitarzewski/agency-agents), which remains the source of truth for the agent roster (markdown personality files, install scripts for Claude Code / Cursor / Codex / etc.). This repo packages that roster with a typed API, a CLI, and a GitHub Action, published independently so the source repo can stay dependency-free markdown. Originally proposed in [msitarzewski/agency-agents#118](https://github.com/msitarzewski/agency-agents/discussions/118) and [#117](https://github.com/msitarzewski/agency-agents/pull/117) / [#847](https://github.com/msitarzewski/agency-agents/pull/847).

## Install

```bash
npm install agency-agents-sdk
```

## TypeScript / Node.js

```typescript
import { getAgent, listAgents, buildSwarm } from 'agency-agents-sdk';

// Get a single agent
const agent = getAgent('frontend-developer');
console.log(agent?.systemPrompt); // full system prompt

// List all engineering agents
const engineers = listAgents('engineering');

// Build a multi-agent swarm orchestrator prompt
const swarm = buildSwarm(
  [getAgent('frontend-developer')!, getAgent('backend-architect')!],
  { name: 'MVP Team', mission: 'Ship v1 in 4 weeks' }
);
// Feed swarm.orchestratorPrompt to your LLM as the system prompt
```

## CLI

```bash
npx agency-agents-sdk list                                   # list all agents
npx agency-agents-sdk list --category engineering            # filter by category
npx agency-agents-sdk get frontend-developer --prompt        # print system prompt only
npx agency-agents-sdk swarm frontend-developer,backend-architect --mission "Build API"
npx agency-agents-sdk categories                             # print all categories
```

## GitHub Action

```yaml
# .github/workflows/ai-review.yml
jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Single agent
      - name: Load Security Engineer agent
        id: agent
        uses: el-j/agency-agents-sdk@main
        with:
          agent: security-engineer

      - name: Use the system prompt
        run: |
          echo "Agent: ${{ steps.agent.outputs.agent_name }}"
          # Pass ${{ steps.agent.outputs.system_prompt }} to your AI API call

      # Swarm mode
      - name: Build a startup swarm
        id: swarm
        uses: el-j/agency-agents-sdk@main
        with:
          agents: 'frontend-developer,backend-architect,growth-hacker'
          swarm_name: 'Startup MVP Team'
          mission: 'Launch a SaaS MVP in 4 weeks'

      - name: Launch swarm
        env:
          SWARM_PROMPT: ${{ steps.swarm.outputs.system_prompt }}
        run: |
          echo "Swarm loaded: ${{ steps.swarm.outputs.swarm_json }}"
```

**Action Inputs**

| Input | Description | Required |
|-------|-------------|----------|
| `agent` | Single agent name or slug | One of these |
| `agents` | Comma-separated slugs for swarm mode | ↕ |
| `category` | Load all agents from a category | ↕ |
| `swarm_name` | Swarm display name | No |
| `mission` | Mission statement for the swarm prompt | No |

**Action Outputs**

| Output | Description |
|--------|-------------|
| `system_prompt` | Agent or swarm orchestrator prompt (Markdown) |
| `agent_name` | Resolved agent name (single-agent only) |
| `agent_json` | Agent metadata JSON (single-agent only) |
| `swarm_json` | Array of agent metadata JSON (swarm mode) |

## Keeping the roster in sync

The agent `.md` files under each division directory (`engineering/`, `design/`, etc.) are a vendored snapshot of [msitarzewski/agency-agents](https://github.com/msitarzewski/agency-agents), refreshed periodically from upstream `main`. `divisions.json` tracks the current division set; `src/loader.ts`'s `AGENT_CATEGORIES` must match it. If you need the latest roster immediately, `getAgent`/`listAgents` accept a `rootDir` override so you can point them at your own clone of the source repo instead of the bundled snapshot.

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
```

37 tests, zero production dependencies.

## License

MIT — agent personality content originates from the [msitarzewski/agency-agents](https://github.com/msitarzewski/agency-agents) contributors; see that repo for individual agent authorship.
