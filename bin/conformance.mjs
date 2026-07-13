#!/usr/bin/env node
import { parseArgs } from "../src/cli.mjs";
import { formatConformanceReport, runLifecycleConformance, runMigrationConformance } from "../src/conformance.mjs";

const help = `house-conformance migration|lifecycle <fixture.json> [--json]

Validates migration or lifecycle fixture sets.`;

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) console.log(help);
  else if (!new Set(["migration", "lifecycle"]).has(options.inputs[0]) || options.inputs.length !== 2) throw new Error("expected: migration|lifecycle <fixture.json>");
  else {
    const report = options.inputs[0] === "migration" ? runMigrationConformance(options.inputs[1]) : runLifecycleConformance(options.inputs[1]);
    console.log(options.json ? JSON.stringify(report, null, 2) : formatConformanceReport(report));
    if (report.input_error) process.exitCode = 2;
    else if (!report.ok) process.exitCode = 1;
  }
} catch (error) {
  console.error(`house-conformance: ${error.message}`);
  process.exitCode = 2;
}
