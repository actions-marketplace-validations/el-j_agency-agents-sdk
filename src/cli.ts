#!/usr/bin/env node
/**
 * agency-agents CLI
 *
 * Usage:
 *   agency-agents [--root <path>] list [--category <cat>] [--json]
 *   agency-agents [--root <path>] get <name-or-slug> [--json] [--prompt]
 *   agency-agents [--root <path>] swarm <slug,...> [--name <swarm-name>] [--mission <text>]
 *   agency-agents [--root <path>] categories
 *
 * Without --root, agents are read from a local clone of the upstream
 * agency-agents roster, fetched/refreshed on demand (see src/source.ts).
 * Pass --root to point at your own checkout instead (skips the network
 * fetch entirely).
 */

import process from "node:process";
import {
  getAgent,
  listAgents,
  listCategories,
  buildSwarm,
  AGENT_CATEGORIES,
} from "./index.js";
import type { Agent, AgentCategory } from "./types.js";

// ---------------------------------------------------------------------------
// Global --root flag
// ---------------------------------------------------------------------------

function extractRoot(argv: string[]): {
  root: string | undefined;
  rest: string[];
} {
  const rest: string[] = [];
  let root: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--root" && argv[i + 1] !== undefined) {
      root = argv[++i];
    } else {
      rest.push(argv[i]!);
    }
  }
  return { root, rest };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function printAgent(agent: Agent, asJson: boolean, promptOnly: boolean): void {
  if (promptOnly) {
    process.stdout.write(agent.systemPrompt + "\n");
    return;
  }
  if (asJson) {
    process.stdout.write(JSON.stringify(agent, null, 2) + "\n");
    return;
  }
  console.log(`\n🎭 ${agent.name}`);
  console.log(`   slug:     ${agent.slug}`);
  console.log(`   category: ${agent.category}`);
  console.log(`   color:    ${agent.color}`);
  console.log(`   desc:     ${agent.description}`);
}

function usage(): void {
  console.log(`
Usage: agency-agents [--root <path>] <command> [options]

Without --root, agents are read from a local clone of msitarzewski/agency-agents,
fetched/refreshed on demand. Pass --root to point at your own checkout instead.

Commands:
  list [--category <cat>] [--json]
      List all agents, optionally filtered by category.

  get <name-or-slug> [--json] [--prompt]
      Print a single agent. --prompt outputs only the system prompt.

  swarm <slug,slug,...> [--name <swarm-name>] [--mission <text>]
      Build a swarm orchestrator prompt for the given agent slugs.

  categories
      Print all available categories.

Examples:
  agency-agents list
  agency-agents list --category engineering
  agency-agents get frontend-developer --prompt
  agency-agents swarm frontend-developer,backend-architect --mission "Build an API"
  agency-agents --root ./my-agency-agents-checkout list
`);
}

// ---------------------------------------------------------------------------
// Command handlers
// ---------------------------------------------------------------------------

function cmdList(args: string[], root: string | undefined): void {
  let category: string | undefined;
  let asJson = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--category" && args[i + 1] !== undefined) {
      category = args[++i];
    } else if (args[i] === "--json") {
      asJson = true;
    }
  }

  // Validate category before calling listAgents so we give a useful error
  let validCategory: AgentCategory | undefined;
  if (category !== undefined) {
    if (!(AGENT_CATEGORIES as readonly string[]).includes(category)) {
      console.error(
        `Error: unknown category "${category}". Valid categories: ${AGENT_CATEGORIES.join(", ")}`,
      );
      process.exit(1);
    }
    validCategory = category as AgentCategory;
  }

  const agents = listAgents(validCategory, root);

  if (asJson) {
    process.stdout.write(JSON.stringify(agents, null, 2) + "\n");
    return;
  }

  if (agents.length === 0) {
    console.log("No agents found.");
    return;
  }

  const byCategory = new Map<string, Agent[]>();
  for (const a of agents) {
    const bucket = byCategory.get(a.category) ?? [];
    bucket.push(a);
    byCategory.set(a.category, bucket);
  }

  for (const [cat, catAgents] of byCategory) {
    console.log(`\n📁 ${cat}`);
    for (const a of catAgents) {
      console.log(`   • ${a.name.padEnd(40)} ${a.description.slice(0, 60)}`);
    }
  }
  console.log(`\nTotal: ${agents.length} agent(s)`);
}

function cmdGet(args: string[], root: string | undefined): void {
  const nameOrSlug = args[0];
  if (!nameOrSlug) {
    console.error("Error: get requires a name or slug argument.");
    process.exit(1);
  }

  let asJson = false;
  let promptOnly = false;
  for (const arg of args.slice(1)) {
    if (arg === "--json") asJson = true;
    if (arg === "--prompt") promptOnly = true;
  }

  const agent = getAgent(nameOrSlug, root);
  if (!agent) {
    console.error(`Error: agent "${nameOrSlug}" not found.`);
    process.exit(1);
  }

  printAgent(agent, asJson, promptOnly);
}

function cmdSwarm(args: string[], root: string | undefined): void {
  const slugsRaw = args[0];
  if (!slugsRaw) {
    console.error("Error: swarm requires at least one agent slug.");
    process.exit(1);
  }

  let swarmName: string | undefined;
  let mission: string | undefined;

  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--name" && args[i + 1] !== undefined)
      swarmName = args[++i];
    if (args[i] === "--mission" && args[i + 1] !== undefined)
      mission = args[++i];
  }

  const slugs = slugsRaw.split(",").map((s) => s.trim());
  const agents = slugs.map((slug) => {
    const a = getAgent(slug, root);
    if (!a) {
      console.error(`Error: agent "${slug}" not found.`);
      process.exit(1);
    }
    return a;
  });

  const swarm = buildSwarm(agents, {
    ...(swarmName !== undefined && { name: swarmName }),
    ...(mission !== undefined && { mission }),
  });
  process.stdout.write(swarm.orchestratorPrompt + "\n");
}

function cmdCategories(root: string | undefined): void {
  const cats = listCategories(root);
  for (const c of cats) {
    console.log(`  • ${c}`);
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const [, , command, ...rawRest] = process.argv;
const { root, rest } = extractRoot(rawRest);

switch (command) {
  case "list":
    cmdList(rest, root);
    break;
  case "get":
    cmdGet(rest, root);
    break;
  case "swarm":
    cmdSwarm(rest, root);
    break;
  case "categories":
    cmdCategories(root);
    break;
  case "--help":
  case "-h":
  case undefined:
    usage();
    break;
  default:
    console.error(`Unknown command: ${command}`);
    usage();
    process.exit(1);
}
