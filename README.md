# agency-agents-sdk

A TypeScript SDK, CLI, and GitHub Action for loading [Agency Agents](https://github.com/msitarzewski/agency-agents) personalities programmatically and building multi-agent swarm prompts.

> **What this is:** a companion package to [msitarzewski/agency-agents](https://github.com/msitarzewski/agency-agents), which remains the sole source of truth for the agent roster (markdown personality files, install scripts for Claude Code / Cursor / Codex / etc.). **This package ships no agent content of its own** — it reads directly from a local clone of the upstream repo, fetched/refreshed on demand. That keeps the source repo dependency-free markdown, and means this SDK never drifts out of date with it. Originally proposed in [msitarzewski/agency-agents#118](https://github.com/msitarzewski/agency-agents/discussions/118) and [#117](https://github.com/msitarzewski/agency-agents/pull/117) / [#847](https://github.com/msitarzewski/agency-agents/pull/847).

**Requires `git`** on `PATH` — that's how the roster is fetched. No other runtime dependencies.

## Install

```bash
npm install agency-agents-sdk
```

## TypeScript / Node.js

```typescript
import { getAgent, listAgents, buildSwarm } from "agency-agents-sdk";

// Get a single agent — on first call this shallow-clones
// msitarzewski/agency-agents into a local cache; later calls in the same
// process reuse it, and each new process re-fetches to stay current.
const agent = getAgent("frontend-developer");
console.log(agent?.systemPrompt); // full system prompt

// List all engineering agents
const engineers = listAgents("engineering");

// Build a multi-agent swarm orchestrator prompt
const swarm = buildSwarm(
  [getAgent("frontend-developer")!, getAgent("backend-architect")!],
  { name: "MVP Team", mission: "Ship v1 in 4 weeks" },
);
// Feed swarm.orchestratorPrompt to your LLM as the system prompt
```

Already have your own checkout of `msitarzewski/agency-agents` (or a fork)? Point straight at it and skip the fetch entirely:

```typescript
import { getAgent } from "agency-agents-sdk";

const agent = getAgent(
  "frontend-developer",
  "/path/to/your/agency-agents/checkout",
);
```

## CLI

```bash
npx agency-agents-sdk list                                   # list all agents
npx agency-agents-sdk list --category engineering            # filter by category
npx agency-agents-sdk get frontend-developer --prompt        # print system prompt only
npx agency-agents-sdk swarm frontend-developer,backend-architect --mission "Build API"
npx agency-agents-sdk categories                             # print all categories

# Point at your own checkout instead of fetching upstream
npx agency-agents-sdk --root ./my-agency-agents-checkout list
```

## GitHub Action

Clones the roster from `source_repo`/`source_ref` at run time — no `actions/checkout` of the source repo needed in your workflow.

```yaml
# .github/workflows/ai-review.yml
jobs:
  review:
    runs-on: ubuntu-latest
    steps:
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
          agents: "frontend-developer,backend-architect,growth-hacker"
          swarm_name: "Startup MVP Team"
          mission: "Launch a SaaS MVP in 4 weeks"

      - name: Launch swarm
        env:
          SWARM_PROMPT: ${{ steps.swarm.outputs.system_prompt }}
        run: |
          echo "Swarm loaded: ${{ steps.swarm.outputs.swarm_json }}"
```

**Action Inputs**

| Input              | Description                                             | Required                                      |
| ------------------ | ------------------------------------------------------- | --------------------------------------------- |
| `agent`            | Single agent name or slug                               | One of these                                  |
| `agents`           | Comma-separated slugs for swarm mode                    | ↕                                             |
| `category`         | Load all agents from a category                         | ↕                                             |
| `swarm_name`       | Swarm display name                                      | No                                            |
| `mission`          | Mission statement for the swarm prompt                  | No                                            |
| `source_repo`      | Git URL of the agent roster to load from                | No — defaults to `msitarzewski/agency-agents` |
| `source_ref`       | Branch/tag/ref of `source_repo` to check out            | No — defaults to `main`                       |
| `run_inference`    | Pipe the resolved system prompt into GitHub Copilot CLI | No — defaults to `false`                      |
| `inference_prompt` | User prompt sent to Copilot CLI                         | Only with `run_inference: true`               |
| `inference_model`  | Model passed to Copilot CLI                             | No — defaults to `gpt-4.1`                    |
| `copilot_token`    | Copilot-licensed PAT to authenticate the CLI            | Only with `run_inference: true`               |

**Action Outputs**

| Output               | Description                                             |
| -------------------- | ------------------------------------------------------- |
| `system_prompt`      | Agent or swarm orchestrator prompt (Markdown)           |
| `agent_name`         | Resolved agent name (single-agent only)                 |
| `agent_json`         | Agent metadata JSON (single-agent only)                 |
| `swarm_json`         | Array of agent metadata JSON (swarm mode)               |
| `inference_response` | Copilot CLI's response text, when `run_inference: true` |

Point at a fork or a pinned release instead of live `main`:

```yaml
- uses: el-j/agency-agents-sdk@main
  with:
    agent: backend-architect
    source_repo: "https://github.com/your-org/agency-agents.git"
    source_ref: "v2026.09.01"
```

### Running the agent through GitHub Copilot

Set `run_inference: true` to have the action pipe the resolved system prompt straight into [GitHub Copilot CLI](https://github.com/github/copilot-cli) (via [`actions/ai-inference`](https://github.com/actions/ai-inference)) and hand back its response. The default `GITHUB_TOKEN` doesn't carry a Copilot subscription, so you need a PAT from an account with Copilot access, stored as a secret:

```yaml
- name: Review PR with the Security Engineer agent
  id: review
  uses: el-j/agency-agents-sdk@main
  with:
    agent: security-engineer
    run_inference: true
    inference_prompt: "Review this PR diff for security issues."
    copilot_token: ${{ secrets.COPILOT_PAT }}

- run: echo "${{ steps.review.outputs.inference_response }}"
```

This is opt-in — without `run_inference`, the action only resolves and outputs the prompt text; you decide how (or whether) to call an LLM with it.

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
```

Tests run against a small synthetic roster committed under `__tests__/fixtures/` — they don't hit the network or depend on upstream content. Zero production dependencies.

## License

MIT for this SDK/Action's own code. Agent personality content originates from the [msitarzewski/agency-agents](https://github.com/msitarzewski/agency-agents) contributors and is fetched from that repo at run time — see it for individual agent authorship and its own license.
