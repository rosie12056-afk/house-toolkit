#!/usr/bin/env node
import { parseArgs, printPrivacyReport } from "../src/cli.mjs";
import { scanPrivacy } from "../src/privacy-scan.mjs";

const help = `house-privacy-scan [paths...] [options]

Options:
  --json                    Print JSON only
  --exclude <path>          Exclude a relative path; repeatable
  --deny-term-file <file>   Read private terms from a local file
  --english-only            Report Han text
  --allow-text-file <file>  Read exact allowed text from a local file
  --help                    Show help`;

try {
  const options = parseArgs(process.argv.slice(2), { privacy: true });
  if (options.help) {
    console.log(help);
  } else {
    const report = scanPrivacy(options.inputs.length ? options.inputs : ["."], options);
    printPrivacyReport(report, options.json);
    if (!report.ok) process.exitCode = 1;
  }
} catch (error) {
  console.error(`house-privacy-scan: ${error.message}`);
  process.exitCode = 2;
}
