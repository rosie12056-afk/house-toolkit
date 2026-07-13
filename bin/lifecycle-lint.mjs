#!/usr/bin/env node
import { parseArgs } from "../src/cli.mjs";
import { formatProtocolReport, formatSarifReport, lintProtocol } from "../src/protocol-lint.mjs";

const allowed = new Set(["life_state", "lifecycle_opportunity", "journal_entry", "dream_record", "handoff_record"]);
const help = `house-lifecycle-lint <kind> <file-or-directory> [...] [--json|--sarif]

Kinds: life_state, lifecycle_opportunity, journal_entry, dream_record, handoff_record.`;

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) console.log(help);
  else {
    const [kind, ...inputs] = options.inputs;
    if (!allowed.has(kind) || !inputs.length) throw new Error("expected a lifecycle kind and at least one JSON file or directory");
    const report = lintProtocol(kind, inputs, { profile: "0.2" });
    if (!report.summary.files_checked) throw new Error("no JSON files were found");
    if (options.sarif) console.log(JSON.stringify(formatSarifReport(report), null, 2));
    else console.log(options.json ? JSON.stringify(report, null, 2) : formatProtocolReport(report));
    if (report.summary.input_errors) process.exitCode = 2;
    else if (!report.ok) process.exitCode = 1;
  }
} catch (error) {
  console.error(`house-lifecycle-lint: ${error.message}`);
  process.exitCode = 2;
}
