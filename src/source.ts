/**
 * Resolves a local, on-disk copy of the upstream agent roster
 * (msitarzewski/agency-agents) via a shallow git clone, so the SDK never
 * bundles or vendors agent content itself.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const DEFAULT_SOURCE_REPO =
  "https://github.com/msitarzewski/agency-agents.git";
export const DEFAULT_SOURCE_REF = "main";

export interface SourceOptions {
  /** Git URL of the source repository. @default DEFAULT_SOURCE_REPO (or $AGENCY_AGENTS_SOURCE_REPO) */
  repo?: string;
  /** Branch, tag, or ref to check out. @default DEFAULT_SOURCE_REF (or $AGENCY_AGENTS_SOURCE_REF) */
  ref?: string;
  /** Directory to clone into. @default a per-repo/ref directory under the OS temp dir (or $AGENCY_AGENTS_SOURCE_CACHE) */
  cacheDir?: string;
}

/** One resolution per (repo, ref) per process — avoids re-fetching on every loadAgents() call. */
const _resolved = new Map<string, string>();

function cacheDirFor(repo: string, ref: string, override?: string): string {
  if (override) return override;
  const key = `${repo}#${ref}`.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  return path.join(os.tmpdir(), "agency-agents-sdk", key);
}

/**
 * Return a local directory containing the current upstream agent roster,
 * cloning or fast-forwarding it as needed. Falls back to whatever is
 * already on disk if a network operation fails (e.g. offline dev, rate
 * limits), so a stale-but-present cache never hard-fails the caller.
 */
export function resolveSourceRoot(options: SourceOptions = {}): string {
  const repo =
    options.repo ??
    process.env["AGENCY_AGENTS_SOURCE_REPO"] ??
    DEFAULT_SOURCE_REPO;
  const ref =
    options.ref ??
    process.env["AGENCY_AGENTS_SOURCE_REF"] ??
    DEFAULT_SOURCE_REF;
  const memoKey = `${repo}#${ref}#${options.cacheDir ?? ""}`;

  const memoized = _resolved.get(memoKey);
  if (memoized !== undefined) return memoized;

  const dir = cacheDirFor(
    repo,
    ref,
    options.cacheDir ?? process.env["AGENCY_AGENTS_SOURCE_CACHE"],
  );

  if (fs.existsSync(path.join(dir, ".git"))) {
    try {
      execFileSync("git", ["-C", dir, "fetch", "--depth", "1", "origin", ref], {
        stdio: "ignore",
      });
      execFileSync("git", ["-C", dir, "reset", "--hard", "FETCH_HEAD"], {
        stdio: "ignore",
      });
    } catch {
      // Offline or ref unavailable — reuse whatever is already checked out.
    }
    _resolved.set(memoKey, dir);
    return dir;
  }

  fs.mkdirSync(dir, { recursive: true });
  execFileSync("git", ["clone", "--depth", "1", "--branch", ref, repo, dir], {
    stdio: "ignore",
  });
  _resolved.set(memoKey, dir);
  return dir;
}

/** Clear the in-process memoization. @internal — for tests only. */
export function _resetSourceMemo(): void {
  _resolved.clear();
}
