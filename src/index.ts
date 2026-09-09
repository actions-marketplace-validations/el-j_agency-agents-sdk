/**
 * agency-agents-sdk — Public API
 *
 * @example
 * ```ts
 * import { getAgent, listAgents, buildSwarm } from 'agency-agents-sdk';
 *
 * const agent = getAgent('frontend-developer');
 * const swarm = buildSwarm([agent!], { mission: 'Build a React dashboard' });
 * console.log(swarm.orchestratorPrompt);
 * ```
 */

// Types
export type {
  Agent,
  AgentCategory,
  AgentFrontmatter,
  Swarm,
  SwarmOptions,
} from "./types.js";

// Agent loading
export {
  loadAgents,
  getAgent,
  listAgents,
  listCategories,
} from "./registry.js";

// Swarm orchestration
export { buildSwarm } from "./swarm.js";

// Upstream source resolution (this package ships no agent content itself —
// see resolveSourceRoot for how the default roster is fetched)
export {
  resolveSourceRoot,
  DEFAULT_SOURCE_REPO,
  DEFAULT_SOURCE_REF,
} from "./source.js";
export type { SourceOptions } from "./source.js";

// Lower-level utilities (for advanced consumers)
export {
  loadAgentsFromDir,
  loadAgentFile,
  collectMarkdownFiles,
  slugify,
  AGENT_CATEGORIES,
} from "./loader.js";
