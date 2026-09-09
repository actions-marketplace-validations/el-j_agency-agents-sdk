import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { resolveSourceRoot, _resetSourceMemo } from "../src/source.js";

// resolveSourceRoot() shells out to `git`. These tests clone from a throwaway
// local repo (a `file://`-free local path works fine as a git remote) rather
// than the real msitarzewski/agency-agents, so they stay hermetic and fast.
describe("resolveSourceRoot", () => {
  let sourceRepoDir: string;
  let cacheDir: string;

  beforeAll(() => {
    sourceRepoDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "agency-agents-sdk-test-src-"),
    );
    execFileSync("git", ["init", "-q", "-b", "main", sourceRepoDir]);
    execFileSync("git", [
      "-C",
      sourceRepoDir,
      "config",
      "user.email",
      "test@example.com",
    ]);
    execFileSync("git", ["-C", sourceRepoDir, "config", "user.name", "Test"]);
    fs.mkdirSync(path.join(sourceRepoDir, "engineering"));
    fs.writeFileSync(
      path.join(sourceRepoDir, "engineering", "a.md"),
      "---\nname: A\ndescription: d\ncolor: blue\n---\nBody",
    );
    execFileSync("git", ["-C", sourceRepoDir, "add", "-A"]);
    execFileSync("git", ["-C", sourceRepoDir, "commit", "-q", "-m", "init"]);
  });

  afterAll(() => {
    fs.rmSync(sourceRepoDir, { recursive: true, force: true });
  });

  it("clones the source repo into the cache dir", () => {
    cacheDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "agency-agents-sdk-test-cache-"),
    );
    _resetSourceMemo();
    const dir = resolveSourceRoot({
      repo: sourceRepoDir,
      ref: "main",
      cacheDir,
    });
    expect(dir).toBe(cacheDir);
    expect(fs.existsSync(path.join(dir, "engineering", "a.md"))).toBe(true);
    fs.rmSync(cacheDir, { recursive: true, force: true });
  });

  it("fetches into an existing clone on a second resolution", () => {
    cacheDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "agency-agents-sdk-test-cache-"),
    );
    _resetSourceMemo();
    resolveSourceRoot({ repo: sourceRepoDir, ref: "main", cacheDir });
    _resetSourceMemo();
    const dir = resolveSourceRoot({
      repo: sourceRepoDir,
      ref: "main",
      cacheDir,
    });
    expect(fs.existsSync(path.join(dir, ".git"))).toBe(true);
    expect(fs.existsSync(path.join(dir, "engineering", "a.md"))).toBe(true);
    fs.rmSync(cacheDir, { recursive: true, force: true });
  });

  it("memoizes within a single process — a second call does not touch git again", () => {
    cacheDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "agency-agents-sdk-test-cache-"),
    );
    _resetSourceMemo();
    const first = resolveSourceRoot({
      repo: sourceRepoDir,
      ref: "main",
      cacheDir,
    });
    // Remove the clone's .git dir so a real second git invocation would throw
    // (there'd be nothing to fetch from/reset within). If resolveSourceRoot
    // still returns cleanly, the second call was served from memory.
    fs.rmSync(path.join(first, ".git"), { recursive: true, force: true });
    const second = resolveSourceRoot({
      repo: sourceRepoDir,
      ref: "main",
      cacheDir,
    });
    expect(second).toBe(first);
    fs.rmSync(cacheDir, { recursive: true, force: true });
  });
});
