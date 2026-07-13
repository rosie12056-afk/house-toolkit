import { readFileSync } from "node:fs";
import { extname } from "node:path";
import { validateProtocol } from "house-protocols";
import { collectFiles } from "./files.mjs";

export function lintProtocol(kind, inputs, options = {}) {
  const cwd = options.cwd || process.cwd();
  const files = collectFiles(inputs, { cwd, excludes: options.excludes || [], extensions: new Set([".json"]) });
  const reports = [];

  for (const item of files) {
    let document;
    try {
      document = JSON.parse(readFileSync(item.path, "utf8"));
    } catch (error) {
      reports.push({
        file: item.file,
        ok: false,
        input_error: true,
        schema_errors: [{ keyword: "parse", instancePath: "", message: error.message }],
        semantic_errors: [],
      });
      continue;
    }
    const result = validateProtocol(kind, document, options.profile ? { profile: options.profile } : undefined);
    reports.push({ file: item.file, ...result });
  }

  return {
    schema_version: "1",
    tool: `house-${kind.replaceAll("_", "-")}-lint`,
    protocol_kind: kind,
    profile: options.profile || "document",
    ok: reports.length > 0 && reports.every((report) => report.ok),
    files: reports,
    summary: {
      files_checked: reports.length,
      files_failed: reports.filter((report) => !report.ok).length,
      input_errors: reports.filter((report) => report.input_error).length,
    },
  };
}

export function formatSarifReport(report) {
  const results = [];
  for (const file of report.files) {
    for (const finding of [...file.schema_errors, ...file.semantic_errors]) {
      results.push({
        ruleId: finding.code || `E_SCHEMA_${String(finding.keyword || "INVALID").toUpperCase()}`,
        level: "error",
        message: { text: finding.message || "Protocol validation failed." },
        locations: [{ physicalLocation: { artifactLocation: { uri: file.file } } }],
        properties: { path: finding.path || finding.instancePath || "/" },
      });
    }
  }
  return {
    version: "2.1.0",
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    runs: [{ tool: { driver: { name: report.tool, rules: [] } }, results }],
  };
}

export function formatProtocolReport(report) {
  const lines = [`${report.tool}: ${report.ok ? "PASS" : "FAIL"}`];
  for (const file of report.files) {
    lines.push(`- ${file.file}: ${file.ok ? "PASS" : "FAIL"}`);
    for (const error of file.schema_errors) lines.push(`  schema ${error.instancePath || "/"}: ${error.message}`);
    for (const error of file.semantic_errors) lines.push(`  ${error.code} ${error.path}: ${error.message}`);
  }
  return lines.join("\n");
}
