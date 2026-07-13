import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { scanPrivacy } from "../src/privacy-scan.mjs";
import { lintProtocol } from "../src/protocol-lint.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

function run(bin, args) {
  return spawnSync(process.execPath, [resolve(root, "bin", bin), ...args], {
    cwd: root,
    encoding: "utf8",
  });
}

test("privacy scan reports locations and rule codes without printing values", () => {
  const report = scanPrivacy(["test/fixtures/privacy/invalid.txt"], { cwd: root });
  assert.equal(report.ok, false);
  assert.deepEqual(new Set(report.findings.map((item) => item.code)), new Set(["P_EMAIL_ADDRESS", "P_USER_HOME_PATH"]));
  assert.equal(JSON.stringify(report).includes("fictional.person"), false);
});

test("privacy scan supports caller-owned deny terms", () => {
  const dir = mkdtempSync(join(tmpdir(), "house-toolkit-"));
  const material = join(dir, "material.txt");
  const terms = join(dir, "terms.txt");
  writeFileSync(material, "PrivateCodename appears here.\n");
  writeFileSync(terms, "PrivateCodename\n");
  const report = scanPrivacy([material], { cwd: dir, denyTermFile: terms });
  assert.equal(report.findings.some((item) => item.code === "P_DENY_TERM"), true);
});

test("privacy scan does not mistake a Git SSH URL for a personal email address", () => {
  const dir = mkdtempSync(join(tmpdir(), "house-toolkit-git-url-"));
  const material = join(dir, "package-lock.json");
  writeFileSync(material, '{"resolved":"git+ssh://git@github.com/example/project.git"}\n');
  const report = scanPrivacy([material], { cwd: dir });
  assert.equal(report.findings.some((item) => item.code === "P_EMAIL_ADDRESS"), false);
});

test("privacy scan does not mistake a JavaScript db property for a database file", () => {
  const dir = mkdtempSync(join(tmpdir(), "house-toolkit-db-property-"));
  const material = join(dir, "store.mjs");
  writeFileSync(material, "this.db.prepare('SELECT 1');\n");
  const report = scanPrivacy([material], { cwd: dir });
  assert.equal(report.ok, true);
});

test("privacy scan rejects an actual database file", () => {
  const dir = mkdtempSync(join(tmpdir(), "house-toolkit-db-file-"));
  const material = join(dir, "runtime.db");
  writeFileSync(material, "not a real database\n");
  const report = scanPrivacy([material], { cwd: dir });
  assert.equal(report.findings[0].code, "P_FORBIDDEN_FILE_TYPE");
});

test("evidence lint rejects an external fact supported only by model output", () => {
  const report = lintProtocol("evidence", ["test/fixtures/evidence/invalid-model-only.json"], { cwd: root });
  assert.equal(report.ok, false);
  assert.equal(report.files[0].semantic_errors[0].code, "E_EXTERNAL_FACT_MODEL_OUTPUT_ONLY");
});

test("evidence lint accepts source-backed fictional evidence", () => {
  const report = lintProtocol("evidence", ["test/fixtures/evidence/valid.json"], { cwd: root });
  assert.equal(report.ok, true);
});

test("initiative lint rejects a completion claim without work and evidence", () => {
  const result = run("initiative-lint.mjs", ["test/fixtures/initiative/invalid-completed.json", "--json"]);
  assert.equal(result.status, 1);
  const report = JSON.parse(result.stdout);
  assert.equal(report.ok, false);
  assert.deepEqual(
    new Set(report.files[0].semantic_errors.map((error) => error.code)),
    new Set(["E_COMPLETED_WITHOUT_ACTION", "E_COMPLETED_WITHOUT_OUTPUT", "E_COMPLETED_WITHOUT_EVIDENCE"]),
  );
});

test("initiative lint accepts completion linked to action, output, and evidence", () => {
  const result = run("initiative-lint.mjs", ["test/fixtures/initiative/valid-completed.json", "--json"]);
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).ok, true);
});

test("malformed JSON returns usage or input exit code 2", () => {
  const dir = mkdtempSync(join(tmpdir(), "house-toolkit-json-"));
  const file = join(dir, "broken.json");
  writeFileSync(file, "{not json");
  const result = run("evidence-lint.mjs", [file, "--json"]);
  assert.equal(result.status, 2);
  const report = JSON.parse(result.stdout);
  assert.equal(report.summary.input_errors, 1);
  assert.equal(report.files[0].schema_errors[0].keyword, "parse");
});

test("a directory without JSON documents returns exit code 2", () => {
  const dir = mkdtempSync(join(tmpdir(), "house-toolkit-empty-"));
  writeFileSync(join(dir, "readme.txt"), "No protocol documents here.\n");
  const result = run("evidence-lint.mjs", [dir]);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /no JSON files were found/);
});
