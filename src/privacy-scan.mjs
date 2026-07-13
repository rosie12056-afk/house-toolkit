import { extname } from "node:path";
import { collectFiles, readLines, readTermFile } from "./files.mjs";

const textExtensions = new Set(["", ".cjs", ".css", ".html", ".js", ".json", ".jsx", ".md", ".mjs", ".sql", ".text", ".toml", ".ts", ".tsx", ".txt", ".xml", ".yaml", ".yml"]);
const forbiddenExtensions = new Set([".db", ".key", ".log", ".p12", ".pem", ".pfx", ".sqlite", ".sqlite3"]);
const maxTextBytes = 2 * 1024 * 1024;

const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu;

function containsNonGitEmail(line) {
  return [...line.matchAll(emailPattern)].some((match) => {
    const prefix = line.slice(0, match.index);
    return !(match[0].toLowerCase().startsWith("git@") && prefix.endsWith("://"));
  });
}

const checks = Object.freeze([
  { code: "P_EMAIL_ADDRESS", test: containsNonGitEmail },
  { code: "P_USER_HOME_PATH", regex: /(?:\/Users\/[A-Za-z0-9._-]+\/|\/(?:root|home)\/[A-Za-z0-9._-]+\/|[A-Z]:\\Users\\[A-Za-z0-9._-]+\\)/u },
  { code: "P_PRIVATE_IPV4", regex: /\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b/u },
  { code: "P_INTERNAL_HOSTNAME", regex: /\b[A-Za-z0-9.-]+\.(?:internal|lan|local)\b/iu },
  { code: "P_PRIVATE_KEY", regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u },
  { code: "P_COMMON_TOKEN", regex: /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,}|xox[baprs]-[A-Za-z0-9-]{20,})\b/u },
  { code: "P_BEARER_TOKEN", regex: /\bAuthorization\s*:\s*Bearer\s+[A-Za-z0-9._~-]{16,}/iu },
  { code: "P_CREDENTIAL_ASSIGNMENT", regex: /\b(?:api[_-]?key|access[_-]?token|auth[_-]?token|cookie|password|secret)\b\s*[:=]\s*["'][^"']{12,}["']/iu },
  { code: "P_PRIVATE_PROMPT", regex: /\b(?:private|system)[_-]?prompt\b\s*[:=]/iu },
]);

function isEnvironmentFile(file) {
  return /(?:^|\/)\.env(?:\.|$)/u.test(file);
}

function stripAllowedText(line, allowedText) {
  return allowedText.reduce((value, text) => value.split(text).join(""), line);
}

export function scanPrivacy(inputs = ["."], options = {}) {
  const cwd = options.cwd || process.cwd();
  const excludes = [".git", "node_modules", ...(options.excludes || [])];
  const denyTerms = [
    ...(options.denyTerms || []),
    ...(options.denyTermFile ? readTermFile(options.denyTermFile) : []),
  ];
  const allowedText = [
    ...(options.allowedText || []),
    ...(options.allowTextFile ? readTermFile(options.allowTextFile) : []),
  ];
  const files = collectFiles(inputs, { cwd, excludes });
  const findings = [];
  let filesChecked = 0;

  for (const item of files) {
    const extension = extname(item.path).toLowerCase();
    if (forbiddenExtensions.has(extension) || isEnvironmentFile(item.file)) {
      findings.push({ file: item.file, line: 0, code: "P_FORBIDDEN_FILE_TYPE" });
      continue;
    }
    if (!textExtensions.has(extension) || item.size > maxTextBytes) continue;
    filesChecked += 1;

    const lines = readLines(item.path);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      for (const check of checks) {
        if (check.test ? check.test(line) : check.regex.test(line)) findings.push({ file: item.file, line: index + 1, code: check.code });
        if (check.regex) check.regex.lastIndex = 0;
      }
      for (const term of denyTerms) {
        if (line.toLocaleLowerCase("en-US").includes(term.toLocaleLowerCase("en-US"))) {
          findings.push({ file: item.file, line: index + 1, code: "P_DENY_TERM" });
        }
      }
      if (options.englishOnly && /\p{Script=Han}/u.test(stripAllowedText(line, allowedText))) {
        findings.push({ file: item.file, line: index + 1, code: "P_NON_ENGLISH_PUBLIC_TEXT" });
      }
    }
  }

  const deduplicated = [...new Map(findings.map((finding) => [`${finding.file}:${finding.line}:${finding.code}`, finding])).values()]
    .sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.code.localeCompare(b.code));

  return {
    schema_version: "1",
    tool: "house-privacy-scan",
    ok: deduplicated.length === 0,
    files_checked: filesChecked,
    findings: deduplicated,
  };
}
