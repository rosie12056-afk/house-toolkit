import { readFileSync } from "node:fs";
import { validateProtocol } from "house-protocols";

export function runMigrationConformance(path) {
  let fixture;
  try {
    fixture = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    return { schema_version: "1", tool: "house-conformance", profile: "migration", ok: false, input_error: true, records: [], error: error.message };
  }
  if (fixture?.migration !== "0.1-to-0.2" || !Array.isArray(fixture.records)) {
    return { schema_version: "1", tool: "house-conformance", profile: "migration", ok: false, input_error: true, records: [], error: "expected a 0.1-to-0.2 migration fixture" };
  }

  const records = fixture.records.map((record, index) => {
    const before = validateProtocol(record.kind, record.before, { profile: "0.1" });
    const after = validateProtocol(record.kind, record.after, { profile: "0.2" });
    return { index, kind: record.kind, ok: before.ok && after.ok, before, after };
  });
  return {
    schema_version: "1",
    tool: "house-conformance",
    profile: "migration:0.1-to-0.2",
    ok: records.length > 0 && records.every((record) => record.ok),
    records,
    summary: { records_checked: records.length, records_failed: records.filter((record) => !record.ok).length },
  };
}

export function runLifecycleConformance(path) {
  let fixture;
  try {
    fixture = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    return { schema_version: "1", tool: "house-conformance", profile: "lifecycle:0.2", ok: false, input_error: true, records: [], error: error.message };
  }
  if (!Array.isArray(fixture?.records)) {
    return { schema_version: "1", tool: "house-conformance", profile: "lifecycle:0.2", ok: false, input_error: true, records: [], error: "expected a lifecycle records fixture" };
  }
  const allowed = new Set(["life_state", "lifecycle_opportunity", "journal_entry", "dream_record", "handoff_record"]);
  const records = fixture.records.map((record, index) => {
    const result = allowed.has(record.kind)
      ? validateProtocol(record.kind, record.document, { profile: "0.2" })
      : { ok: false, schema_errors: [{ code: "E_PROTOCOL_KIND_UNKNOWN", message: `Unsupported lifecycle kind: ${record.kind}` }], semantic_errors: [] };
    return { index, kind: record.kind, ok: result.ok, result };
  });
  return {
    schema_version: "1",
    tool: "house-conformance",
    profile: "lifecycle:0.2",
    ok: records.length > 0 && records.every((record) => record.ok),
    records,
    summary: { records_checked: records.length, records_failed: records.filter((record) => !record.ok).length },
  };
}

export function formatConformanceReport(report) {
  const lines = [`house-conformance: ${report.ok ? "PASS" : "FAIL"}`, `Profile: ${report.profile}`];
  if (report.error) lines.push(`- ${report.error}`);
  for (const record of report.records || []) lines.push(`- ${record.kind}: ${record.ok ? "PASS" : "FAIL"}`);
  return lines.join("\n");
}
