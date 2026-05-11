import { builtinModules } from "node:module";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

const runtimePackages = ["core", "http", "container", "config", "testing"];
const builtins = new Set(
  builtinModules.flatMap((moduleName) => [moduleName, `node:${moduleName}`]),
);

const importPattern = /(?:import|export)\s+(?:[^"']+\s+from\s+)?["']([^"']+)["']/g;

const violations = [];

for (const packageName of runtimePackages) {
  const sourceDir = join(process.cwd(), "packages", packageName, "src");
  const files = await getTypeScriptFiles(sourceDir);

  for (const file of files) {
    const source = await readFile(file, "utf8");

    for (const match of source.matchAll(importPattern)) {
      const specifier = match[1];

      if (specifier && builtins.has(specifier)) {
        violations.push(`${relative(process.cwd(), file)} imports ${specifier}`);
      }
    }
  }
}

if (violations.length > 0) {
  console.error("Runtime packages must not import Node built-ins:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

async function getTypeScriptFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await getTypeScriptFiles(path)));
    }

    if (entry.isFile() && entry.name.endsWith(".ts")) {
      files.push(path);
    }
  }

  return files;
}
