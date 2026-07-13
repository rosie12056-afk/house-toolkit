#!/usr/bin/env node
import { parseArgs } from "../src/cli.mjs";
import { formatConformanceReport, runMigrationConformance } from "../src/conformance.mjs";

const help = `house-conformance migration <fixture.json> [--json]

Validates retained v0.1 records and their explicit v0.2 migrations.`;

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) console.log(help);
  else if (options.inputs[0] !== "migration" || options.inputs.length !== 2) throw new Error("expected: migration <fixture.json>");
  else {
    const report = runMigrationConformance(options.inputs[1]);
    console.log(options.json ? JSON.stringify(report, null, 2) : formatConformanceReport(report));
    if (report.input_error) process.exitCode = 2;
    else if (!report.ok) process.exitCode = 1;
  }
} catch (error) {
  console.error(`house-conformance: ${error.message}`);
  process.exitCode = 2;
}
