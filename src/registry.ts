import { loadAgentsFromDir, slugify } from "./loader.js";
import { resolveSourceRoot } from "./source.js";
import type { Agent, AgentCategory } from "./types.js";

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------
// This package ships no agent content of its own. Unless a caller passes an
// explicit rootDir, agents are read from a local clone of the upstream
// roster (msitarzewski/agency-agents), fetched on demand — see source.ts.

/** Cache map: resolved rootDir → loaded agents array. */
const _cache = new Map<string, Agent[]>();

/**
 * Load all agents from disk (or return the cached list on subsequent calls).
 *
 * @param rootDir  Directory to scan for agent category sub-directories.
 *                 Defaults to a local clone of the upstream agency-agents
 *                 roster (cloned/fetched on demand — see `resolveSourceRoot`).
 */
export function loadAgents(rootDir?: string): Agent[] {
  const resolvedRoot = rootDir !== undefined ? rootDir : resolveSourceRoot();
  const cached = _cache.get(resolvedRoot);
  if (cached !== undefined) {
    return cached;
  }
  const agents = loadAgentsFromDir(resolvedRoot);
  _cache.set(resolvedRoot, agents);
  return agents;
}

/**
 * Retrieve a single agent by **name** (case-insensitive) or **slug**.
 * Returns `undefined` when no match is found.
 *
 * @example
 *   getAgent('frontend-developer')
 *   getAgent('Frontend Developer')
 */
export function getAgent(
  nameOrSlug: string,
  rootDir?: string,
): Agent | undefined {
  const normalised = slugify(nameOrSlug);
  return loadAgents(rootDir).find(
    (a) =>
      a.slug === normalised ||
      a.name.toLowerCase() === nameOrSlug.toLowerCase(),
  );
}

/**
 * Return all agents, optionally filtered by category.
 *
 * @example
 *   listAgents()                        // all agents
 *   listAgents('engineering')           // engineering agents only
 */
export function listAgents(
  category?: AgentCategory,
  rootDir?: string,
): Agent[] {
  const all = loadAgents(rootDir);
  if (category === undefined) return all;
  return all.filter((a) => a.category === category);
}

/**
 * Return all unique category names that have at least one agent loaded.
 */
export function listCategories(rootDir?: string): AgentCategory[] {
  const cats = new Set(loadAgents(rootDir).map((a) => a.category));
  return [...cats];
}

/**
 * Reset the internal cache. Call between tests or when agents are mutated.
 * @internal
 */
export function _resetCache(): void {
  _cache.clear();
}
