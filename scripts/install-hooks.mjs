import fs from "node:fs";
import path from "node:path";

const gitDir = path.join(process.cwd(), ".git");

if (!fs.existsSync(gitDir)) {
  process.exit(0);
}

const hookDir = path.join(gitDir, "hooks");
const hookPath = path.join(hookDir, "pre-commit");

const script = `#!/bin/sh
set -eu

npm run check
`;

fs.mkdirSync(hookDir, { recursive: true });
fs.writeFileSync(hookPath, script, { mode: 0o755 });

console.log("Installed pre-commit hook: npm run check");
