import { lstatSync, readdirSync, readFileSync } from "node:fs";
import { basename, extname, relative, resolve, sep } from "node:path";

function normalizedRelative(path, cwd) {
  const rel = relative(cwd, path).split(sep).join("/");
  return rel.startsWith("../") ? basename(path) : rel || ".";
}

function matchesExclude(path, excludes, cwd) {
  const rel = normalizedRelative(path, cwd);
  return excludes.some((entry) => rel === entry || rel.startsWith(`${entry}/`));
}

export function collectFiles(inputs, { cwd = process.cwd(), excludes = [], extensions = null } = {}) {
  const normalizedExcludes = excludes.map((entry) => entry.replace(/^\.\//, "").replace(/\/$/, ""));
  const results = [];

  function visit(path) {
    const stat = lstatSync(path);
    if (stat.isSymbolicLink() || matchesExclude(path, normalizedExcludes, cwd)) return;
    if (stat.isDirectory()) {
      for (const name of readdirSync(path).sort()) visit(resolve(path, name));
      return;
    }
    if (!stat.isFile()) return;
    if (extensions && !extensions.has(extname(path).toLowerCase())) return;
    results.push({ path, file: normalizedRelative(path, cwd), size: stat.size });
  }

  for (const input of inputs.length ? inputs : ["."]) visit(resolve(cwd, input));
  return results.sort((a, b) => a.file.localeCompare(b.file));
}

export function readLines(path) {
  return readFileSync(path, "utf8").split(/\r?\n/);
}

export function readTermFile(path) {
  return readLines(resolve(path))
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}
