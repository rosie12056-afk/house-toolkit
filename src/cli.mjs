import { readTermFile } from "./files.mjs";

export function parseArgs(argv, { privacy = false } = {}) {
  const options = { inputs: [], excludes: [], json: false, help: false, englishOnly: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") options.json = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else if (privacy && arg === "--english-only") options.englishOnly = true;
    else if (privacy && arg === "--exclude") options.excludes.push(requireValue(argv, ++index, arg));
    else if (privacy && arg === "--deny-term-file") options.denyTermFile = requireValue(argv, ++index, arg);
    else if (privacy && arg === "--allow-text-file") options.allowTextFile = requireValue(argv, ++index, arg);
    else if (arg.startsWith("-")) throw new Error(`Unknown option: ${arg}`);
    else options.inputs.push(arg);
  }
  return options;
}

function requireValue(argv, index, option) {
  const value = argv[index];
  if (!value || value.startsWith("-")) throw new Error(`${option} requires a value`);
  return value;
}

export function printPrivacyReport(report, json) {
  if (json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }
  console.log(`house-privacy-scan: ${report.ok ? "PASS" : "FAIL"}`);
  console.log(`Files checked: ${report.files_checked}`);
  for (const finding of report.findings) console.log(`- ${finding.file}:${finding.line} ${finding.code}`);
}

export function resolveAllowedText(options) {
  return options.allowTextFile ? readTermFile(options.allowTextFile) : [];
}
