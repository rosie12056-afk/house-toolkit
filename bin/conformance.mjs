#!/usr/bin/env node
import { parseArgs } from "../src/cli.mjs";
import { formatConformanceReport, runLifecycleConformance, runMigrationConformance, runRuntimeApiConformance } from "../src/conformance.mjs";

const help = `house-conformance migration|lifecycle|runtime-api <fixture.json> [--json]

Validates migration, lifecycle, or Runtime API fixture sets.`;

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) console.log(help);
  else if (!new Set(["migration", "lifecycle", "runtime-api"]).has(options.inputs[0]) || options.inputs.length !== 2) throw new Error("expected: migration|lifecycle|runtime-api <fixture.json>");
  else {
    const report = options.inputs[0] === "migration"
      ? runMigrationConformance(options.inputs[1])
      : options.inputs[0] === "lifecycle" ? runLifecycleConformance(options.inputs[1]) : runRuntimeApiConformance(options.inputs[1]);
    console.log(options.json ? JSON.stringify(report, null, 2) : formatConformanceReport(report));
    if (report.input_error) process.exitCode = 2;
    else if (!report.ok) process.exitCode = 1;
  }
} catch (error) {
  console.error(`house-conformance: ${error.message}`);
  process.exitCode = 2;
}
