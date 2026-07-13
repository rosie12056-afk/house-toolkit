import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { scanPrivacy } from "../src/privacy-scan.mjs";
import { runLifecycleConformance, runMigrationConformance } from "../src/conformance.mjs";
import { formatSarifReport, lintProtocol } from "../src/protocol-lint.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const protocolsRoot = resolve(dirname(fileURLToPath(import.meta.resolve("house-protocols"))), "..");

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

test("an explicit profile rejects a document from another protocol version", () => {
  const report = lintProtocol("evidence", ["test/fixtures/evidence/valid.json"], { cwd: root, profile: "0.2" });
  assert.equal(report.ok, false);
  assert.equal(report.files[0].schema_errors[0].code, "E_PROTOCOL_PROFILE_MISMATCH");
});

test("memory boundary lint rejects ungrounded promotion and accepts source-backed promotion", () => {
  const invalid = lintProtocol("memory_policy_decision", ["test/fixtures/memory/invalid-ungrounded-promotion.json"], { cwd: root, profile: "0.2" });
  const valid = lintProtocol("memory_policy_decision", ["test/fixtures/memory/valid-source-backed-promotion.json"], { cwd: root, profile: "0.2" });
  assert.equal(invalid.ok, false);
  assert.equal(invalid.files[0].semantic_errors[0].code, "E_MEMORY_PROMOTION_WITHOUT_EVIDENCE");
  assert.equal(valid.ok, true);
});

test("migration conformance validates the Protocols v0.1-to-v0.2 fixture set", () => {
  const report = runMigrationConformance(join(protocolsRoot, "fixtures", "migrations", "v0.1-to-v0.2.json"));
  assert.equal(report.ok, true);
  assert.equal(report.summary.records_checked, 7);
});

test("lifecycle conformance validates the shared journal, dream, and handoff fixtures", () => {
  const report = runLifecycleConformance(join(protocolsRoot, "fixtures", "v0.2", "lifecycle-contracts.json"));
  assert.equal(report.ok, true);
  assert.equal(report.summary.records_checked, 5);
});

test("lifecycle lint rejects a dream recast as fact and an unsupported journal observation", () => {
  const fixture = JSON.parse(readFileSync(join(protocolsRoot, "fixtures", "v0.2", "lifecycle-contracts.json"), "utf8"));
  const dir = mkdtempSync(join(tmpdir(), "house-toolkit-lifecycle-"));
  const dream = structuredClone(fixture.records.find((item) => item.kind === "dream_record").document);
  const journal = structuredClone(fixture.records.find((item) => item.kind === "journal_entry").document);
  dream.factuality = "observed";
  journal.events[0].evidence_refs = [];
  writeFileSync(join(dir, "dream.json"), JSON.stringify(dream));
  writeFileSync(join(dir, "journal.json"), JSON.stringify(journal));
  const dreamReport = lintProtocol("dream_record", [join(dir, "dream.json")], { cwd: root, profile: "0.2" });
  const journalReport = lintProtocol("journal_entry", [join(dir, "journal.json")], { cwd: root, profile: "0.2" });
  assert.equal(dreamReport.ok, false);
  assert.equal(journalReport.files[0].semantic_errors[0].code, "E_JOURNAL_OBSERVATION_WITHOUT_EVIDENCE");
});

test("SARIF output preserves stable rule codes without source values", () => {
  const report = lintProtocol("memory_policy_decision", ["test/fixtures/memory/invalid-ungrounded-promotion.json"], { cwd: root, profile: "0.2" });
  const sarif = formatSarifReport(report);
  assert.equal(sarif.version, "2.1.0");
  assert.equal(sarif.runs[0].results[0].ruleId, "E_MEMORY_PROMOTION_WITHOUT_EVIDENCE");
  assert.equal(JSON.stringify(sarif).includes("model_suggested"), false);
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

test("conformance and memory-boundary CLIs return stable exit codes", () => {
  const migration = join(protocolsRoot, "fixtures", "migrations", "v0.1-to-v0.2.json");
  const conformance = run("conformance.mjs", ["migration", migration, "--json"]);
  const boundary = run("memory-boundary-lint.mjs", ["test/fixtures/memory/invalid-ungrounded-promotion.json", "--profile", "0.2", "--json"]);
  assert.equal(conformance.status, 0);
  assert.equal(JSON.parse(conformance.stdout).summary.records_checked, 7);
  assert.equal(boundary.status, 1);
  assert.equal(JSON.parse(boundary.stdout).files[0].semantic_errors[0].code, "E_MEMORY_PROMOTION_WITHOUT_EVIDENCE");
});

test("lifecycle conformance and lint CLIs are independently runnable", () => {
  const lifecycle = join(protocolsRoot, "fixtures", "v0.2", "lifecycle-contracts.json");
  const fixture = JSON.parse(readFileSync(lifecycle, "utf8"));
  const dir = mkdtempSync(join(tmpdir(), "house-toolkit-lifecycle-cli-"));
  const journal = fixture.records.find((item) => item.kind === "journal_entry").document;
  const journalPath = join(dir, "journal.json");
  writeFileSync(journalPath, JSON.stringify(journal));
  const conformance = run("conformance.mjs", ["lifecycle", lifecycle, "--json"]);
  const lint = run("lifecycle-lint.mjs", ["journal_entry", journalPath, "--json"]);
  assert.equal(conformance.status, 0);
  assert.equal(JSON.parse(conformance.stdout).summary.records_checked, 5);
  assert.equal(lint.status, 0);
});
