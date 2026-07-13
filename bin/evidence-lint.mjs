#!/usr/bin/env node
import { parseArgs } from "../src/cli.mjs";
import { formatProtocolReport, formatSarifReport, lintProtocol } from "../src/protocol-lint.mjs";

const help = `house-evidence-lint <file-or-directory> [...] [--profile 0.1|0.2] [--json|--sarif]

Validates House Protocols Evidence Bundles in an explicit or document-selected profile.`;

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) console.log(help);
  else if (!options.inputs.length) throw new Error("at least one JSON file or directory is required");
  else {
    const report = lintProtocol("evidence", options.inputs, { profile: options.profile });
    if (!report.summary.files_checked) throw new Error("no JSON files were found");
    if (options.sarif) console.log(JSON.stringify(formatSarifReport(report), null, 2));
    else console.log(options.json ? JSON.stringify(report, null, 2) : formatProtocolReport(report));
    if (report.summary.input_errors) process.exitCode = 2;
    else if (!report.ok) process.exitCode = 1;
  }
} catch (error) {
  console.error(`house-evidence-lint: ${error.message}`);
  process.exitCode = 2;
}
