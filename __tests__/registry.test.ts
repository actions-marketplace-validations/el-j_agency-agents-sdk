/// <reference types="vitest" />
import { describe, it, expect, afterEach } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getAgent, listAgents, listCategories, loadAgents, _resetCache } from '../src/registry.js';
import type { AgentCategory } from '../src/types.js';

const __filename = fileURLToPath(import.meta.url);
// This package ships no agent content of its own (see src/source.ts) — tests
// run against a small synthetic roster committed under __tests__/fixtures so
// they stay hermetic and don't depend on network access.
const FIXTURE_ROOT = path.resolve(path.dirname(__filename), 'fixtures', 'roster');

afterEach(() => {
  _resetCache();
});

// ---------------------------------------------------------------------------
// loadAgents
// ---------------------------------------------------------------------------
describe('loadAgents', () => {
  it('loads all agents when called with a rootDir', () => {
    const agents = loadAgents(FIXTURE_ROOT);
    expect(agents.length).toBe(13);
  });

  it('uses the cached result on second call', () => {
    const first = loadAgents(FIXTURE_ROOT);
    const second = loadAgents(FIXTURE_ROOT);
    // Both calls with the same rootDir must return the exact same array reference
    expect(first).toBe(second);
  });

  it('bypasses cache when rootDir is explicitly different', () => {
    const a = loadAgents(FIXTURE_ROOT);
    // Same path → cache hit, same reference
    const b = loadAgents(FIXTURE_ROOT);
    expect(a).toBe(b);
    // Different path (even if resolves to same content) → separate cache entry
    const c = loadAgents(FIXTURE_ROOT);
    expect(a).toBe(c);
  });
});

// ---------------------------------------------------------------------------
// getAgent
// ---------------------------------------------------------------------------
describe('getAgent', () => {
  it('finds an agent by slug', () => {
    const agent = getAgent('engineer-alpha', FIXTURE_ROOT);
    expect(agent).toBeDefined();
    expect(agent?.name).toBe('Engineer Alpha');
  });

  it('finds an agent by full name (case-insensitive)', () => {
    const agent = getAgent('Engineer Alpha', FIXTURE_ROOT);
    expect(agent?.slug).toBe('engineer-alpha');
  });

  it('returns undefined for an unknown slug', () => {
    const agent = getAgent('does-not-exist', FIXTURE_ROOT);
    expect(agent).toBeUndefined();
  });

  it('finds an agent nested in a sub-directory', () => {
    const agent = getAgent('engineer-delta', FIXTURE_ROOT);
    expect(agent?.category).toBe('engineering');
  });

  it('finds the orchestrator agent from specialized', () => {
    const agent = getAgent('orchestrator-prime', FIXTURE_ROOT);
    expect(agent?.category).toBe('specialized');
  });
});

// ---------------------------------------------------------------------------
// listAgents
// ---------------------------------------------------------------------------
describe('listAgents', () => {
  it('returns all agents when called without a category', () => {
    const all = listAgents(undefined, FIXTURE_ROOT);
    expect(all.length).toBe(13);
  });

  it('filters correctly by category', () => {
    const engineering = listAgents('engineering', FIXTURE_ROOT);
    expect(engineering.length).toBe(5);
    expect(engineering.every((a) => a.category === 'engineering')).toBe(true);
  });

  it('returns empty array for a category with no agents in an empty dir', () => {
    const result = listAgents('paid-media' as AgentCategory, '/tmp');
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// listCategories
// ---------------------------------------------------------------------------
describe('listCategories', () => {
  it('returns a non-empty list of categories', () => {
    const cats = listCategories(FIXTURE_ROOT);
    expect(cats.length).toBeGreaterThan(0);
  });

  it('includes "engineering" and "design"', () => {
    const cats = listCategories(FIXTURE_ROOT);
    expect(cats).toContain('engineering');
    expect(cats).toContain('design');
  });

  it('contains no duplicates', () => {
    const cats = listCategories(FIXTURE_ROOT);
    expect(new Set(cats).size).toBe(cats.length);
  });
});
